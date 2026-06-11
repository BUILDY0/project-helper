import { normalizePathItem } from '@shared/path-types.js'

/** 将远程路径对象转为显示文字：path[::alias?] */
function remotePathDisplay(item) {
  const normalized = normalizePathItem(item)
  if (!normalized) return ''
  const alias = normalized.cfg?.alias
  return alias ? `${normalized.path}::${alias}` : normalized.path
}

export function useRemotePaths({ config, toastRef }) {
  function removePath(i) {
    config.value.remote.paths.splice(i, 1)
  }

  function clearAll() {
    if (!config.value.remote?.paths?.length) return
    config.value.remote.paths = []
  }

  function removePinned(i) {
    config.value.remote.pinned.splice(i, 1)
  }

  function clearPinned() {
    if (!config.value.remote?.pinned?.length) return
    config.value.remote.pinned = []
  }

  /** 新增远程项目：将 BasePath 对象 push 到 remote.paths */
  function addRemotePath(pathObj) {
    if (!config.value.remote) {
      config.value.remote = { paths: [], pinned: [] }
    }
    config.value.remote.paths.push(pathObj)
  }

  return { removePath, clearAll, removePinned, clearPinned, addRemotePath, remotePathDisplay }
}
