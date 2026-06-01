/**
 * 把时间戳格式化为 YYYY-MM-DD HH:mm:ss
 * @param {number} ms 毫秒时间戳
 * @returns {string} 格式化后的时间字符串；ms 为 0 / null / undefined 时返回 '-'
 */
export function formatTime(ms) {
  if (!ms) return '-'
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
