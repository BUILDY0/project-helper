# 组件设计指南

> 本文档面向后续开发者（含 AI 协作场景），说明本项目通用组件的分层、命名、设计原则与共性样式约定。
> **新增 / 修改通用组件前，请先读完本文，并据此保持一致。**

---

## 1. 目录分层

| 目录                       | 定位                                                | 命名                                                                                |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `components/common/`       | **原子组件 + 业务无关的复合组件**。可被任意页面复用 | 原子组件用 `base-` 前缀；复合组件按语义命名（如 `inline-toggle`、`unsaved-dialog`） |
| `components/business/`     | **业务复合组件**，承载具体业务语义                  | 按业务概念命名（如 `top-banner`、`update-banner`）                                  |
| `components/icons/`        | 纯 svg 图标                                         | `icon-xxx.vue`，统一仅暴露 `size` 一个 prop                                         |
| `pages/<page>/components/` | **仅本页使用**的组件                                | 不加前缀，由 page 目录约束作用域                                                    |

> **判断"是否归 common 原子组件"的标准**：高频复用 + 行业惯例标准件 + 自身可独立工作 + 提供完整定制位（slot/props）。一旦满足，就该用 `base-` 前缀进入 `common/`。

---

## 2. 现有原子组件清单

| 组件                  | 用途                    | 关键 props/slots                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base-button`         | 所有按钮场景的统一入口  | `variant`(primary/secondary/danger/text/icon)、`tone`(text 变体下 default/primary)、`size`(xs/sm/md)、`inline`(行内嵌入模式，仅 text 变体语义有意义)、`loading`、`disabled`；slot：`default`/`prefix`/`suffix`                                                        |
| `base-input`          | 文本输入                | `modelValue`、`type`、`placeholder`、`readonly`、`disabled`、`clearable`、`size`(sm/md)；slot：`prefix`；expose：`focus()`/`select()`                                                                                                                                 |
| `base-number-input`   | 数字步进输入            | `modelValue`、`min`、`max`、`step`                                                                                                                                                                                                                                    |
| `base-switch`         | 开关（`role="switch"`） | `modelValue`、`size`、`tone`、`disabled`、`ariaLabel`                                                                                                                                                                                                                 |
| `base-confirm-dialog` | 确认弹窗                | `visible`、`title`、`message`、`confirmText`、`cancelText`、`closeIcon`、`confirmTone`(danger/primary)、`width`(默认 380)；slot：`default`(body) / `actions`(自定义按钮组)                                                                                            |
| `base-popconfirm`     | 浮层确认气泡            | `message`、`confirmText`、`disabled`                                                                                                                                                                                                                                  |
| `base-context-menu`   | 右键菜单                | `visible`、`x`、`y`、`items`、`footnote`                                                                                                                                                                                                                              |
| `base-toast`          | 全局轻提示              | expose：`show(message, type)`                                                                                                                                                                                                                                         |
| `base-select`         | 下拉选择                | `modelValue`、`options`([{label,value,disabled?}] 或 [{group,options:[...]}])、`placeholder`、`disabled`、`clearable`、`multiple`、`filterable`、`reserveKeyword`、`size`(sm/md)；emit：`change(value, option)`；slot：`#option={option,selected}`；expose：`focus()` |

复合组件（不带 `base-` 前缀）：

| 组件               | 用途                                   | 内部依赖                                                                           |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `inline-toggle`    | 标题区行内"开关 + 文字标签"            | `base-switch`                                                                      |
| `unsaved-dialog`   | 未保存提示弹窗（取消/放弃/保存三按钮） | `base-confirm-dialog` + `base-button`（薄包装：通过 `#actions` slot 自定义按钮组） |
| `theme-switch`     | 主题切换按钮（图标轨道）               | `icon-sun` / `icon-moon`                                                           |
| `help-circle-link` | 带图标的帮助链接                       | `icon-github` / `icon-docs`                                                        |
| `page-layout`      | 页面布局容器                           | 无                                                                                 |

---

## 3. 设计原则

### 3.1 一旦定义了原子组件，所有同类场景必须使用它

**这是底线。** 例：定义 `base-button` 后，任何 `<button>` 都应该用 `BaseButton`，差异通过 class 局部覆盖；不允许在业务里另写一套按钮 class。

只允许两类例外：

- **复合控件的内部装饰**：`base-input` 的清空 ×、`base-number-input` 的 step ±按钮——它们和外壳共享边框/底色形成视觉一体，不属于独立按钮
- **极特殊高频场景**：如窗口控制按钮（最小化/最大化/关闭，44×banner 高度，close 红 hover），全项目仅 banner 一处出现，自实现更直接

### 3.2 原子组件可以引用其他原子组件

方向必须清晰、无循环。例：`base-confirm-dialog → base-button` 合理，反之不行。

### 3.3 提供足够定制位，让上层无需绕开

原子组件应通过 `slot` / `props` / 可覆盖的 class 提供扩展点。如 `base-button` 提供 `prefix`/`suffix` 插槽承载图标，避免上层为"图标+文字"重写按钮。

如果业务方需要绕开原子组件，**说明原子组件抽象不到位**，应该补强而不是放任。

### 3.4 原子组件的 `<style>` 不带 scoped

**这是与业务层最大的差异。** 所有 `base-*` 原子组件使用全局 `<style>`（不写 `scoped`），样式全部走 BEM 命名 (`.base-xxx` / `.base-xxx__yyy` / `.base-xxx--zzz`)，靠命名空间天然避免冲突。

为什么不 scoped：

- scoped 给选择器自动加 `[data-v-xxx]`，特异性 +1，业务方覆盖**永远输一级**，必须靠 `:deep()` 或 `!important` 才能改样式——这是反原子组件的
- 不 scoped 后，业务方在自己 scoped 里写 `.base-btn { ... }`，特异性 (0,1,0) + 业务自身 `[data-v-xxx]` = (0,2,0)，**稳稳覆盖**原子组件 (0,1,0)，零博弈

业务层（页面、业务复合组件）**仍然保留 `<style scoped>`**——业务样式必须本地化以避免污染。

### 3.5 原子组件不允许定义/覆盖 CSS 变量

所有可对外配置的 token（如关闭按钮的 `--close-top`）**必须写在 `styles/base-components.css`**，组件 vue 文件里只**消费**变量，不**声明**变量（包括不写 fallback 默认值以外的设值语句）。

业务方如需覆盖：在自己 scoped 里直接覆盖原子组件的 class（如 `.base-confirm-dialog { ... }`）即可，不要通过设变量绕道。

### 3.6 通过 class 覆盖样式，使用相同特异性

原子组件的 hover 用 `:hover:not(:disabled)`，业务覆盖时**也用 `:hover:not(:disabled)`**（特异性同 0,3,1）。Vue scoped 给业务 class 自动 +1 特异性，**业务覆盖天然胜出**。

不要用 `!important`。

### 3.7 尺寸采用规范档位，不自定义非标值

- `base-button`：
  - `size`：`xs=22 / sm=28 / md=32` 三档纯尺寸，所有 variant 通用
  - `inline`：独立 Boolean prop，开启后高度自适应行内文字 + 紧凑 padding，**仅与 `text` variant 组合有意义**（用于嵌在标题/段落里的轻量动作按钮，不撑高父级）
- `base-input`：`sm=30 / md=32`
- `base-switch`：`sm=30×16 / md=40×22`

业务有极特殊紧凑需求时，先评估是否真有必要——大多数时候选择就近的标准档即可。

### 3.8 命名规范

- 文件名：`kebab-case`，原子组件用 `base-` 前缀
- import 标识符：`PascalCase`，与文件名一一对应（`base-button.vue` → `BaseButton`）
- props 命名：`camelCase`，模板属性用 `kebab-case` (`:model-value`)
- CSS class（仅对原子组件）：BEM —— root 用 `.base-xxx`，子元素用 `__`，修饰符用 `--`

---

## 4. 样式与 token 文件分工

| 文件                         | 职责                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `styles/themes.css`          | **主题变量**（颜色、阴影、light/dark 切换）：`--color-primary`、`--color-surface`、`--color-text*`、`--shadow-*` 等 |
| `styles/global.css`          | **全局非主题变量**（尺寸 token）+ 重置样式：`--radius-sm/md/lg`、`--banner-h`                                       |
| `styles/base-components.css` | **原子组件相关**：CSS 变量默认声明 + 跨组件复用的视觉规格 class（如 `.btn-close-affix`）                            |
| `styles/tooltip.css`         | tooltip 指令专用样式                                                                                                |

**所有原子组件的颜色、圆角、阴影必须引用变量，不允许写死颜色值**（极个别例外如 danger 按钮的 `#fff` 文字）。

### 4.1 base-components.css 的内容范畴

1. 跨原子组件复用的视觉规格 class（≥2 处使用）
2. 上述 class 暴露给业务方覆盖的 CSS 变量默认值（fallback 写法）
3. 单原子组件容器对该规格的尺寸覆盖（如 `.base-confirm-dialog .btn-close-affix { --close-top: 12px }`）

### 4.2 现有规格

| class              | 用途                                           | 配合使用                                              |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| `.btn-close-affix` | 弹窗/浮层右上角的关闭 × 定位 + 字号 + 起始颜色 | `<BaseButton variant="icon">` (sm 大面板 / xs 小气泡) |

### 4.3 新增规格的流程

1. 确认它满足"≥2 处复用 + 视觉规格 + 与业务语义无关"三条
2. 在 `base-components.css` 添加，以原子组件基座 class 作前缀（如 `.base-btn.xxx-yyy`），保证特异性
3. 必要时通过 CSS 变量暴露可调点（fallback 写法），并在 `.base-xxx ` 容器选择器上集中给具体值
4. 在本节"现有规格"表格中登记

---

## 5. 给 AI / 新开发者的快速决策树

### 写新按钮？

1. 用 `<BaseButton>`，按场景选 `variant` + `size`
2. 需要图标？放 `#prefix` 或 `#suffix` slot
3. loading？传 `:loading="..."`
4. 视觉特殊？加自定义 class 局部覆盖（业务层 scoped 内同特异性即可胜出）
5. **不要新建独立按钮 class**

### 写新输入框？

1. 文本输入 → `<BaseInput>`，数字 → `<BaseNumberInput>`，开关 → `<BaseSwitch>`
2. 需要前缀图标？`<BaseInput>` 用 `#prefix` slot
3. 复杂表单组件 → 看是否要补强 `base-input` 而不是另起炉灶

### 写新弹窗 / 浮层？

1. 二次确认 → `<BaseConfirmDialog>`
2. 简短确认气泡 → `<BasePopconfirm>`
3. 右键菜单 → `<BaseContextMenu>`
4. 关闭按钮统一用 `class="btn-close-affix"` + `<BaseButton variant="icon">`（dialog 用 sm，popconfirm 用 xs）

### 用到图标？

1. **不允许**在组件模板里内联 `<svg>`（除非是非可识别的纯装饰元素）
2. 已有图标 → 直接 `import IconXxx from '@/components/icons/icon-xxx.vue'`
3. 没有的图标 → **先**在 `components/icons/` 新建 `icon-xxx.vue`，再 import 使用
4. 详见 `components/icons/README.md`

### 新增原子组件？

1. 文件命名 `base-xxx.vue`，root class `.base-xxx`，BEM 全局命名
2. **不写 `<style scoped>`**，写 `<style>`
3. 视觉 token 全部走 themes.css / global.css 的变量；可对外配置点放 base-components.css
4. 在第 2 节、第 5 节同步登记

### 看到现有代码不规范？

- 旧实现用了独立按钮 class / 重复的视觉规格 → 改造为标准件 + class 覆盖 + 共享规格
- 原子组件还在用 scoped 或非 BEM 命名 → 改造为非 scoped + BEM
- 改造涉及非小范围重构时，先与 user 沟通方案再动手

---

最后更新：随组件库迭代同步更新本文。
