/**
 * 克隆仓库表单的纯校验函数（与 Vue 无关，便于复用与测试）。
 */

// https(s)://host[:port]/path
const HTTPS_RE = /^https?:\/\/[^\s/@]+(:\d+)?\/[^\s]+$/i
// scp 语法：git@host:user/repo(.git)
const SSH_SCP_RE = /^[\w.-]+@[\w.-]+:[^\s]+$/i
// ssh://[user@]host[:port]/path
const SSH_URL_RE = /^ssh:\/\/[^\s]+$/i

/** 校验仓库地址：支持 https / ssh(scp 语法或 ssh:// 协议) */
export function isValidRepoUrl(raw) {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return false
  return HTTPS_RE.test(s) || SSH_URL_RE.test(s) || SSH_SCP_RE.test(s)
}

/**
 * 校验本地路径是否为合法绝对路径：
 * - Windows 盘符：C:\ 或 C:/
 * - UNC：\\server\share
 * 并排除文件名非法字符（* ? " < > |）
 */
export function isValidLocalPath(raw) {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return false
  const isWinAbs = /^[a-zA-Z]:[\\/]/.test(s)
  const isUnc = /^\\\\[^\\/]+[\\/]/.test(s)
  if (!isWinAbs && !isUnc) return false
  // 去掉盘符冒号后不应再出现非法字符
  const rest = s.replace(/^[a-zA-Z]:/, '')
  return !/[*?"<>|]/.test(rest)
}
