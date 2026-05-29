/**
 * 路径类型定义（双端共享）
 *
 * 主进程与渲染进程都消费这一份文件，加载约定见 `src/shared/README.md`。
 * 仅放纯类型 / 常量 / 同步纯函数；禁止引入 fs/path/electron 等运行环境相关 API。
 */

/** 路径来源类型枚举 —— 用作 BasePath.type 的合法取值集合 */
export const PathType = Object.freeze({
  DEFAULT: 'DEFAULT',
  SYSTEM: 'SYSTEM',
  SSH: 'SSH',
  WSL: 'WSL',
  DEV_CONTAINER: 'DEV_CONTAINER',
  REMOTE_REPO: 'REMOTE_REPO'
})

/** 把任意输入夹紧到合法的路径类型枚举；非法/缺省回落 DEFAULT */
export function normalizePathType(v) {
  return Object.values(PathType).includes(v) ? v : PathType.DEFAULT
}

/**
 * 路径基类：
 * - path 必须为非空字符串（已 trim）
 * - type 限定为 PathType 枚举成员
 * - cfg 始终为普通对象（数组、null、原始值都会被规范为 {}）
 */
export class BasePath {
  constructor({ path: rawPath = '', type = PathType.DEFAULT, cfg = {} } = {}) {
    const normalizedPath = BasePath.normalizePath(rawPath)
    if (!normalizedPath) throw new Error('path 不能为空')

    this.path = normalizedPath
    this.type = normalizePathType(type)
    this.cfg = BasePath.normalizeCfg(cfg)
  }

  static normalizePath(rawPath) {
    return typeof rawPath === 'string' ? rawPath.trim() : ''
  }

  static normalizeCfg(cfg) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return {}
    return { ...cfg }
  }
}

export class DefaultPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    super({ path, type: PathType.DEFAULT, cfg })
  }
}

export class SystemPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    const safeCfg = BasePath.normalizeCfg(cfg)
    super({
      path,
      type: PathType.SYSTEM,
      cfg: {
        ...safeCfg,
        // 扫描时强制命中该目录，即使目录本身不含 .git/package.json
        forced: safeCfg.forced === true
      }
    })
  }
}

export class SshPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    super({ path, type: PathType.SSH, cfg })
  }
}

export class WslPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    super({ path, type: PathType.WSL, cfg })
  }
}

export class DevContainerPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    super({ path, type: PathType.DEV_CONTAINER, cfg })
  }
}

export class RemoteRepoPath extends BasePath {
  constructor({ path = '', cfg = {} } = {}) {
    super({ path, type: PathType.REMOTE_REPO, cfg })
  }
}

/** 把旧版字符串路径或新版路径对象归一化为 BasePath 派生实例；非法返回 null */
export function normalizePathItem(item) {
  try {
    if (typeof item === 'string') return new SystemPath({ path: item })
    if (!item || typeof item !== 'object') return null

    const type = item.type === undefined ? PathType.DEFAULT : normalizePathType(item.type)
    const pathValue = item.path
    const cfg = item.cfg

    switch (type) {
      case PathType.SYSTEM:
        return new SystemPath({ path: pathValue, cfg })
      case PathType.SSH:
        return new SshPath({ path: pathValue, cfg })
      case PathType.WSL:
        return new WslPath({ path: pathValue, cfg })
      case PathType.DEV_CONTAINER:
        return new DevContainerPath({ path: pathValue, cfg })
      case PathType.REMOTE_REPO:
        return new RemoteRepoPath({ path: pathValue, cfg })
      case PathType.DEFAULT:
      default:
        return new DefaultPath({ path: pathValue, cfg })
    }
  } catch {
    return null
  }
}

/** 归一化 paths 数组，过滤无效项 */
export function normalizePaths(paths) {
  if (!Array.isArray(paths)) return []
  return paths.map(normalizePathItem).filter(Boolean)
}
