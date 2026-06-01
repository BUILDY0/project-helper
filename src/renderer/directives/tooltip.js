/**
 * v-tooltip 自定义指令：基于 hover 触发的轻量 tooltip
 *
 * 设计要点：
 * - 全局只渲染一个 tooltip DOM（单例），通过移动 + 复用降低开销，避免给每个绑定元素挂载子节点
 * - tooltip 节点 append 到 document.body，天然脱离任何祖先 overflow:hidden / transform 影响
 * - 定位采用 fixed 坐标 + 自动翻转 + 视口夹紧，配合 8px 边距避免贴边
 * - 样式只用 CSS 变量（见 tooltip.css），后续 dark 主题只需覆盖变量即可
 *
 * 用法：
 *   v-tooltip="'文本'"
 *   v-tooltip:bottom="'文本'"
 *   v-tooltip="{ content: '文本', placement: 'left', delay: 200 }"
 *   v-tooltip="null"      // 不显示
 *   v-tooltip="''"        // 不显示（空字符串等价于 disabled）
 */

// ===== 配置常量 =====
const SHOW_DELAY = 150 // hover 多久后展示，避免快速划过闪烁
const HIDE_DELAY = 60 // 离开多久后隐藏，给从触发元素移到 tooltip 的过渡余量（当前 tooltip 不可交互，仍保留小延迟避免闪烁）
const VIEWPORT_PADDING = 8 // 视口内边距，避免贴边
const GAP = 8 // tooltip 与触发元素之间的间距

// ===== 单例 tooltip 节点 =====
let tipEl = null
let arrowEl = null

/** 懒创建单例节点 */
function ensureTip() {
  if (tipEl) return tipEl
  tipEl = document.createElement('div')
  tipEl.className = 'app-tooltip'
  tipEl.setAttribute('role', 'tooltip')
  arrowEl = document.createElement('div')
  arrowEl.className = 'app-tooltip__arrow'
  const content = document.createElement('div')
  content.className = 'app-tooltip__content'
  tipEl.appendChild(content)
  tipEl.appendChild(arrowEl)
  document.body.appendChild(tipEl)
  return tipEl
}

// ===== 当前激活状态 =====
// 当前持有 tooltip 显示的元素及其配置；同一时刻只允许一个
let activeEl = null
let activeOptions = null
let showTimer = null
let hideTimer = null
// 全局禁用计数器：计数 > 0 时所有 tooltip 不响应展示。
// 用计数而非布尔，是为了支持多个弹层叠加（如 ContextMenu 之上又开 ConfirmDialog），任意一层关闭时不会误启用
let disabledCount = 0

/** 解析指令的 binding 为 { content, placement, delay, whenOverflow, markdown }
 *
 * 支持：
 * - v-tooltip="'text'"
 * - v-tooltip:bottom="'text'"
 * - v-tooltip.overflow="'text'"               // 仅在元素文本被截断（出现 ... 或多行 clamp）时才显示
 * - v-tooltip.md="'**加粗** `代码`'"            // 按轻量内联 markdown 渲染
 * - v-tooltip="{ content, placement, delay, whenOverflow, markdown }"
 */
function parseBinding(binding) {
  const v = binding.value
  const mods = binding.modifiers || {}
  let content = ''
  let placement = binding.arg || 'top'
  let delay = SHOW_DELAY
  // 修饰符 .overflow 与对象式 whenOverflow 等价
  let whenOverflow = !!mods.overflow
  // 修饰符 .md 与对象式 markdown 等价
  let markdown = !!mods.md
  if (v == null) {
    content = ''
  } else if (typeof v === 'string' || typeof v === 'number') {
    content = String(v)
  } else if (typeof v === 'object') {
    content = v.content == null ? '' : String(v.content)
    if (v.placement) placement = v.placement
    if (typeof v.delay === 'number') delay = v.delay
    if (typeof v.whenOverflow === 'boolean') whenOverflow = v.whenOverflow
    if (typeof v.markdown === 'boolean') markdown = v.markdown
  }
  // 仅接受 4 种合法值，其他兜底为 top
  if (!['top', 'bottom', 'left', 'right'].includes(placement)) placement = 'top'
  return { content, placement, delay, whenOverflow, markdown }
}

/** HTML 转义：作为 markdown 渲染前的第一道处理，杜绝原始标签注入（XSS） */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 轻量内联 markdown -> 安全 HTML
 * 仅支持：`行内代码`、**加粗**、*斜体*、换行
 * 先整体转义再做替换，因此不会引入任何可执行 HTML
 * 注：刻意不支持 _斜体_，避免误伤 README 里的 snake_case 标识符
 */
function renderInlineMarkdown(raw) {
  let html = escapeHtml(raw)
  // 行内代码优先处理，其内部不再二次解析强调语法
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 加粗先于斜体，避免 ** 被单个 * 规则拆散
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // 换行转 <br>
  html = html.replace(/\r?\n/g, '<br>')
  return html
}

/**
 * 把内容写入 tooltip 内容节点：markdown 模式走安全 HTML，否则纯文本
 * 同时把原始字符串缓存在节点上，供 updated 钩子做"内容是否变化"的比较
 */
function applyContent(contentNode, options) {
  if (options.markdown) {
    contentNode.innerHTML = renderInlineMarkdown(options.content)
  } else {
    contentNode.textContent = options.content
  }
  contentNode.__rawContent__ = options.content
}

/**
 * 判断元素的文本内容是否被截断
 * - 单行省略（white-space:nowrap + text-overflow:ellipsis）：scrollWidth > clientWidth
 * - 多行省略（-webkit-line-clamp）：scrollHeight > clientHeight
 * 两者任一成立即视为截断
 */
function isOverflowing(el) {
  if (!el) return false
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
}

/**
 * 计算并设置 tooltip 位置
 * 算法：
 * 1. 先按 preferred placement 试算坐标
 * 2. 若该方向越界则翻转到反方向；仍越界则保留原方向（让 clamp 处理）
 * 3. 在垂直/水平方向用 clamp 把 tooltip 拉回视口
 * 4. 箭头位置跟随触发元素中心点，保证对齐
 */
function place(triggerRect, placement) {
  const tip = tipEl
  // 先重置可能影响测量的样式
  tip.style.left = '0px'
  tip.style.top = '0px'
  tip.dataset.placement = placement

  const tipRect = tip.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  // 试算各方向坐标
  const calc = (p) => {
    let x = 0
    let y = 0
    if (p === 'top') {
      x = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
      y = triggerRect.top - tipRect.height - GAP
    } else if (p === 'bottom') {
      x = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
      y = triggerRect.bottom + GAP
    } else if (p === 'left') {
      x = triggerRect.left - tipRect.width - GAP
      y = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
    } else {
      // right
      x = triggerRect.right + GAP
      y = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
    }
    return { x, y }
  }

  // 检查方向是否越出对应边
  const fits = (p, x, y) => {
    if (p === 'top') return y >= VIEWPORT_PADDING
    if (p === 'bottom') return y + tipRect.height <= vh - VIEWPORT_PADDING
    if (p === 'left') return x >= VIEWPORT_PADDING
    if (p === 'right') return x + tipRect.width <= vw - VIEWPORT_PADDING
    return true
  }

  let final = placement
  let pos = calc(placement)
  if (!fits(placement, pos.x, pos.y)) {
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[placement]
    const altPos = calc(opposite)
    if (fits(opposite, altPos.x, altPos.y)) {
      final = opposite
      pos = altPos
    }
  }

  // 视口夹紧
  pos.x = Math.max(VIEWPORT_PADDING, Math.min(pos.x, vw - tipRect.width - VIEWPORT_PADDING))
  pos.y = Math.max(VIEWPORT_PADDING, Math.min(pos.y, vh - tipRect.height - VIEWPORT_PADDING))

  tip.dataset.placement = final
  tip.style.left = `${Math.round(pos.x)}px`
  tip.style.top = `${Math.round(pos.y)}px`

  // 箭头：按 final 方向定位到触发元素中心相对 tooltip 的偏移
  if (final === 'top' || final === 'bottom') {
    const center = triggerRect.left + triggerRect.width / 2
    // 箭头在 tooltip 内的水平偏移；夹紧避免溢出 tooltip 边界
    const ax = Math.max(10, Math.min(center - pos.x, tipRect.width - 10))
    arrowEl.style.left = `${ax}px`
    arrowEl.style.top = ''
  } else {
    const center = triggerRect.top + triggerRect.height / 2
    const ay = Math.max(10, Math.min(center - pos.y, tipRect.height - 10))
    arrowEl.style.top = `${ay}px`
    arrowEl.style.left = ''
  }
}

/** 真正展示 tooltip */
function show(el, options) {
  ensureTip()
  const { content, placement } = options
  if (!content) return
  const contentNode = tipEl.querySelector('.app-tooltip__content')
  applyContent(contentNode, options)
  // 先显示但保持透明，等 place 计算完再可见，避免初始位置闪烁
  tipEl.classList.add('is-measuring')
  tipEl.classList.add('is-visible')
  place(el.getBoundingClientRect(), placement)
  tipEl.classList.remove('is-measuring')
  activeEl = el
  activeOptions = options
}

/** 隐藏 tooltip（仅在隐藏的目标是 activeEl 时生效，避免快速切换时误关闭） */
function hide(el) {
  if (!tipEl) return
  if (el && activeEl !== el) return
  tipEl.classList.remove('is-visible')
  activeEl = null
  activeOptions = null
}

/** 安排展示（带延迟）
 * whenOverflow=true 时，仅在元素当前确实被截断时才展示
 * - 检测点 1：立即切换分支（已有别的 tooltip 在显示，无延迟切到当前元素）
 * - 检测点 2：延迟到期后真正 show 之前；若延迟期间窗口尺寸/内容变化导致不再截断，则放弃展示
 */
function scheduleShow(el, options) {
  clearTimeout(hideTimer)
  clearTimeout(showTimer)
  // 全局禁用期间（如有 ContextMenu / Dialog 等弹层打开）拒绝展示
  if (disabledCount > 0) return
  // 已有其它 tooltip 在显示，立即切换（避免延迟感）
  if (activeEl && activeEl !== el) {
    if (options.whenOverflow && !isOverflowing(el)) {
      // 当前元素未截断：不切到它，但也不影响别的元素的 tooltip 关闭流程（由别的元素自身的 leave 处理）
      return
    }
    show(el, options)
    return
  }
  showTimer = setTimeout(() => {
    if (options.whenOverflow && !isOverflowing(el)) return
    show(el, options)
  }, options.delay)
}

/** 安排隐藏（带延迟） */
function scheduleHide(el) {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => hide(el), HIDE_DELAY)
}

// ===== 全局事件：滚动 / 缩放时立即关闭，避免错位 =====
let globalListenersBound = false
function bindGlobalListeners() {
  if (globalListenersBound) return
  globalListenersBound = true
  const onDismiss = () => hide()
  // capture: true 以便监听任何滚动容器
  window.addEventListener('scroll', onDismiss, true)
  window.addEventListener('resize', onDismiss)
}

/**
 * 把指令配置和事件处理器绑定到元素上
 * 处理器引用存在 el.__tipHandlers__，便于 unmounted 时解绑
 */
function attach(el, options) {
  bindGlobalListeners()
  // 保存最新 options，事件触发时取最新值（响应式更新）
  el.__tipOptions__ = options

  // 已绑定过则只更新 options
  if (el.__tipHandlers__) return

  const onEnter = () => {
    const opts = el.__tipOptions__
    if (!opts || !opts.content) return
    scheduleShow(el, opts)
  }
  const onLeave = () => scheduleHide(el)
  // mousedown 立即关闭：按下后用户多半要执行操作，tooltip 留着会挡视线
  const onDown = () => hide(el)

  el.addEventListener('mouseenter', onEnter)
  el.addEventListener('mouseleave', onLeave)
  el.addEventListener('mousedown', onDown)
  el.__tipHandlers__ = { onEnter, onLeave, onDown }
}

function detach(el) {
  const h = el.__tipHandlers__
  if (h) {
    el.removeEventListener('mouseenter', h.onEnter)
    el.removeEventListener('mouseleave', h.onLeave)
    el.removeEventListener('mousedown', h.onDown)
    delete el.__tipHandlers__
  }
  delete el.__tipOptions__
  // 当前正在显示的就是这个元素，立即关掉
  if (activeEl === el) hide(el)
}

/** Vue 3 自定义指令对象 */
export const tooltip = {
  mounted(el, binding) {
    const opts = parseBinding(binding)
    attach(el, opts)
  },
  updated(el, binding) {
    const opts = parseBinding(binding)
    attach(el, opts)
    // 内容变空：若当前正在显示，则隐藏
    if (!opts.content && activeEl === el) hide(el)
    // 内容变化且仍在显示：实时刷新文本与位置
    else if (activeEl === el && tipEl) {
      const contentNode = tipEl.querySelector('.app-tooltip__content')
      if (contentNode.__rawContent__ !== opts.content) {
        applyContent(contentNode, opts)
        place(el.getBoundingClientRect(), opts.placement)
      }
    }
  },
  beforeUnmount(el) {
    detach(el)
  }
}

/**
 * 强制立即隐藏当前显示的 tooltip（如有），并清除待展示定时器
 * 供外部弹层（ContextMenu / Dialog 等）在打开时调用
 */
export function hideAll() {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  hide()
}

/**
 * 全局禁用 / 启用 tooltip 展示
 * 内部用引用计数实现：true 时计数 +1 并立即关掉当前 tooltip；false 时计数 -1
 * 支持多个调用方叠加（如 ContextMenu 之上再开 Dialog），任一关闭不会误启用
 *
 * @param {boolean} disabled
 */
export function setDisabled(disabled) {
  if (disabled) {
    disabledCount += 1
    hideAll()
  } else {
    disabledCount = Math.max(0, disabledCount - 1)
  }
}

/** 安装函数：app.use(tooltipPlugin) 即可全局注册 v-tooltip */
export default {
  install(app) {
    app.directive('tooltip', tooltip)
  }
}
