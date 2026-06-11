import { normalizeJSONObject } from '@shared/data'
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
  const configLoaded = ref(false)
  const config = ref({
    config_path: '',
    installer_path: '',
    paths: [],
    depth: 1,
    exclude_paths: [],
    pinned: [],
    remote: { paths: [], pinned: [] },
    auto_run_startup: false,
    auto_check_update: true,
    tray: true,
    auto_clear_installer: false,
    ide_cfg: { default: '', exclude: [], extends: [] },
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
      remote: {
        paths: [...(c.remote?.paths || [])],
        pinned: [...(c.remote?.pinned || [])]
      },
      auto_run_startup: !!c.auto_run_startup,
      auto_check_update: !!c.auto_check_update,
      tray: !!c.tray,
      auto_clear_installer: !!c.auto_clear_installer,
      ide_cfg: c.ide_cfg ?? { default: '', exclude: [], extends: [] }
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
    const [cfg, installerDir] = await Promise.all([
      window.api.readConfig(),
      window.api.getInstallerDir().catch(() => '')
    ])
    config.value = {
      config_path: cfg.config_path || '',
      installer_path: installerDir || '',
      paths: Array.isArray(cfg.paths) ? cfg.paths : [],
      depth: typeof cfg.depth === 'number' ? cfg.depth : 1,
      exclude_paths: Array.isArray(cfg.exclude_paths) ? cfg.exclude_paths : [],
      pinned: Array.isArray(cfg.pinned) ? cfg.pinned : [],
      remote: {
        paths: Array.isArray(cfg.remote?.paths) ? cfg.remote.paths : [],
        pinned: Array.isArray(cfg.remote?.pinned) ? cfg.remote.pinned : []
      },
      auto_run_startup: !!cfg.auto_run_startup,
      auto_check_update: typeof cfg.auto_check_update === 'boolean' ? cfg.auto_check_update : true,
      tray: typeof cfg.tray === 'boolean' ? cfg.tray : true,
      auto_clear_installer: !!cfg.auto_clear_installer,
      ide_cfg: {
        default: cfg.ide_cfg?.default ?? '',
        exclude: Array.isArray(cfg.ide_cfg?.exclude) ? cfg.ide_cfg.exclude : [],
        extends: Array.isArray(cfg.ide_cfg?.extends) ? cfg.ide_cfg.extends : []
      },
      mtime: typeof cfg.mtime === 'number' ? cfg.mtime : 0
    }
    // 更新基线快照
    originalSnapshot = snapshot(config.value)
    configLoaded.value = true
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  /** 保存配置 */
  async function onSave() {
    saving.value = true
    const start = Date.now()
    try {
      const c = config.value

      const payload = normalizeJSONObject({
        paths: c.paths,
        depth: Number(c.depth) || 0,
        exclude_paths: c.exclude_paths,
        pinned: c.pinned,
        remote: {
          paths: Array.isArray(c.remote?.paths) ? c.remote.paths : [],
          pinned: Array.isArray(c.remote?.pinned) ? c.remote.pinned : []
        },
        theme: c.theme,
        auto_run_startup: !!c.auto_run_startup,
        auto_check_update: !!c.auto_check_update,
        tray: !!c.tray,
        auto_clear_installer: !!c.auto_clear_installer,
        ide_cfg: {
          default: c.ide_cfg?.default ?? '',
          exclude: Array.isArray(c.ide_cfg?.exclude) ? c.ide_cfg.exclude : [],
          extends: Array.isArray(c.ide_cfg?.extends) ? c.ide_cfg.extends : []
        }
      })

      const prevAutoRun = originalSnapshotAutoRun()
      const result = await window.api.saveConfig(payload)
      await loadConfig()

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
    configLoaded,
    saving,
    loadConfig,
    onSave,
    hasChanges,
    /** 放弃未保存的修改，重新从磁盘加载（暴露给父组件用） */
    discard: loadConfig
  }
}
