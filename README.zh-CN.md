# music-kie-suno-skill

![Version](https://img.shields.io/badge/version-0.5.8-blue) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js) ![API](https://img.shields.io/badge/API-KIE.AI%20Suno-orange) ![Model](https://img.shields.io/badge/model-V6%20family-6aa84f)
![OS](https://img.shields.io/badge/OS-macOS%20%7C%20Windows-informational) ![Agents](https://img.shields.io/badge/agents-Claude%20Code%20%7C%20ChatGPT%20%7C%20pi-purple) ![License](https://img.shields.io/badge/license-MIT-green)

**语言 / Language**: [日本語](README.md)｜[English](README.en.md)｜[繁體中文](README.zh-TW.md)｜简体中文（本页）

> **支持模型：仅 V6 系列**（默认为 V6，也可选用 V6_MINI／V6_WILD）。旧版模型（V3_5～V5_5）已因 KIE.AI 停止提供而不再支持。

这是一个使用 KIE.AI 的 Suno API 批量生成 AI 乐曲的 agent skill。设计目标是**让非工程背景的用户也能照着步骤完成第一首歌**。生成本身由 AI agent（Claude Code / ChatGPT / pi 等）执行，人要做的只有注册账号和初始设置。

常见问题（商用授权、计费、疑难解答等）整理在 **[FAQ.md](FAQ.md)**。

🎬 **说明幻灯片**: [在浏览器打开](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — 共 16 页，完整讲解 skill 的整体样貌（详见下方「说明幻灯片」章节）。

## 给 AI Agent 的快速开始（AI agent 请读这节）

如果你是 AI agent（Claude Code / ChatGPT / pi 等），收到「用 Suno 做曲」这类请求时，请按照本节执行。用户的第一句话如果是「安装这个 skill 的 GitHub URL，并带我跑 KIE.AI 的 onboarding」，请先用 `npx skills add GenKoKo/music-kie-suno-skill` 安装，再进入本节的 preflight → onboarding。用户多半不是工程师，终端操作全部由 agent 执行，只请用户做决策（批准、付费）。

1. **检测运行环境**：以 `node --version` 确认 Node.js 是否存在。**已有 Node.js 时，静默跳过这一步**（不要主动提起安装话题）。`npx` 随 Node.js 附带，没有 Node 就无法安装、也无法执行 skill。未安装时，判断用户的 OS 后安装：macOS → 有 Homebrew 就 `brew install node`，没有就让用户在自己的终端执行下方 Step 3 的一行命令（官方 .pkg；需要输入 `sudo` 密码，agent 自己的 shell 无法代跑）；Windows（PowerShell）→ `winget install OpenJS.NodeJS.LTS`。想从官网获取的话，指引符合用户 OS・CPU 的官方安装程序（macOS：.pkg 通用版／Windows：x64 的 .msi。https://nodejs.org/en/download ）。安装后再次确认。
2. **安装 skill**：由 agent 自己执行 `npx skills add GenKoKo/music-kie-suno-skill`（不要叫用户跑）。安装位置为当前目录的 `.agents/skills/music-kie-suno/`（skills.sh 默认行为）
3. **Preflight**：在 `.agents/skills/music-kie-suno/` 执行 `node scripts/suno.js credit`。兼具余额显示、服务存活确认、更新通知（出现 `UPDATE AVAILABLE` 时会一并显示 What is new 变更摘要 — 由 agent 说明内容，用户判断后以 `npx skills add GenKoKo/music-kie-suno-skill` 更新）。输出请原样转达给用户。若显示 setup guide，请原句转述并照着引导。
4. **首次用户的 onboarding**：账号・API key 未设置时，引导用户走下方 Onboarding Step 1–2（注册链接默认使用日文 locale `https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8`）。key 的设置由 agent 判断 OS 与 shell 后代办：macOS / Linux → 永久 `export` 写入 `~/.zshrc` 等；Windows → `setx`（永久）或 `$env:`（仅当前 session）。用户把 key 粘贴进聊天时，回复中不得显示 key，并一次性告知 key 曾经过聊天（之后在 https://kie.ai/ja/api-key 重建 key 即可使其失效）。
5. **生成**：收到自然语言请求（例：「用 Suno 做 2 首 BGM」）后，依 余额确认 → 提出生成计划 → 用户明确批准（批准前不消耗任何 credits）→ 批量生成 → 进度回报与文件保存 的顺序进行。用户以曲数指定时，**1 个请求＝2 首**（同一计划的两个版本），请先换算成请求数（例：「3 首」→ 2 个请求＝4 首），并务必在创建计划前确认。完整操作契约在 `SKILL.md`，首次生成前务必阅读。

# 以下为给人类（特别是非工程师用户）的说明，有兴趣再读。

## 说明幻灯片

![说明幻灯片 封面](docs/slides/p01.png)

🎬 **共 16 页**: [在 GitHub Pages 打开](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — 依序讲解生成流程、V6 比较与安全设计。

## 安装

```bash
npx skills add GenKoKo/music-kie-suno-skill
```

GitHub: **https://github.com/GenKoKo/music-kie-suno-skill**

安装后的各命令（credit / generate / status）请移动到安装文件夹（`.agents/skills/music-kie-suno/`）执行。从其他文件夹执行时，需以完整路径指定脚本（`node <安装位置>/scripts/suno.js …`）。

可在 Claude / ChatGPT / pi 等支持 skills 的 agent 上运作。有新版本公开时，会在首次余额确认时自动通知。安装后无需任何设置。首次调用时 agent 会从余额确认开始；账号未注册、key 未设置时，会先引导你完成本 README 的 Onboarding。

## 给第一次使用的人（Onboarding）

> 💡 **语言切换**：打开 **https://kie.ai/ja** 即为日文界面（未登录也可以）。可从落地页右上角图标，或登录后左侧菜单最下方的「日本語」按钮切换（English / 日本語）。不过包含文档在内，许多内容仍以英文为主。

### Step 1 — 注册账号

1. 从以下链接进入 KIE.AI 并注册：**https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8**
2. 不需设置密码。**直接以 Google 或 Microsoft 账号注册・登录（SSO）**即可（Email＋密码表单是给既有账号登录用的）。任一方式登录即完成注册。

> **关于推荐链接**：以上是作者（Ko @ AIxBGM自動販売機）的推荐链接。通过此链接注册，且**首月有付费**时，作者才会获得少额 commission。不使用此链接，服务的功能与收费也完全相同。

### Step 2 — 获取 API key（不需绑卡）

1. 登录状态下打开 **https://kie.ai/ja/api-key**（日文界面的菜单名称为「**APIキー**」）。
2. 账号创建后，「Default」API key 立即存在。**该行显示的就是 key 本体**，一键即可复制，直接复制即可（「新しいキーを作成」为选用：仅在需要多把 key 或 IP 限制时使用）。
3. key **绝对不要让他人看到**。它就是你钱包的钥匙。Step 3 会用到。

### Step 3 — Node.js 与 key 的设置

没有 Node.js 时先安装：

```bash
# macOS（有 Homebrew 的情况）
brew install node
```

```bash
# macOS（没有 Homebrew 也一行搞定：下载官方 .pkg 安装）
# 执行时会要求输入 Mac 密码（输入中不显示）。请粘贴到终端执行
cd /tmp && curl -fsSL https://nodejs.org/dist/latest-v24.x/ | grep -o 'node-v[0-9.]*\.pkg' | head -1 | xargs -I{} curl -fsSL -o node.pkg "https://nodejs.org/dist/latest-v24.x/{}" && sudo installer -pkg node.pkg -target /
```

**想从官网获取的情况**：到 https://nodejs.org/en/download 的 LTS，macOS 选「**macOS Installer (.pkg)**」（Apple Silicon / Intel 通用的 universal 版）、Windows 选「**Windows Installer (.msi)**」（x64）下载执行。不知道怎么选时，agent 会判断你的 OS 与 CPU 后告诉你。

```bash
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
```

> 🔐 **需要输入密码的只有这个 Node.js 安装**（macOS 安装程序执行、Windows UAC 确认）。设置 API key 与音乐生成都不需要密码。

API key 的设置有「交给 Agent 代办」与「手动设置」两种。比较特色后，选适合自己的：

| 方法 | 花费 | 适合的人 | 注意点 |
| --- | --- | --- | --- |
| 交给 Agent 代办 | 最少（粘贴后说「帮我设置」即可） | 想马上试・不熟终端操作的人 | key 会经过聊天传递（之后重建 key 即可使其失效） |
| 手动设置 | 自己执行一行命令 | 不想把 key 交给聊天的人 | 需要选出符合自己 OS・shell 的命令 |

**简单设置（交给 Agent 代办）**：把复制的 API key 直接贴给 agent 说「帮我设置」，就会代办到环境变量设置与余额确认。agent 会判断你的 OS・shell，只执行对应的步骤。key 不会显示在回复中，也不会存进 shell 设置文件以外的地方。

**手动设置（自己执行命令）**：macOS 开「终端」App、Windows 开「PowerShell」，执行一行符合自己环境的命令（不知道是哪个时，问 agent「告诉我手动设置的命令」，它会依你的 OS 与 shell 提示一行）：

```bash
# macOS / Linux（追加到 ~/.zshrc 等之后，重启终端）
export KIE_AI_API_KEY=刚刚复制的key
```

```bash
# Windows（PowerShell・永久设置。执行后重启终端）
setx KIE_AI_API_KEY 刚刚复制的key
```

```powershell
# Windows（PowerShell・仅当前终端有效）
$env:KIE_AI_API_KEY = "刚刚复制的key"
```

不想让 key 经过聊天时，请用手动设置。无论哪种方式，之后都可在 https://kie.ai/ja/api-key 重建 key。

**确认设置**：重开终端执行 `node scripts/suno.js credit`，有显示余额即设置完成（交给 Agent 代办时，这个确认也会自动执行）。

### Step 4 — 生成第一首歌（有时可先用免费 credits 试）

只要这样拜托 agent：

> 「用 Suno 做 1 首 6 分钟的工作用 BGM」

agent 会引导全程：余额确认 → 提出生成计划 → 你的批准 → 生成 → 下载。批准前不会消耗任何 credits。

**推荐的比较玩法（2 模式）**：除了 Instrumental，也试着生成 1 个有 vocal 的版本（例：「同样氛围，加上日文歌词的歌也来 1 首」）。2 个请求＝4 首・约 24 credits，一次确认有无歌词的差异与 AI vocal 的质感。歌词由 agent 提案（从想聆听的人与场景组织主题）。

**有时可先免费试用**：新用户测试用 80 免费 credits（约 6 请求＝12 首份）是官方 FAQ 的**主张**，以实际发放情况为优先（2026-09-11 时点・发放条件可能变更）。有发放的话，此刻不需付费即可试用。没有的话，先在 Step 5 充值。

首次的流程与时间参考：

- 批准后生成开始，进度约每 1 分钟以表格回报
- 每个请求约需 3〜4 分钟（V6・360 秒曲实测：171〜215 秒，2026-09-12。比旧 V5_5 略长）
- 1 个请求会完成 2 首，喜欢哪首就用哪首
- 完成的 mp3 会存到 `output_music_kie_suno/<日期>/` 文件夹，位置会被告知
- 平台上的生成音频**约 14 天**会被删除。存在本地的文件是唯一的永久副本。需要的曲请及早备份（保存期限以最新官方信息为优先）
- 不满意时可用「再来一次」重新生成（每请求约 12 credits）

### Step 5 — 绑卡与充值（需要时再进行）

免费 credits 用完后，或出现余额不足提示时进行：

1. 登录后，打开 dashboard 的 **Billing / Top-up** 页面（日文界面的菜单名称为「**請求情報**」）。
2. 绑定信用卡（**Apple Pay** 也可以使用。卡号不会被对方得知，比较安心）。
3. 充值 credits。充值价格参考（**2026-09-11 时点**・细节一律以官方 Billing 页面标示为优先）：

   - **$5 = 1,000 credits**
   - **$50 = 10,000 credits**
   - **$500 以上**的充值会附赠优惠的 bonus credits

   消耗参考：**1 请求 = 约 12 credits**。credits 没有有效期限（最新条款以官方 Billing 页面标示为优先）。

## 用法（一般流程）

像「用 Suno 生成 3 首工作用 BGM」「用更实验性的音色做 5 首」这样自然地拜托，agent 会：

1. 确认 credits 余额
2. 创建并提示生成计划 `plan.md`（曲数・风格・预估 credits・目前余额）
3. 批准后开始批量生成
4. 每 1 分钟回报进度表（每请求约 3〜4 分钟）
5. 完成后，告知乐曲文件与报告

## 调用语句集（可直接复制）

| 目的 | 语句 |
| --- | --- |
| 第一首 | 用 Suno 做 1 首 6 分钟的工作用 BGM |
| 比较生成（推荐） | 同样风格，有 vocal 与无 vocal 各生成 1 首来比较 |
| 指定氛围 | 3 首沉稳的深夜钢琴爵士 BGM |
| 指定喜欢的乐器 | 5 首木吉他民谣风，不要 vocal |
| 日文 vocal 曲 | 用日文歌词，做 1 首旅程开场的歌 |
| 实验性 | 同样氛围但更实验性的编曲，5 首 |
| 一次多首 | 10 首读书用 BGM，氛围交给你 |

> ※ 曲长的指定在 V6（默认）会反映。V6_MINI 有时会忽略长度。

只要传达「想做的场景」「氛围」「曲数」就可以。模糊的请求也没关系 — agent 会以三个问题（场景／心情／乐器与节奏）收敛。犹豫时会提示 a〜e 的选项，回答一个字母也可以（大写也可以）。也可以选「跟上次同样风格」。agent 会提示生成计划并等待批准。曲数・长度・预估 credits 一定会在批准前确认。

## 直接执行（命令）

以下命令默认在安装文件夹（`.agents/skills/music-kie-suno/`）执行。从其他文件夹执行时，请以完整路径指定，如 `node <安装位置>/scripts/suno.js …`。

```bash
node scripts/suno.js credit
```

```bash
node scripts/suno.js generate --plan plan-xxxx.md
```

```bash
node scripts/suno.js generate --plan plan-xxxx.md --yes --bg
```

```bash
node scripts/suno.js status
```

## 输出与命名规则

- 输出位置：项目内为 `<项目>/output_music_kie_suno/<YYMMDD>/`、项目外为 `~/Documents/output_music_kie_suno/<YYMMDD>/`
- 保存位置首次可选。要变更时，跟 agent 说「把保存位置改成 ○○」即可设置（保存在环境变量 `OUTPUT_DIR_MUSIC_KIE_SUNO`。解除即回到默认）
- 默认模型为 **V6**（经试听比较选定）。变化度以风格权重调整（说「更实验性一点」即可）。`V6_WILD` 噪声感明显不建议使用、`V6_MINI` 轻量但可能忽略指定长度。
- 文件名：`suno-<model>-<YYMMDD>-<HHMMSS>-<序号>-<曲名>.mp3`（例：第 1 首 `suno-V6-260910-164913-001-Quiet_Hours_A1.mp3`。第 2 首以 agent 命名的别题保存（例：`...-002-Quiet_Hours_A2.mp3`）。没有别题时会加 `_v2` 后缀）
- 每个请求生成 2 首，两首都会下载
- 统计累积在 `log.jsonl`

## 收费参考

1 请求 = 约 12 credits（2026-09 时点的实测参考值。V6 系列同额 — 已由运营者验证）。失败的请求不消耗 credits（2026-09-11 时点的实际使用记录）。执行前一定确认余额与总预估，批准后才开始生成。

## 关于商用利用（YouTube 投稿等）

官方来源：

- KIE.AI 服务条款: https://kie.ai/ja/terms-of-use — 已确认全 13 条（2026-09-13 再确认・生效 2025-08-01）。关于生成物（音乐・图像・视频）的权利或商用可否，**没有任何**明文规定。条款只处理投稿内容（User Content）的授权条款。需要确切答案时，请直接向 KIE.AI 客服（https://kie.ai/vip-support）确认。
- 生成引擎 Suno 的授权规定: https://suno.com/help/licensing — 付费方案明记可商用（免费方案仅限非商用）。

重要用途需要确切保证时，请在公开前向 KIE.AI 客服确认。

## 关于安全性

本 skill 以下列方针维持安全性：

- **代码全面公开（MIT License）** — 运作的一切公开，任何人可审计。几乎不依赖第三方库，是仅用 Node.js 标准功能的最低构成
- **API key 只走环境变量** — key 不会被写进代码，也不会写进计划・报告・状态文件。即使是 agent 代办设置，也不会把 key 重新显示在聊天
- **内置自我检查脚本** — `scripts/self-audit.sh` 会自动检查是否有 key 直写、允许清单外的连线目标、危险处理
- **付费只在批准后** — 不会在未确认余额与预估的情况下开始生成，失败的请求不收费

生成乐曲的权利，请参考「商用利用」章节与 [FAQ.md](FAQ.md)。

## 作者・反馈

**Ko @ AIxBGM自動販売機**

GitHub: **https://github.com/GenKoKo** — bug 回报、改善建议、功能新增的委托都欢迎到此。使用这个 skill 时遇到什么困扰、想要什么，再琐碎的事都欢迎。