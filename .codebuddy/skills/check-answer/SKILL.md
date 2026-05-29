---
name: check-answer
description: This skill should be used at the start of every task and again before delivering any answer that includes code changes. It enforces two self-review passes — an architectural review (is the implementation reasonable, what risks exist, what can be improved, viewed from the whole page/module rather than the local change) and a comment review (are comments concise and elegant rather than verbose). For large refactors discovered during review, it requires asking the user for confirmation and listing multiple modification options before acting; small, safe fixes may be applied directly.
---

# check-answer

Agent 在把答案交给用户之前，对自己的产出做一次自查，避免"只看局部"和"注释啰嗦"两类常见问题。

## 何时执行

- 任务一开始就加载本 skill，让规则在整轮对话中保持在上下文里。
- 产出包含代码改动的完整答案后、回复用户前，必须执行一次。
- 同一轮内若再次修改了代码，对应的 pass 需重跑。

## Pass 1 — 实现自查（站在模块整体视角）

从"怎样能跑通"切换到"在当前代码库里这样做是否合适"。对刚做的每处改动回答：

1. **合理性** —— 改动是否契合该页面/模块已有的结构、数据流、生命周期与约定？还是只是一个违背整体设计的局部修补？
2. **风险** —— 可能在哪里出问题？至少考虑：SSR/CSR 一致性、hydration、竞态、副作用、性能回退、可访问性、浏览器/设备兼容、错误与边界路径、安全、对既有调用方的兼容性。
3. **优化空间** —— 是否有更简单、更地道、更高性能的写法？有没有重复、死代码、可抽取或可内联的部分？

### Pass 1 后的行动规则

- **小范围、安全、局限于本次改动内**的修正（拼写、明显 bug、刚编辑块里的死代码、命名小调整、一致性微调）：直接改，不必请示。
- **任何需要较大重构、改动到本次范围外的文件、改变公共 API/props/契约、调整架构、或可能让用户意外的情况**：停下来，不要继续编辑。回复用户时给出：
  - 简短地说明发现的问题。
  - 一个编号的方案列表（通常 2–4 条），每条写清楚：怎么改、为什么、代价是什么。
  - 明确询问采用哪一条。
- 永远不要以"顺手清理"为由静默地做大范围变更。**保持对改动范围的可控**是硬性要求。

## Pass 2 — 注释自查（精简优雅）

重读本轮新增或修改的每一条注释，逐条问：

1. 它是在解释 **为什么**（意图、取舍、不显然的约束），还是在复述代码已经写明的 **是什么**？
2. 在不丢关键信息的前提下，是否可以更短？
3. 是否与附近的注释、清晰的标识符或 docstring 重复？

### Pass 2 后的行动规则

- 保留：表达意图、坑点、不变量、关联 issue/spec 链接、不显然推理的注释。
- 删除或压缩：
  - 复述紧邻代码行的注释。
  - 由函数名/变量名就能看出的废话。
  - 重复上文已经讲过的信息。
  - 教程式的旁白叙述。
- 一句话能说清就别写多行块。
- 跟随文件已有的语言（中/英），不要中英混写。
- 这一类清理直接做，不需要请示用户。

## 输出纪律

- 不要向用户宣告"我正在执行 check-answer"，安静地把它跑完即可。
- 最终回复要体现两轮自查的结果：要么是已经清理过的改动，要么——如果 Pass 1 发现了大范围隐患——是一个带编号方案的问题，且**还没有提前动手做猜测性修改**。
