# dsh-global-prompt

一个 DeepSeek Harness 可安装插件: 在 Web 设置界面直接编辑**用户全局指令文件** (`$DSH_HOME/AGENTS.md`), 不必再手动打开 `.dsh` 目录修改 AGENTS.md。

![alt text](assets/global-prompt-settings-page.png)

## 行为

- 设置对话框新增一个 **全局指令** 分区页: 多行编辑器 + 保存按钮 + 文件路径显示 + 字符数统计。
- 文件不存在时显示空编辑器, 首次保存即创建文件。
- 写入采用 UTF-8 无 BOM 编码。
- **AGENTS.md 文件本身是唯一真源**: 设置页与外部编辑读写同一份文件, 无第二份数据。
- 生效时机遵循系统机制 (触摸驱动刷新): 新会话第一步读到最新内容; 已打开会话在其下一次成功文件工具调用或新一轮时重新读取。
- 接口仅允许本机回环访问; 请求体上限 1 MiB。

## 安装

```powershell
# 在 dsh CLI 所在环境 (仓库检出目录可用 pnpm dsh)
dsh plugin --profile web add E:\path\to\dsh-global-prompt

# 重启 dsh web 使新插件生效
dsh web
```

打开 `http://127.0.0.1:3080` → 设置 → 全局指令。

## 卸载

```powershell
# 在 dsh CLI 所在环境 (仓库检出目录可用 pnpm dsh)
dsh plugin --profile web remove dsh-global-prompt

# 重启 dsh web 使卸载插件生效
dsh web
```

## 开发

```powershell
pnpm install
pnpm test         # vitest: store (13) + editor (7)
pnpm typecheck
pnpm build        # lib/index.js (host) + lib/client.js (client bundle)
```

## 结构

| 文件 | 职责 |
| --- | --- |
| `src/store.ts` | 接缝 1: 用户全局指令文件的读写语义 (被单测覆盖) |
| `src/index.ts` | Host 插件: 注册 `GET/PUT /api/global-prompt` 路由 |
| `src/client/GlobalPromptEditor.tsx` | 接缝 2: 编辑器组件 (被单测覆盖) |
| `src/client/api.ts` | 编辑器的 HTTP 实现 (由安装验证覆盖) |
| `src/client/index.tsx` | Client 插件: 注册 `settings.section` 分区 |
| `cordis.patch.yml` | bundle 层: 插入 `global-prompt` 行 |
