/**
 * 通用并发控制器：限制同时执行的异步任务数，消费完一个任务即通知下一个入队。
 * @template T
 * @param {Array<() => Promise<T>>} tasks 任务工厂函数数组
 * @param {number} concurrency 最大并发数
 * @returns {Promise<T[]>} 与入参顺序一致的结果数组
 */
export function runWithConcurrency(tasks, concurrency) {
  return new Promise((resolve) => {
    const results = new Array(tasks.length)
    let nextIdx = 0
    let running = 0
    let finished = 0
    if (tasks.length === 0) {
      resolve(results)
      return
    }
    function pump() {
      while (running < concurrency && nextIdx < tasks.length) {
        const idx = nextIdx++
        running++
        tasks[idx]()
          .then((r) => {
            results[idx] = r
          })
          .catch(() => {
            results[idx] = undefined
          })
          .finally(() => {
            running--
            finished++
            if (finished === tasks.length) resolve(results)
            else pump()
          })
      }
    }
    pump()
  })
}
