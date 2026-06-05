# 配置

持久化配置均保存在用户目录下的一个 JSON 文件中，应用启动时读取，保存时写回。

## 存储

```
%USERPROFILE%\.project-helper\config.json
```

可在应用「配置」页点击 **打开文件** / **打开文件夹** 直接定位。

## 保存 & 生效

- 配置页中的改动需点击右上角 **保存** 才会写入磁盘。
- 顶部栏主题切换会立即写入配置文件。
- 通过应用 UI 修改始终安全；如果你直接编辑 JSON，建议先关闭应用再编辑，避免应用内未保存的修改在保存时覆盖你的手动改动。

## 配置项

完整结构示例：

```json
{
  "paths": [
    {
      "path": "D:/work",
      "type": "SYSTEM",
      "cfg": {
        "forced": false
      }
    }
  ],
  "depth": 1,
  "exclude_paths": ["D:/work/legacy"],
  "pinned": ["D:/work/my-favorite-project"],
  "theme": "light",
  "auto_run_startup": false,
  "auto_check_update": true,
  "tray": false,
  "auto_clear_installer": false,
  "ide_cfg": {
    "default": "",
    "exclude": [],
    "extends": []
  }
}
```

速查表：

| 配置项                 | 类型                | 默认      | 说明                                     |
| ---------------------- | ------------------- | --------- | ---------------------------------------- |
| `paths`                | `object[]`          | `[]`      | 扫描根目录列表                           |
| `depth`                | `number`            | `1`       | 扫描深度，范围 `0 - 5`                   |
| `exclude_paths`        | `string[]`          | `[]`      | 排除目录列表                             |
| `pinned`               | `string[]`          | `[]`      | 置顶项目的绝对路径列表                   |
| `theme`                | `"light" \| "dark"` | `"light"` | 主题风格                                 |
| `auto_run_startup`     | `boolean`           | `false`   | 是否随系统开机自启                       |
| `auto_check_update`    | `boolean`           | `true`    | 是否在启动后自动检查 GitHub Release 更新 |
| `tray`                 | `boolean`           | `false`   | 是否开启关闭最小化到托盘                 |
| `auto_clear_installer` | `boolean`           | `false`   | 是否自动清理安装包缓存                   |
| `ide_cfg`              | `object`            | —         | IDE 配置（默认启动项、排除、自定义扩展） |

### paths

扫描根目录列表，可配置多个。每个元素是一个对象，描述一个根目录。

- **类型**：`object[]`
- **默认值**：`[]`

示例：

```json
{
  "paths": [
    { "path": "D:/work", "type": "SYSTEM", "cfg": { "forced": false } },
    { "path": "E:/playground", "type": "SYSTEM", "cfg": { "forced": true } }
  ]
}
```

> **兼容旧格式**：早期版本 `paths` 直接使用字符串数组（`string[]`）。继续按旧格式手动填写也可以，应用读取时会自动转换为对象结构后写回，不会丢数据。
>
> ```json
> { "paths": ["D:/work", "E:/playground"] }
> ```

#### paths[].path

扫描根目录的绝对路径。

- **类型**：`string`
- **必填**
- **说明**：为空或路径无效时该项会被忽略。建议使用正斜杠 `/` 或转义后的反斜杠 `\\`，避免转义错误。

#### paths[].type

目录来源类型，为后续支持远程目录预留。

- **类型**：`string`
- **默认值**：`"SYSTEM"`
- **说明**：当前版本仅按"本机目录"处理，无论填什么值都会按本地路径扫描。建议保持 `"SYSTEM"` 或省略此字段，未来版本可能用它区分远程目录类型。

#### paths[].cfg.forced

是否强制把该目录本身作为项目显示。

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：默认情况下，目录必须含有 `.git` 或 `package.json` 才会被识别为项目。当 `forced` 为 `true` 时，目录即使不满足以上条件，也会作为一个项目卡片显示。
- **适用场景**：单独把脚本目录、文档目录等"非标准项目"也加入到列表中。

### depth

从每个根目录向下递归扫描的层级深度。

- **类型**：`number`
- **默认值**：`1`
- **取值范围**：`0 - 5`（超出会被夹紧到边界值）
- **说明**：
  - `0`：仅检查根目录本身。
  - `1`：扫描根目录及其直接子目录。
  - 数值越大扫描范围越广，耗时也会增加。
- **示例**：`paths = [{ path: "D:/work" }]`，`depth = 1` 时会扫描 `D:/work` 与 `D:/work/*`，但不会进入 `D:/work/*/*`。

### exclude_paths

排除目录列表，命中即跳过整棵子树。

- **类型**：`string[]`
- **默认值**：`[]`
- **说明**：路径写绝对路径；命中后该目录及其全部子目录都不会被扫描。
- **示例**：

```json
{ "exclude_paths": ["D:/work/legacy", "D:/work/archive"] }
```

### pinned

置顶项目的绝对路径列表。

- **类型**：`string[]`
- **默认值**：`[]`
- **说明**：扫描时会自动清理已失效的项（路径不存在或不再是目录）。一般通过项目卡片右键菜单管理，不建议手动修改。

### theme

主题风格。

- **类型**：`"light" | "dark"`
- **默认值**：`"light"`
- **说明**：顶部栏主题切换开关会立即写入此字段；非法值会回落到 `"light"`。

### auto_run_startup

是否随系统开机自启动。

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：在 **配置页 → 启动选项** 切换；开启后会同步写入 Windows 登录项，关闭则移除。

### auto_check_update

是否在应用启动后自动检查 GitHub Release 是否有新版本。

- **类型**：`boolean`
- **默认值**：`true`
- **说明**：开启时启动 5 秒后开始检查，并每小时复查一次；关闭则不会自动检查。

### tray

是否开启关闭最小化到托盘。

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：开启后点击窗口关闭按钮不会退出应用，而是最小化到系统托盘；可从托盘图标重新打开主窗口或退出。

### auto_clear_installer

是否在安装更新后自动清理旧安装包缓存。

- **类型**：`boolean`
- **默认值**：`false`
- **说明**：安装包缓存默认保存在 `%LOCALAPPDATA%\project-helper-updater`；开启后完成更新时会自动删除该目录下的旧安装包，节省磁盘空间。

### ide_cfg

IDE 启动配置，控制默认 IDE、隐藏项与自定义扩展脚本。

- **类型**：`object`
- **默认值**：`{ "default": "", "exclude": [], "extends": [] }`

示例：

```json
{
  "ide_cfg": {
    "default": "code",
    "exclude": ["cursor"],
    "extends": [
      {
        "name": "VS Code",
        "entry": "code",
        "label": "<name> 打开",
        "script": "<entry> <path>"
      }
    ]
  }
}
```

#### ide_cfg.default

右键菜单"打开"的默认 IDE。

- **类型**：`string`
- **默认值**：`""`
- **说明**：默认 IDE 配置， 双击项目/托盘快捷打开项目会使用默认 IDE。

#### ide_cfg.exclude

要从右键菜单中隐藏的 IDE 列表。

- **类型**：`string[]`
- **默认值**：`[]`
- **说明**：隐藏的 IDE `entry` 命令。匹配后该 IDE 不出现在右键菜单，但不影响其可用性探测。

#### ide_cfg.extends

自定义扩展 IDE 配置列表，追加在内置探测列表末尾。

- **类型**：`object[]`
- **默认值**：`[]`
- **说明**：可用于添加任意命令行工具作为"打开方式"，`script` 支持占位符替换，理论上任何合法命令均可执行。

每个元素的字段：

| 字段     | 类型     | 必填 | 说明                                                               |
| -------- | -------- | ---- | ------------------------------------------------------------------ |
| `name`   | `string` | 是   | IDE 显示名称，同时作为 `<name>` 占位符的替换值                     |
| `entry`  | `string` | 是   | 程序入口命令（如 `"code"`），用于可用性探测与 `<entry>` 占位符替换 |
| `label`  | `string` | 是   | 右键菜单展示文字，支持 `<name>`、`<entry>` 占位符                  |
| `script` | `string` | 是   | 执行命令模板，支持 `<name>`、`<entry>`、`<path>` 占位符            |

占位符说明：

| 占位符    | 替换值               |
| --------- | -------------------- |
| `<name>`  | `name` 字段的值      |
| `<entry>` | `entry` 字段的值     |
| `<path>`  | 运行时的目标项目路径 |

示例——用 VS Code 打开项目目录：

```json
{
  "name": "VS Code",
  "entry": "code",
  "label": "<name> 打开",
  "script": "<entry> <path>"
}
```
