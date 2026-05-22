import { ref } from 'vue'

/**
 * 全局可用 IDE 列表（模块级单例，整个 app 生命周期共享一份缓存）
 *
 * 数据来源：主进程在 app.whenReady 后一次性探测 SUPPORTED_IDES 中每个 IDE 的 CLI 是否可用，
 * 结果缓存在主进程的 detectedIdes，渲染层通过 ide:get-available 读取该缓存，避免每次右键
 * 菜单都触发 exec。
 *
 * 列表顺序与主进程 SUPPORTED_IDES 一致（VS Code → CodeBuddy → WebStorm → IDEA → Cursor → Trae），
 * 过滤掉 available=false 的项。
 */
const availableIdes = ref([])

// 用 Promise 标记是否已发起初始化；多个组件同时挂载时复用同一次请求
let initPromise = null

/**
 * 首次拉取：
 * 1. 先读主进程已缓存结果（ide:get-available），命中即用，零等待。
 * 2. 缓存为空说明主进程仍在探测（IDE CLI 冷启动可能耗时数秒），主动调用
 *    ide:detect 让主进程把当前那次探测 await 完再返回，避免渲染层做重试 / 轮询。
 *    主进程的 detectIdesOnce 内部会覆盖同一个 detectedIdes 变量，多次并发调用语义安全。
 */
async function fetchOnce() {
  try {
    const cached = (await window.api.getAvailableIdes()) || []
    if (cached.length > 0) {
      availableIdes.value = cached.filter((x) => x.available)
      return
    }
    // 缓存空：等主进程把当前探测做完再拿结果
    const fresh = (await window.api.detectIdes()) || []
    availableIdes.value = fresh.filter((x) => x.available)
  } catch {
    // 任一步骤失败都退化为空数组：右键菜单不出现 IDE 项，双击降级走 vscode 兜底
    availableIdes.value = []
  }
}

/**
 * Composable：返回全局 availableIdes 引用与刷新方法
 * - 首次调用时触发一次拉取；后续调用复用同一份响应式引用
 * - refresh 用于用户主动触发重新探测（例如安装了新 IDE 后），会强制主进程重测
 */
export function useIdes() {
  if (!initPromise) {
    initPromise = fetchOnce()
  }
  /** 强制重新探测：调用主进程 detectIdes，更新主进程缓存与本地引用 */
  async function refresh() {
    try {
      const list = (await window.api.detectIdes()) || []
      availableIdes.value = list.filter((x) => x.available)
    } catch {
      availableIdes.value = []
    }
  }
  return { availableIdes, refresh }
}
