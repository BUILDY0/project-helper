---
description: 发布版本脚本
---

# 智能发布版本

输入{ version } 版本号，自动更新文档、提交代码、推送分支及版本tag

## 通用交互规范（**所有中断点必须遵守**）

CodeBuddy 暂不支持原生按钮，因此所有"等待用户确认"的中断点统一采用 **数字选项菜单** 形式呈现，使用户只需回复一个数字即可推进流程。

格式模板：

```text
⏸ {简短说明本次中断的原因}

  [1] {选项 1 文案}（默认）
  [2] {选项 2 文案}
  [3] {选项 3 文案}

请回复数字（如 1）。直接回车 / 不回复 视为选择默认项 [1]。
```

规则：

- AI 输出菜单后**必须停止所有工具调用**，等待用户输入
- 用户回复 **纯数字**（`1` / `2` / `3` …）→ 按对应选项执行
- 用户回复 **"默认 / 回车 / ok / 是"** 等同义表达 → 视为选择默认项
- 用户回复**数字范围之外**或**含糊不清**的内容 → AI 必须**重申菜单**而非自由发挥，禁止自行推断意图
- 用户给出**额外说明**（如选 [2] 并附带修改诉求）→ 按用户说明走，禁止跳过

## 执行流程

### 第 1 步：检查 git status

执行 `git status --porcelain`：

- **工作树干净** → 直接进入第 2 步
- **有未提交文件** → 列出所有未提交文件，并展示菜单：

  ```text
  ⏸ 检测到未提交的文件：
  {未提交文件列表}

    [1] 终止本次发布，我去手动处理（默认）
    [2] 强制继续：把这些改动一起作为独立 commit 提交后再发版
    [3] 强制继续：忽略这些改动，发版只包含已提交内容（仅在你确定改动与本次发版无关时使用）

  请回复数字（如 1）。
  ```

### 第 2 步：解析与校验版本号

`/publish 1.3.0` 中的 `1.3.0` 即为 **{version}**。

- 通过 `git tag --sort=-v:refname` 取最近一次 `v*` tag，去掉前缀 `v` 即为 **{当前版本号}**
- 若 **{version} ≤ {当前版本号}** → 流程终止，提示："输入版本号小于或等于当前版本号 {当前版本号}，请重新执行命令"
- 若 **{version} > {当前版本号}** → 进入第 3 步

### 第 3 步：刷新文档内容

#### 3.1 更新 `docs/changelog/index.md`

- 对比 `git log v{当前版本号}..HEAD`，总结改动
- 在文件最前的版本条目（如 v1.2.1）**之前**插入新版本条目，格式参照文件内其他版本

#### 3.2 检查 `README.md` 的"目录结构"章节

- **目录结构无变化** → 跳过
- **仅有目录结构小幅调整** → 直接更新
- **有重大变更**（新增章节 / 改动其他章节） → 列出变更点并展示菜单：

  ```text
  ⏸ README.md 检测到以下重大变更建议：
  {变更点列表}

    [1] 应用全部变更（默认）
    [2] 跳过 README 改动，本次发布不动 README
    [3] 我自己来改，先暂停流程

  请回复数字（如 1）。
  ```

#### 3.3 检查 `src/main/modules/config-store.js` 的 `DEFAULT_CONFIG` 与 `docs/guide/config.md` 的同步

```js
const DEFAULT_CONFIG = {
  paths: [],
  depth: 1,
  exclude_paths: [],
  pinned: [],
  theme: DEFAULT_THEME
}
```

- **完全一致** → 跳过
- **仅字段增删改**（不涉及章节结构） → 直接更新 config.md
- **有重大变更**（需新增章节 / 改动其他章节） → 与 3.2 同样的菜单形式让用户选择

### 第 4 步：文档刷新完毕，确认是否还需手动修改（**硬性中断点**）

> AI **必须停止所有工具调用并等待用户输入**，禁止自行推断"用户已同意"或"测试场景默认继续"。

输出菜单：

```text
⏸ 文档已更新完毕：
  - changelog: {简述改动}
  - README: {已更新 / 无变化 / 已跳过}
  - config 文档: {已更新 / 无变化 / 已跳过}

是否还需要手动修改？

  [1] 不需要，进入版本提交（默认）
  [2] 我要再改改，先暂停流程
  [3] 终止本次发布

请回复数字（如 1）。
```

### 第 5 步：提交版本信息

1. 根据版本号差异决定脚本：
   - patch（如 `1.2.0` → `1.2.1`）→ `npm run version:patch`
   - minor（如 `1.2.x` → `1.3.0`）→ `npm run version:minor`
   - major（如 `1.x.x` → `2.0.0`）→ `npm run version:major`
   - 跨级 / 自定义版本（不属于上面三种）→
     - `npm run version:set {version}`
     - `git add package.json package-lock.json`
     - `git commit -m "chore: release v{version}"`
     - `git tag v{version}`
2. `git push origin main`
3. `git push origin v{version}`

> 标准的 `npm version:patch/minor/major` 已经会自动 commit + tag，**无需再手动 `git tag`**；只有"跨级 / 自定义版本"分支才需要补 tag。

### 第 6 步：生成发版信息（**用户可一键复制**）

要求：

- 代码块语言标识使用 `markdown`
- `compare/` 后替换为 `v{当前版本号}...v{version}`
- 条目从本次涉及的 commit message 中提炼，剔除无意义的格式化 / 合并提交

输出示例（**整段都在代码块内**，用户复制即得 markdown 原文）：

```markdown
**Full Changelog**: https://github.com/BUILDY0/project-helper/compare/v1.2.0...v1.2.1

- feat: 新增文件夹删除选项
- chore: 设置页移除主题配置
- feat: 支持应用单实例启动并激活已有主窗口
- feat(docs): 更新文档页更新
- chore: 新增资源别名与图标同步脚本
```

### 第 7 步：提示发布成功

对话中输出：

```markdown
发布 {version} 版本成功，请在 github 上查看：

- release: [https://github.com/BUILDY0/project-helper/releases](https://github.com/BUILDY0/project-helper/releases)
- actions: [https://github.com/BUILDY0/project-helper/actions](https://github.com/BUILDY0/project-helper/actions)
```
