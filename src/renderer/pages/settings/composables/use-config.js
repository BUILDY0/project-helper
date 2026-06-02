import { ref } from 'vue'

/**
 * 配置加载 / 保存 / 未保存检测
 *
 * 与父组件契约：返回 hasChanges / save / discard 三个方法供 App.vue 在 tab 切换时拦截判断。
 *
 * @param {{
 *   toastRef: import('vue').Ref,
 *   minLoadingMs?: number
 * }} options
 */
export function useConfig({ toastRef, minLoadingMs = 1000 }) {
  const config = ref({
    config_path: '',
    paths: [],
    depth: 1,
    exclude_paths: [],
    pinned: [],
    auto_run_startup: false,
    auto_check_update: true,
    tray: true,
    // 配置文件最后修改时间（ms 时间戳），0 表示未知
    mtime: 0
  })
  const saving = ref(false)

  // 加载/保存成功时记录基线，用于判断是否存在未保存的修改
  let originalSnapshot = ''

  /** 仅取会持久化的字段做稳定序列化，避免字段顺序差异 */
  function snapshot(c) {
    return JSON.stringify({
      paths: [...(c.paths || [])],
      depth: Number(c.depth) || 0,
      exclude_paths: [...(c.exclude_paths || [])],
      pinned: [...(c.pinned || [])],
      auto_run_startup: !!c.auto_run_startup,
      auto_check_update: !!c.auto_check_update,
      tray: !!c.tray
    })
  }

  /** 从 originalSnapshot 中解析 auto_run_startup 基线值 */
  function originalSnapshotAutoRun() {
    try {
      return !!JSON.parse(originalSnapshot || '{}').auto_run_startup
    } catch {
      return false
    }
  }

  /** 是否有未保存的修改：与基线快照对比 */
  function hasChanges() {
    return snapshot(config.value) !== originalSnapshot
  }

  /** 加载配置 */
  async function loadConfig() {
    const cfg = await window.api.readConfig()
    config.value = {
      config_path: cfg.config_path || '',
      paths: Array.isArray(cfg.paths) ? cfg.paths : [],
      depth: typeof cfg.depth === 'number' ? cfg.depth : 1,
      exclude_paths: Array.isArray(cfg.exclude_paths) ? cfg.exclude_paths : [],
      pinned: Array.isArray(cfg.pinned) ? cfg.pinned : [],
      auto_run_startup: !!cfg.auto_run_startup,
      auto_check_update: typeof cfg.auto_check_update === 'boolean' ? cfg.auto_check_update : true,
      tray: typeof cfg.tray === 'boolean' ? cfg.tray : true,
      mtime: typeof cfg.mtime === 'number' ? cfg.mtime : 0
    }
    // 更新基线快照
    originalSnapshot = snapshot(config.value)
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  /** 保存配置 */
  async function onSave() {
    saving.value = true
    const start = Date.now()
    try {
      // 通过 JSON 序列化剥离 Vue 的 Proxy，避免 IPC structured clone 失败
      const payload = JSON.parse(
        JSON.stringify({
          paths: config.value.paths,
          depth: Number(config.value.depth) || 0,
          exclude_paths: config.value.exclude_paths,
          pinned: config.value.pinned,
          theme: config.value.theme,
          auto_run_startup: !!config.value.auto_run_startup,
          auto_check_update: !!config.value.auto_check_update,
          tray: !!config.value.tray
        })
      )
      const prevAutoRun = originalSnapshotAutoRun()
      const result = await window.api.saveConfig(payload)
      // 落盘成功后重新拉取以刷新最后修改时间
      await loadConfig()

      // 切换了开关但系统层未生效（dev 等）时，附加说明避免用户误以为已生效
      const autoRunChanged =
        typeof payload.auto_run_startup === 'boolean' && payload.auto_run_startup !== prevAutoRun
      const sysApplied = result?.autoRun?.appliedToSystem !== false
      if (autoRunChanged && !sysApplied) {
        const reason = result?.autoRun?.reason
        const msg =
          reason === 'dev'
            ? '配置已保存（开发模式下"开机自动运行"不会写入系统）'
            : '配置已保存（开机自动运行未能写入系统，请检查系统权限）'
        toastRef.value?.show(msg, 'info')
      } else {
        toastRef.value?.show('配置已保存', 'success')
      }
    } catch (err) {
      toastRef.value?.show(`保存失败：${err.message}`, 'error')
    } finally {
      const remain = minLoadingMs - (Date.now() - start)
      if (remain > 0) await sleep(remain)
      saving.value = false
    }
  }

  return {
    config,
    saving,
    loadConfig,
    onSave,
    hasChanges,
    /** 放弃未保存的修改，重新从磁盘加载（暴露给父组件用） */
    discard: loadConfig
  }
}
