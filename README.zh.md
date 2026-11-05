# dsh-tinyfish

**给 dsh 换上免费的 TinyFish 搜索/抓取 —— 桌面端和手机端同一套。**

[English](README.md) | 中文

- **免费。** dsh 内置的 `web_search` / `web_fetch` 走 DeepSeek 的 Search & Fetch API，**每千次搜索
  $0.75、每千次抓取 $0.75**；TinyFish 的搜索和抓取有免费额度（限速、不用信用卡），效果相当。
- **工具外观不变。** 模型看到的仍然是官方的 `web_search` / `web_fetch`：名字、参数 schema、描述、
  输出渲染全部由 dsh 自带的 `@deepseek-ai/dsh-tool-web` 提供。我们只是把底层后端换成 TinyFish
  （`ctx.web` 的 provider），对经过 RL 训练的模型来说工具定义和训练时逐字节一致。
- **桌面/手机同一份脚本。** 桌面 `dsh` 和 dsh-go（Android）用同一条命令，不用手改配置，远程/LAN
  profile 同样适用。
- **干净退出。** 一条命令撤销，密钥永远不进 YAML。

重启后开一个新会话：`web_search` / `web_fetch` 照旧在，但调用走 TinyFish；另外还挂了 TinyFish MCP
（`mcp__tinyfish__*`），用于浏览器自动化、深研、数据集、监控这些官方能力缝里没有的东西。

<details>
<summary><b>让 agent 帮你装</b> —— 复制这段 prompt，填上你的 key</summary>

```text
把本机 dsh profile 的网页搜索/抓取后端从 DeepSeek 的付费 Search & Fetch API 换成 TinyFish，但保持模型看到的工具不变：已安装的 @deepseek-ai/dsh-tool-web 必须继续提供 web_search / web_fetch，名字和参数都不动 —— 脚本只是把 TinyFish 注册成 ctx.web 的 provider。按顺序做，任何一步失败就停下。

TinyFish key: sk-tinyfish-xxxx

1. `command -v dsh` 必须输出路径。记下 $DSH_PROFILE 和 $DSH_PROFILE_DIR，那就是要改的 profile，不要换。
2. git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   （没有 git：curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz）
3. cd dsh-tinyfish-mcp && node install.mjs --key sk-tinyfish-xxxx
   如果它说找不到 dsh 安装目录，用 DSH_INSTALL=/opt/dsh 前缀重跑。
4. 原样贴回这三行：provider row mounted / web seam pointed at tinyfish / official web_search/web_fetch enabled。任何一行是 false 就算失败。
5. 运行：dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   （期望 1）
6. 告诉我重启 app 并开新会话；当前会话保持启动时的工具。新会话里 web_search / web_fetch 应该还在，但结果来自 TinyFish。

约束：只改当前 profile 的 cordis.patch.yml（脚本会备份）；不要改 package.json、不要写 AGENTS.md、不要碰其他 profile；不要删/禁用 tool-web，也不要手写工具 schema。完整版见 PROMPT.md。
```

</details>

## 安装

免费 key：<https://agent.tinyfish.ai/api-keys>

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

没有 git（手机上常见）：

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main && node install.mjs --key sk-tinyfish-xxxx
```

然后重启 app，开一个**新**会话；当前会话保持它启动时的工具。

## 检查

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   # 期望 1
```

脚本会打印 `provider row mounted: true`、`web seam pointed at tinyfish: true`、
`official web_search/web_fetch enabled: true`；任何一行是 `false` 就没生效。

还可以看一眼网关选择：

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -A2 "id: web$"
# searchProvider: tinyfish
# fetchProvider: tinyfish
```

## 撤销 / 升级后

```bash
node install.mjs --revert    # 恢复官方 web 工具
node install.mjs --force     # dsh 升级后重新生成
```

## 它改了什么

- 当前 profile 的 `cordis.patch.yml` 里一段带标记的块，首次安装留 `.bak`。
- 块里三件事：加 `web-tinyfish` provider 行；把 `web` 行指向它（`searchProvider` / `fetchProvider:
  tinyfish`）；挂 TinyFish MCP。**不动** 任何 shipped preset，所以切 preset 也还是官方工具（走 TinyFish）。
- key 在 `$DSH_HOME/tinyfish.key`（mode 600），YAML 里只有运行时读取它的 `!!js` 表达式。

## 失败排查

- `could not find the dsh installation` —— 前缀 `DSH_INSTALL=/opt/dsh`（dsh-go 的位置）。
- 装错 profile —— `--profile <名字>`；默认跟 `$DSH_PROFILE`。
- 新会话里工具还在但报 `WEB_PROVIDER_UNAVAILABLE` —— 没找到 key 文件，`ls -l $DSH_HOME/tinyfish.key`。
- TinyFish 拒绝（401/403）—— key 失效，重新生成后 `node install.mjs --key 新key --force`。

要求 dsh ≥ 0.2，不装任何依赖，MCP 客户端是 dsh 自带的。

---

MIT
