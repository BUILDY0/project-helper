import { ref } from 'vue'
import { DEFAULT_VIEW, normalizeViewType } from '@shared/view.js'

/**
 * 项目视图（平铺 / 分类）状态管理：读取 config.view[side]，切换时即时写盘。
 *
 * 与主题一致，视图切换独立走 config:save-view 落盘，避免与配置页未保存逻辑冲突。
 *
 * @param {{ side: 'local' | 'remote' }} options
 */
export function useProjectView({ side }) {
  const view = ref(DEFAULT_VIEW)

  async function loadView() {
    try {
      const cfg = await window.api.readConfig()
      view.value = normalizeViewType(cfg.view?.[side])
    } catch {
      view.value = DEFAULT_VIEW
    }
  }

  /** 切换视图：立即生效 + 持久化；同值短路 */
  async function setView(next) {
    const v = normalizeViewType(next)
    if (v === view.value) return
    view.value = v
    try {
      await window.api.saveView?.(side, v)
    } catch (err) {
      // 写盘失败不回滚 UI：下次启动会回到上次成功保存的值
      // eslint-disable-next-line no-console
      console.error('[view] 保存视图失败:', err?.message || err)
    }
  }

  return { view, loadView, setView }
}
