---
description: 发布版本脚本
---

# 智能发布版本

输入{ version } 版本号，自动更新文档、提交代码、推送分支及版本tag

## 执行流程

### 检查当前git status

- 如果有未提交的文件提示“当前有未提交的文件， 请处理或强制继续执行流程”
- 如果没有未提交的文件则继续流程

### 检查是否已经输入

`/publish 1.3.0`则版本号为 `1.3.0`

- 检查最近一次打的tag，如 `v1.2.0` 则当前版本为 `1.2.0 `
- 如果输入版本号<= 当前版本号，流程终止，提示“输入版本号小于或等于当前版本号{ 当前版本号 }， 请重新执行命令”
- 如果满足版本号大于当前版本，流程继续

### 刷新文档内容

- 对比当前commit和最近一次打tag的commit，总结所有改动信息，更新 `docs\changelog\index.md`，书写格式参照文件内其他版本的变更描述，注意发布版本的内容要放在最前面，如 `v1.2.1`的内容位于在 `v1.2.0`内容前面
- 检查 `README.md`文件中的 `目录结构`章节，如果有变化则需要更新内容；如果有重大变更需要新增章节或改动其他章节，需要用户进行确认，如果用户不同意则不进行修改且流程继续
- 检查 `src\main\modules\config-store.js`文件中 `DEFAULT_CONFIG`常量的设计，默认配置对比 `docs\guide\config.md`中配置项章节是否有变更，如果有变更则更新或者补充新增的配置项；如果没有变更则不修改。如果有重大变更需要新增章节或改动其他章节，需要用户进行确认，如果用户不同意则不进行修改且流程继续
  ```js
  const DEFAULT_CONFIG = {
    paths: [],
    depth: 1,
    exclude_paths: [],
    pinned: [],
    theme: DEFAULT_THEME
  }
  ```

### 提示用户已更新文档，确认是否还需要手动修改

- 用户没有输入时或输入否定的意思则流程暂停
- 用户输入肯定的意思则流程继续

### 提交版本信息

1. 比较发布版本号和当前版本号，确定执行的脚本
   - 发布patch版本，如 `v1.2.0`升级到 `v1.2.1`，使用 `npm run version:patch`命令，命令会提交版本相关文件并执行commit，流程继续
   - 发布minor版本，如 `v1.2.*`升级到 `v1.3.0`，使用 `npm run version:minor`命令，命令会提交版本相关文件并执行commit，流程继续
   - 发布major版本，如 `v1.*.*`升级到 `v2.0.0`，使用 `npm run version:major`命令，命令会提交版本相关文件并执行commit，流程继续
   - 发布特定版本，属于上面三种情况的，使用 `npm run version:set { version }`命令，命令结束后使用 `git add package.json package-lock.json`添加版本相关的改动文件，再使用 `git commit -m "chore: release v{ version }"`提交信息，流程继续

2. 推送main分支到远端
3. 在第1步中如果走了发布特定版本的分支，需要打tag，格式为 `v{ version }`；否则流程继续
4. 推送发布版本tag到远端

### 生成发版信息

格式参考如下，注意 `compare/`后面要修改为 `{ 上个版本号 }...{ 发布版本号 }`需要在对话中展示信息

```markdown
**Full Changelog**: https://github.com/BUILDY0/project-helper/compare/v1.2.0...v1.2.1

- feat: 新增文件夹删除选项
- chore: 设置页移除主题配置
- feat: 支持应用单实例启动并激活已有主窗口
- feat(docs): 更新文档页更新
- chore: 新增资源别名与图标同步脚本
```

### 提示发布版本成功

对话中提示用户：

```markdown
发布{ version }版本成功，请在github上查看:

- release: [https://github.com/BUILDY0/project-helper/releases]https://github.com/BUILDY0/project-helper/releases
- actions: [https://github.com/BUILDY0/project-helper/actions]https://github.com/BUILDY0/project-helper/actions
```
