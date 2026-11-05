# dsh-tinyfish

**dsh 的 `web_search` / `web_fetch` 原样保留 —— 把 TinyFish 变成它们背后的免费后端。**

[English](README.md) | 中文

![dsh-tinyfish：工具不变，后端免费](assets/hero.png)

- **模型看到的工具一行没变。** 名字、参数 schema、描述、输出渲染全部由 dsh 自带的
  `@deepseek-ai/dsh-tool-web` 提供；本项目只是把 TinyFish 注册到 `ctx.web` 能力缝上。对经过 RL
  训练的模型来说，工具定义和训练时逐字节一致。**不挂任何 MCP**，所以没有 `mcp__*` 前缀，也没有
  需要重新学的 schema。
- **免费。** TinySearch $0/次（30 次/分、500 次/小时），TinyFetch $0/URL（150/分、1,000/天），
  两者都**不扣钱包**，余额为 0 也照跑。DeepSeek 的 Search & Fetch 是**各 $0.75 / 1,000 次请求**。
- **一条命令、可回滚。** 只往当前 profile 的 `cordis.patch.yml` 加一段带标记的块，首次安装留
  `.bak`；key 存 `$DSH_HOME/tinyfish.key`（mode 600），永远不进 YAML。
- **桌面、手机、远程 profile 同一套。** 桌面 `dsh` 和 dsh-go(Android) 用同一个脚本，不装依赖
  （web 工具是 dsh 自带的）。

<details>
<summary><b>让 agent 帮你装</b> —— 复制这段 prompt，填上 key</summary>

```text
把本机 dsh profile 的搜索/抓取后端从 DeepSeek 的付费 Search & Fetch API 换成 TinyFish，但不要改变模型看到的东西：已安装的 @deepseek-ai/dsh-tool-web 必须继续提供 web_search / web_fetch，名字和参数都不动 —— 脚本只是把 TinyFish 注册成 ctx.web 的 provider。按顺序做，任何一步失败就停下。

TinyFish key: sk-tinyfish-xxxx

1. `command -v dsh` 必须输出路径。记下 $DSH_PROFILE 和 $DSH_PROFILE_DIR，那就是要改的 profile，不要换。
2. git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   （没有 git：curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz）
3. cd dsh-tinyfish-mcp && node install.mjs --key sk-tinyfish-xxxx
   如果它说找不到 dsh 安装目录，用 DSH_INSTALL=/opt/dsh 前缀重跑。
4. 原样贴回这三行：provider row mounted / web seam pointed at tinyfish / official web_search/web_fetch enabled。任何一行是 false 就算失败。
5. 运行：dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   （期望 1）
6. 告诉我重启 app 并开新会话；当前会话保持启动时的工具。新会话里 web_search / web_fetch 应该和以前一模一样，但结果来自 TinyFish。

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

## 装完你会看到什么

工具列表一行都没变，这正是重点：

| | 之前 | 之后 |
| --- | --- | --- |
| 模型看到的工具 | `web_search`、`web_fetch` | `web_search`、`web_fetch` —— 名字、schema、描述全同 |
| 谁在发请求 | DeepSeek Search & Fetch API | TinyFish Search & Fetch API |
| 成本 | $0.75 / 1,000 次搜索与抓取 | **$0**（限速、免信用卡） |
| 额外命名空间工具 | — | 无 |

## 原理

`dsh-tool-web` 本身就是「只管工具定义、不管后端」的一层：schema、校验、渲染归它，真正干活的是注册在
`ctx.web` 能力缝上的 provider。

```text
model
  │  web_search / web_fetch          官方工具定义（@deepseek-ai/dsh-tool-web）
  ▼
ctx.web                              provider 选择：searchProvider / fetchProvider
  │
  ├─ search ──► provider "tinyfish" ──► GET  https://api.search.tinyfish.ai?query=…
  └─ fetch  ──► provider "tinyfish" ──► POST https://api.fetch.tinyfish.ai  {"urls":[…]}
```

`provider/index.mjs` 约 150 行纯 ESM、零依赖：读 `$DSH_HOME/tinyfish.key`，把 TinyFish 的响应映射成
能力缝的 `WebSearchResult` / `WebFetchResult`。

## 费用

| 产品 | 价格 | 限额 |
| --- | --- | --- |
| [TinySearch](https://www.tinyfish.ai/pricing) | **$0 / 次** | 30 次/分、500 次/小时（≈ 12,000/天） |
| [TinyFetch](https://www.tinyfish.ai/pricing) | **$0 / URL** | 150/分、1,000/天 |
| [DeepSeek Search](https://api-docs.deepseek.com/quick_start/pricing/) | $0.75 / 1,000 次 | — |
| [DeepSeek Fetch](https://api-docs.deepseek.com/quick_start/pricing/) | $0.75 / 1,000 次 | — |

TinySearch 和 TinyFetch 不碰钱包，余额 0 也能用。TinyFish 的付费产品（TinyAgent $0.016/step、
TinyBrowser $0.002/分、TinyMonitor $0.005/次、Research 超出每日免费次数后）本项目**默认不挂** ——
想要见[付费能力](#付费能力)。

## 检查

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   # 期望 1
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -A2 "id: web$"      # searchProvider: tinyfish
```

脚本会打印 `provider row mounted: true`、`web seam pointed at tinyfish: true`、
`official web_search/web_fetch enabled: true`；任何一行 `false` 就没生效。

## 撤销 / 升级 dsh 后

```bash
node install.mjs --revert    # 恢复官方 web 工具
node install.mjs --force     # dsh 升级后 / 移动仓库后重新生成
```

## 它改了什么

- 当前 profile 的 `cordis.patch.yml` 里一段带标记的块，首次安装留 `.bak`。
- 块里两件事：加 `web-tinyfish` provider 行；把 `web` 行指向它（`searchProvider` /
  `fetchProvider: tinyfish`）。**不改** 任何 shipped preset，所以切 preset 也还是官方工具（走 TinyFish）。
- key 在 `$DSH_HOME/tinyfish.key`（mode 600），YAML 里只有运行时读取它的 `!!js` 表达式。

## 付费能力

TinyFish 免费的就是搜索和抓取 —— 官方工具已经覆盖。浏览器自动化、深研、数据集、监控都要扣钱包；
确实需要的话：

```bash
node install.mjs --key sk-tinyfish-xxxx --with-mcp
```

这会额外挂 TinyFish MCP server，工具名会变成 `mcp__tinyfish__*`（MCP 层按 server 加命名空间，
改不了）。`--force` 不加 `--with-mcp` 就会把它去掉。

## 不适合你的情况

- 你需要 TinyFish 的高级抓取参数（`format`、CSS selector、一次 10 个 URL）或搜索参数（`domain_type`、
  `location`、`language`、时间范围）。官方 `web_fetch` / `web_search` 的 schema 是固定的 —— 这正是模型
  熟悉它的原因。用 `--with-mcp` 拿原始工具。
- 你想在同一个会话里跑浏览器自动化或深研 —— 也是 `--with-mcp`，而且要花钱。

## 排错

- `could not find the dsh installation` —— 前缀 `DSH_INSTALL=/opt/dsh`（dsh-go 的位置）。
- 装错 profile —— `--profile <名字>`；默认跟 `$DSH_PROFILE`。
- 新会话里报 `WEB_PROVIDER_UNAVAILABLE` —— key 文件不在：`ls -l $DSH_HOME/tinyfish.key`，检查权限和内容。
- TinyFish 返回 401/403 —— key 失效，重新生成后 `node install.mjs --key sk-tinyfish-新key --force`。
- 新会话里工具还没出现 —— 要重启 dsh 进程，不是只刷新页面。

要求 dsh ≥ 0.2，不安装任何依赖。

## v1.1 变更

v1.0 删掉 `tool-web`、换成 TinyFish MCP 工具，模型看到的是 `mcp__tinyfish__*`。v1.1 保留官方
`web_search` / `web_fetch`，把 TinyFish 放到它们背后。已经装过 v1.0 的原地升级：

```bash
node install.mjs --force    # 去掉旧 MCP-only 块，保留 key
```

---

MIT
