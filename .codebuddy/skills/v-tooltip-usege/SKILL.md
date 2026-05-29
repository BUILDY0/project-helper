---
name: v-tooltip-usage-guide
description: 本技能为 AI 提供 Vue 3 自定义 tooltip 指令的全面使用指南，包含基础用法、文本溢出检测、动态内容、UI 组件集成和性能优化等各类场景的代码模板。基于项目实际实现的 `v-tooltip` 指令，帮助 AI 快速生成符合最佳实践的 tooltip 代码。
---

# Tooltip Skill 设计文档

## 概述

本技能专门为 AI 设计，旨在帮助 AI 理解和正确使用 Vue 3 自定义 tooltip 指令。基于现有的 `v-tooltip` 指令实现，提供各种使用场景的代码模板和最佳实践。

## 设计目标

- **目标用户**：AI 助手
- **核心功能**：提供 v-tooltip 指令的各种使用模板
- **设计原则**：简洁、实用、易于 AI 理解和应用

## 技术背景

基于项目中的现有实现：

- `src/renderer/directives/tooltip.js` - tooltip 指令完整实现
- `src/renderer/components/ProjectCard.vue` - 实际使用示例

## 技能内容结构

### 1. 基础用法模板

#### 简单文本 tooltip

```javascript
v-tooltip="'提示文本'"
```

#### 带方向的 tooltip

```javascript
v-tooltip:top="'顶部提示'"
v-tooltip:bottom="'底部提示'"
v-tooltip:left="'左侧提示'"
v-tooltip:right="'右侧提示'"
```

#### 对象配置式

```javascript
v-tooltip="{ content: '提示内容', placement: 'top', delay: 200 }"
```

### 2. 文本溢出检测模板

#### 单行文本溢出检测

```javascript
v-tooltip.overflow="elementText"
```

#### 多行文本溢出检测

```javascript
v-tooltip:bottom.overflow="descriptionText"
```

#### 对象式溢出检测

```javascript
v-tooltip="{ content: text, whenOverflow: true }"
```

### 3. 动态内容模板

#### 响应式数据

```javascript
const tooltipText = ref('动态提示')
v-tooltip="tooltipText"
```

#### 条件显示

```javascript
v-tooltip="shouldShowTooltip ? '提示内容' : null"
```

#### 计算属性

```javascript
const computedTooltip = computed(() => `${item.name} - ${item.status}`)
v-tooltip="computedTooltip"
```

### 4. UI 组件集成模板

#### 按钮 tooltip

```javascript
<button v-tooltip="'点击执行操作'">按钮</button>
```

#### 图标 tooltip

```javascript
<svg v-tooltip="'图标说明'">...</svg>
```

#### 表单元素 tooltip

```javascript
<input v-tooltip="'输入说明'" placeholder="请输入">
```

### 5. 性能优化模板

#### 防抖延迟

```javascript
v-tooltip="{ content: text, delay: 300 }"
```

#### 条件触发

```javascript
v-tooltip="isInteractive ? tooltipContent : null"
```

#### 静态内容优化

```javascript
const staticTooltip = '固定提示内容'
v-tooltip="staticTooltip"
```

## 最佳实践指南

### 内容设计原则

1. **简洁明了**：tooltip 内容应简短，避免冗长描述
2. **方向选择**：根据元素位置选择合适的方向
3. **溢出检测**：对可能被截断的文本使用 `.overflow` 修饰符
4. **性能考虑**：避免在大量元素上使用复杂 tooltip
5. **可访问性**：确保 tooltip 对屏幕阅读器友好

### 错误处理模式

#### 空值处理

```javascript
v-tooltip="content || null"
```

#### 类型检查

```javascript
v-tooltip="typeof content === 'string' ? content : String(content)"
```

#### 边界情况

```javascript
v-tooltip="content?.trim() || null"
```

## 实现细节

### 技能文件结构

```
tooltip-usage-guide/
├── SKILL.md          # 技能主文件
├── templates/        # 代码模板目录
│   ├── basic-usage.md
│   ├── overflow-detection.md
│   ├── dynamic-content.md
│   └── ui-integration.md
└── examples/         # 完整示例
    └── project-card.md
```

### 技能激活条件

- 当 AI 需要编写 Vue 3 组件时
- 当涉及 tooltip 功能实现时
- 当需要优化现有 tooltip 代码时

## 验收标准

- [ ] AI 能够正确理解和使用各种 tooltip 模板
- [ ] 代码模板覆盖常见使用场景
- [ ] 最佳实践指南清晰易懂
- [ ] 错误处理模式完整
- [ ] 性能优化建议实用

## 后续扩展

1. 添加更多高级使用场景模板
2. 集成测试用例模板
3. 添加性能监控和调试指南
4. 支持更多自定义配置选项

## 备注

本技能专门为 AI 设计，不面向最终用户。所有内容都应简洁明了，便于 AI 理解和应用。
