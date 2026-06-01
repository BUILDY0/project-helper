const { ipcMain } = require('electron')
const path = require('node:path')
const fsp = require('node:fs/promises')

const { cleanupInvalidPaths } = require('./config-store')

// ==================== 项目扫描 ====================
/**
 * 判定文件夹是否为一个项目：包含 .git 目录或 package.json 文件
 */
async function isProject(dir) {
  try {
    const [gitStat, pkgStat] = await Promise.allSettled([
      fsp.stat(path.join(dir, '.git')),
      fsp.stat(path.join(dir, 'package.json'))
    ])
    const hasGit = gitStat.status === 'fulfilled' && gitStat.value.isDirectory()
    const hasPkg = pkgStat.status === 'fulfilled' && pkgStat.value.isFile()
    return hasGit || hasPkg
  } catch {
    return false
  }
}

/**
 * 在目录下查找 README 文件（大小写不敏感），返回首个匹配的绝对路径；找不到返回 null
 * 仅匹配文件名为 readme.md 的项，避免把 README.txt / README 之类纳入
 */
async function findReadmeFile(dir) {
  let entries = []
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue
    if (ent.name.toLowerCase() === 'readme.md') {
      return path.join(dir, ent.name)
    }
  }
  return null
}

/**
 * 读取 README 文件前三个非空行作为描述：各自去除 markdown 标题前缀（# / ## ...）后用换行拼接
 * 非空行超过三行时另起一行追加省略号，提示内容被截断
 * 换行拼接是为了配合卡片 tooltip 的 markdown 渲染分行展示；卡片正文在 white-space:normal 下会折叠为空格
 * 读取失败或为空返回空串
 */
async function readReadmeFirstLines(readmePath) {
  try {
    const text = await fsp.readFile(readmePath, 'utf-8')
    const picked = []
    let hasMore = false
    for (const raw of text.split(/\r?\n/)) {
      // 去掉 BOM、markdown 标题前缀（# 号及其后空白）与首尾空白后判空，跳过空内容行
      const line = raw
        .replace(/^\uFEFF/, '')
        .replace(/^#+\s*/, '')
        .trim()
      if (!line) continue
      // 已取满三行又遇到非空行，说明后面还有内容，标记后停止
      if (picked.length === 3) {
        hasMore = true
        break
      }
      picked.push(line)
    }
    if (picked.length === 0) return ''
    // 省略号单独成行，提示后面还有内容
    return picked.join('\n') + (hasMore ? '\n…' : '')
  } catch {
    return ''
  }
}

/**
 * 把 git remote url 标准化为可在浏览器打开的 https 形式：
 * - https://github.com/u/r.git           -> https://github.com/u/r
 * - git@github.com:u/r.git               -> https://github.com/u/r
 * - ssh://git@github.com/u/r.git         -> https://github.com/u/r
 * - github:u/r（package.json 简写）       -> https://github.com/u/r
 * 非 GitHub host 也按通用规则转换（gitlab 等同样适用）。
 */
function normalizeGitUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim()
  if (!s) return ''
  // package.json 简写："github:user/repo" / "user/repo"
  const shorthand = s.match(/^(?:github:)?([\w.-]+\/[\w.-]+)$/i)
  if (shorthand) return `https://github.com/${shorthand[1].replace(/\.git$/, '')}`
  // git@host:user/repo(.git)
  const ssh = s.match(/^git@([^:]+):(.+?)(?:\.git)?$/i)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`
  // ssh://git@host/user/repo(.git)
  s = s.replace(/^ssh:\/\/git@/i, 'https://')
  s = s.replace(/^git\+/i, '')
  s = s.replace(/\.git$/i, '')
  if (!/^https?:\/\//i.test(s)) return ''
  return s
}

/** 从 .git/config 读取 origin 的 url；找不到返回空 */
async function readGitConfigUrl(dir) {
  try {
    const text = await fsp.readFile(path.join(dir, '.git', 'config'), 'utf-8')
    // 简易解析：找到 [remote "origin"] 段内的 url 行
    const m = text.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/i)
    return m ? m[1] : ''
  } catch {
    return ''
  }
}

/**
 * 读取项目的展示信息：
 * - name：文件夹名
 * - description：根目录 readme.md 前三行（大小写兼容） > 空串
 * - gitUrl：.git/config origin > package.json.repository（含简写），归一为 https 链接
 * - hasPackageJson：是否存在 package.json（用于卡片展示 Node.js 状态图标）
 */
async function readProjectMeta(dir) {
  const folderName = path.basename(dir)
  const pkgPath = path.join(dir, 'package.json')

  // 三处 IO 互不依赖，并行执行：
  // - 读 package.json 文本（仅取 repository 与是否存在）
  // - 查找 readme.md（大小写不敏感）
  // - 读 .git/config 的 origin url
  const [pkgRead, readmePath, gitConfigUrl] = await Promise.all([
    fsp.readFile(pkgPath, 'utf-8').then(
      (text) => ({ ok: true, text }),
      () => ({ ok: false, text: '' })
    ),
    findReadmeFile(dir),
    readGitConfigUrl(dir)
  ])

  let pkgRepoUrl = ''
  let hasPackageJson = false
  if (pkgRead.ok) {
    try {
      const pkg = JSON.parse(pkgRead.text)
      hasPackageJson = true
      // repository 可能是 string 或 { url: '...' }
      const repo = pkg.repository
      if (typeof repo === 'string') pkgRepoUrl = repo
      else if (repo && typeof repo.url === 'string') pkgRepoUrl = repo.url
    } catch {
      // package.json 解析失败：相关字段维持空，统一走下面的回退逻辑
    }
  }

  // description 仅来自根目录 README 前两行；readmePath 同时作为卡片"是否有 README"状态
  const description = readmePath ? await readReadmeFirstLines(readmePath) : ''

  // gitUrl：.git/config 优先（更准；本地未推送也能拿到实际 origin），其次 package.json.repository
  const rawGit = gitConfigUrl || pkgRepoUrl
  const gitUrl = normalizeGitUrl(rawGit)

  return {
    name: folderName,
    description,
    gitUrl,
    hasPackageJson,
    readmePath: readmePath || ''
  }
}

/** 路径标准化用于 exclude 匹配 */
function normalize(p) {
  return path.resolve(p).toLowerCase()
}

/**
 * 广度优先扫描：从 roots 出发，depth 为搜索边界，命中 exclude 则跳过
 * depth 语义：paths=[{ path: "a" }], depth=1 => 扫描 a/、a/aa/、a/bb/，不进入 a/aa/aaa
 * 即从 root 出发最多向下走 depth 层
 *
 * 实现：按层并行（同层节点的 IO 用 Promise.all 并行处理），
 * 总耗时由 O(节点数) 降为 O(层数 × 单层最慢分支)。
 */
async function scanProjects(roots, depth, excludes) {
  const excludeSet = new Set((excludes || []).map(normalize))
  const visited = new Set()
  const projects = []

  // 收集本层有效起点：去重 + 校验为目录
  let frontier = []
  for (const r of roots || []) {
    const rootPath = typeof r === 'string' ? r : r?.path
    if (!rootPath) continue
    try {
      const stat = await fsp.stat(rootPath)
      if (stat.isDirectory()) {
        frontier.push({
          dir: path.resolve(rootPath),
          level: 0,
          forced: r?.cfg?.forced === true
        })
      }
    } catch {
      // 路径不存在，跳过
    }
  }

  /**
   * 处理单个节点：判定是否项目（命中则收录），并返回下钻后的子节点列表
   * 命中 visited / exclude 时不收录、不下钻
   */
  async function processNode({ dir, level, forced = false }) {
    const key = normalize(dir)
    if (visited.has(key)) return []
    visited.add(key)
    if (excludeSet.has(key)) return []

    // 当前层若是项目则收录，但不影响下钻：monorepo 场景外层项目里可能还有子项目
    if (forced || (await isProject(dir))) {
      const meta = await readProjectMeta(dir)
      projects.push({ path: dir, ...meta })
    }

    // 已到深度边界，无需下钻
    if (level >= depth) return []

    let entries = []
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const next = []
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      // 跳过隐藏目录与 node_modules：内含成百上千伪项目，扫描成本与噪音都不可接受
      if (ent.name.startsWith('.')) continue
      if (ent.name === 'node_modules') continue
      next.push({ dir: path.join(dir, ent.name), level: level + 1, forced: false })
    }
    return next
  }

  // 按层迭代：同层节点并行处理，所有节点完成后再进入下一层
  while (frontier.length > 0) {
    const childrenLists = await Promise.all(frontier.map(processNode))
    frontier = childrenLists.flat()
  }

  return projects
}

/** 注册项目扫描相关的 IPC */
function registerScannerIpc() {
  ipcMain.handle('projects:scan', async () => {
    // 扫描前清理配置中所有路径字段（paths / exclude_paths / pinned）里已失效的项，
    // 有变化会自动落盘；返回清理后的配置快照
    const cfg = await cleanupInvalidPaths()
    const pinnedSet = new Set(cfg.pinned.map((p) => path.resolve(p)))

    const list = await scanProjects(cfg.paths, cfg.depth, cfg.exclude_paths)
    // 标记每个项目的 pinned 状态
    for (const p of list) p.pinned = pinnedSet.has(path.resolve(p.path))
    // pinned 优先，其次按名称
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return list
  })
}

module.exports = {
  registerScannerIpc
}
