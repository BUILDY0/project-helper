const { EventEmitter } = require('node:events')

/**
 * 主进程跨模块事件总线（单例）
 *
 * 用于解耦 config-store / tray / updater 等模块之间的通知关系：
 * - 发布方只需 emit，不必持有订阅方引用
 * - 订阅方在自己的初始化阶段 on，避免循环 require
 *
 * 约定的事件名集中在下方 Events 常量里，新增事件时同步登记，便于全局检索。
 */
const bus = new EventEmitter()

// 监听器数量上限按需上调；当前预期单事件订阅方很少，保持默认即可
// bus.setMaxListeners(20)

/** 已登记的事件名常量。值即事件字符串，统一从这里取避免拼写漂移 */
const Events = Object.freeze({
  /** 配置已落盘并完成归一化。payload: { config } —— 完整最新配置（含派生字段） */
  CONFIG_SAVED: 'config:saved',
  /** 项目扫描完成。payload: { projects } —— 完整项目列表（含 lastModified） */
  PROJECTS_SCANNED: 'projects:scanned',
  /** 通过托盘打开了某个项目。payload: { projectPath } */
  PROJECT_OPENED: 'project:opened'
})

module.exports = {
  bus,
  Events
}
