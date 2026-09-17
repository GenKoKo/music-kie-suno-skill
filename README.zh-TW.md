# music-kie-suno-skill

![Version](https://img.shields.io/badge/version-0.5.8-blue) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js) ![API](https://img.shields.io/badge/API-KIE.AI%20Suno-orange) ![Model](https://img.shields.io/badge/model-V6%20family-6aa84f)
![OS](https://img.shields.io/badge/OS-macOS%20%7C%20Windows-informational) ![Agents](https://img.shields.io/badge/agents-Claude%20Code%20%7C%20ChatGPT%20%7C%20pi-purple) ![License](https://img.shields.io/badge/license-MIT-green)

**語言 / Language**: [日本語](README.md)｜[English](README.en.md)｜繁體中文（本頁）｜[简体中文](README.zh-CN.md)

> **支援模型：僅 V6 系列**（預設為 V6，亦可選用 V6_MINI／V6_WILD）。舊版模型（V3_5～V5_5）已因 KIE.AI 終止提供而不再支援。

這是一個使用 KIE.AI 的 Suno API 批次生成 AI 樂曲的 agent skill。設計目標是**讓非工程背景的使用者也能照著步驟完成第一首歌**。生成本身由 AI agent（Claude Code / ChatGPT / pi 等）執行，人類要做的只有建立帳號與初始設定。

常見問題（商用授權、計費、疑難排解等）整理在 **[FAQ.md](FAQ.md)**。

🎬 **說明簡報**: [在瀏覽器開啟](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — 共 16 頁，完整解說 skill 的整體樣貌（詳見下方「說明簡報」章節）。

## 給 AI Agent 的快速開始（AI agent 請讀這節）

如果你是 AI agent（Claude Code / ChatGPT / pi 等），收到「用 Suno 做曲」這類請求時，請依照本節執行。使用者的第一句話如果是「安裝這個 skill 的 GitHub URL，並帶我跑 KIE.AI 的 onboarding」，請先用 `npx skills add GenKoKo/music-kie-suno-skill` 安裝，再進入本節的 preflight → onboarding。使用者多半不是工程師，終端機操作全部由 agent 執行，只請使用者做決策（核准、付費）。

1. **偵測執行環境**：以 `node --version` 確認 Node.js 是否存在。**已有 Node.js 時，靜默跳過這一步**（不要主動提起安裝話題）。`npx` 隨 Node.js 附帶，沒有 Node 就無法安裝、也無法執行 skill。未安裝時，判斷使用者的 OS 後安裝：macOS → 有 Homebrew 就 `brew install node`，沒有就請使用者在自己的終端機執行下方 Step 3 的一行指令（官方 .pkg；需要輸入 `sudo` 密碼，agent 自己的 shell 無法代跑）；Windows（PowerShell）→ `winget install OpenJS.NodeJS.LTS`。想從官網取得的話，指引符合使用者 OS・CPU 的官方安裝程式（macOS：.pkg 通用版／Windows：x64 的 .msi。https://nodejs.org/en/download ）。安裝後再次確認。
2. **安裝 skill**：由 agent 自己執行 `npx skills add GenKoKo/music-kie-suno-skill`（不要叫使用者跑）。安裝位置為當前目錄的 `.agents/skills/music-kie-suno/`（skills.sh 預設行為）
3. **Preflight**：在 `.agents/skills/music-kie-suno/` 執行 `node scripts/suno.js credit`。兼具餘額顯示、服務存活確認、更新通知（出現 `UPDATE AVAILABLE` 時會一併顯示 What is new 變更摘要 — 由 agent 說明內容，使用者判斷後以 `npx skills add GenKoKo/music-kie-suno-skill` 更新）。輸出請原樣轉達給使用者。若顯示 setup guide，請原句轉述並照著引導。
4. **首次使用者的 onboarding**：帳號・API key 未設定時，引導使用者走下方 Onboarding Step 1–2（註冊連結預設使用日文 locale `https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8`）。key 的設定由 agent 判斷 OS 與 shell 後代辦：macOS / Linux → 恆久 `export` 寫入 `~/.zshrc` 等；Windows → `setx`（恆久）或 `$env:`（僅當前 session）。使用者把 key 貼進聊天時，回覆中不得顯示 key，並一次性告知 key 曾經過聊天（之後在 https://kie.ai/ja/api-key 重建 key 即可使其失效）。
5. **生成**：收到自然語言請求（例：「用 Suno 做 2 曲 BGM」）後，依 餘額確認 → 提出生成計畫 → 使用者明確核准（核准前不消耗任何 credits）→ 批次生成 → 進度回報與檔案保存 的順序進行。使用者以曲數指定時，**1 個請求＝2 曲**（同一計畫的兩個版本），請先換算成請求數（例：「3 曲」→ 2 個請求＝4 曲），並務必在建立計畫前確認。完整操作契約在 `SKILL.md`，首次生成前務必閱讀。

# 以下為給人類（特別是非工程師使用者）的說明，有興趣再讀。

## 說明簡報

![說明簡報 封面](docs/slides/p01.png)

🎬 **共 16 頁**: [在 GitHub Pages 開啟](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — 依序解說生成流程、V6 比較與安全設計。

## 安裝

```bash
npx skills add GenKoKo/music-kie-suno-skill
```

GitHub: **https://github.com/GenKoKo/music-kie-suno-skill**

安裝後的各指令（credit / generate / status）請移動到安裝資料夾（`.agents/skills/music-kie-suno/`）執行。從其他資料夾執行時，需以完整路徑指定腳本（`node <安裝位置>/scripts/suno.js …`）。

可在 Claude / ChatGPT / pi 等支援 skills 的 agent 上運作。有新版本公開時，會在首次餘額確認時自動通知。安裝後無需任何設定。首次呼叫時 agent 會從餘額確認開始；帳號未註冊、key 未設定時，會先引導你完成本 README 的 Onboarding。

## 給第一次使用的人（Onboarding）

> 💡 **語言切換**：開啟 **https://kie.ai/ja** 即為日文介面（未登入也可以）。可從登陸頁右上角圖示，或登入後左側選單最下方的「日本語」按鈕切換（English / 日本語）。不過包含文件在內，許多內容仍以英文為主。

### Step 1 — 註冊帳號

1. 從以下連結進入 KIE.AI 並註冊：**https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8**
2. 不需設定密碼。**直接以 Google 或 Microsoft 帳號註冊・登入（SSO）**即可（Email＋密碼表單是給既有帳號登入用的）。任一方式登入即完成註冊。

> **關於推薦連結**：以上是作者（Ko @ AIxBGM自動販売機）的推薦連結。透過此連結註冊，且**首月有付費**時，作者才會獲得少額 commission。不使用此連結，服務的功能與收費也完全相同。

### Step 2 — 取得 API key（不需綁卡）

1. 登入狀態下開啟 **https://kie.ai/ja/api-key**（日文介面的選單名稱為「**APIキー**」）。
2. 帳號建立後，「Default」API key 立即存在。**該行顯示的就是 key 本體**，一鍵即可複製，直接複製即可（「新しいキーを作成」為選用：僅在需要多把 key 或 IP 限制時使用）。
3. key **絕對不要讓他人看到**。它就是你錢包的鑰匙。Step 3 會用到。

### Step 3 — Node.js 與 key 的設定

沒有 Node.js 時先安裝：

```bash
# macOS（有 Homebrew 的情況）
brew install node
```

```bash
# macOS（沒有 Homebrew 也一行搞定：下載官方 .pkg 安裝）
# 執行時會要求輸入 Mac 密碼（輸入中不顯示）。請貼到終端機執行
cd /tmp && curl -fsSL https://nodejs.org/dist/latest-v24.x/ | grep -o 'node-v[0-9.]*\.pkg' | head -1 | xargs -I{} curl -fsSL -o node.pkg "https://nodejs.org/dist/latest-v24.x/{}" && sudo installer -pkg node.pkg -target /
```

**想從官網取得的情況**：到 https://nodejs.org/en/download 的 LTS，macOS 選「**macOS Installer (.pkg)**」（Apple Silicon / Intel 通用的 universal 版）、Windows 選「**Windows Installer (.msi)**」（x64）下載執行。不知道怎麼選時，agent 會判斷你的 OS 與 CPU 後告訴你。

```bash
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
```

> 🔐 **需要輸入密碼的只有這個 Node.js 安裝**（macOS 安裝程式執行、Windows UAC 確認）。設定 API key 與音樂生成都不需要密碼。

API key 的設定有「交給 Agent 代辦」與「手動設定」兩種。比較特色後，選適合自己的：

| 方法 | 工夫 | 適合的人 | 注意點 |
| --- | --- | --- | --- |
| 交給 Agent 代辦 | 最少（貼上後說「幫我設定」即可） | 想馬上試・不熟終端機操作的人 | key 會經過聊天傳遞（之後重建 key 即可使其失效） |
| 手動設定 | 自己執行一行指令 | 不想把 key 交給聊天的人 | 需要選出符合自己 OS・shell 的指令 |

**簡單設定（交給 Agent 代辦）**：把複製的 API key 直接貼給 agent 說「幫我設定」，就會代辦到環境變數設定與餘額確認。agent 會判斷你的 OS・shell，只執行對應的步驟。key 不會顯示在回覆中，也不會存進 shell 設定檔以外的地方。

**手動設定（自己執行指令）**：macOS 開「終端機」App、Windows 開「PowerShell」，執行一行符合自己環境的指令（不知道是哪個時，問 agent「告訴我手動設定的指令」，它會依你的 OS 與 shell 提示一行）：

```bash
# macOS / Linux（追加到 ~/.zshrc 等之後，重啟終端機）
export KIE_AI_API_KEY=剛剛複製的key
```

```bash
# Windows（PowerShell・恆久設定。執行後重啟終端機）
setx KIE_AI_API_KEY 剛剛複製的key
```

```powershell
# Windows（PowerShell・僅當前終端機有效）
$env:KIE_AI_API_KEY = "剛剛複製的key"
```

不想讓 key 經過聊天時，請用手動設定。無論哪種方式，之後都可在 https://kie.ai/ja/api-key 重建 key。

**確認設定**：重開終端機執行 `node scripts/suno.js credit`，有顯示餘額即設定完成（交給 Agent 代辦時，這個確認也會自動執行）。

### Step 4 — 生成第一首歌（有時可先用免費 credits 試）

只要這樣拜託 agent：

> 「用 Suno 做 1 首 6 分鐘的工作用 BGM」

agent 會引導全程：餘額確認 → 提出生成計畫 → 你的核准 → 生成 → 下載。核准前不會消耗任何 credits。

**推薦的比較玩法（2 模式）**：除了 Instrumental，也試著生成 1 個有 vocal 的版本（例：「同樣氛圍，加上日文歌詞的歌也來 1 首」）。2 個請求＝4 曲・約 24 credits，一次確認有無歌詞的差異與 AI vocal 的質感。歌詞由 agent 提案（從想聆聽的人與場景組織主題）。

**有時可先免費試用**：新用戶測試用 80 免費 credits（約 6 請求＝12 曲份）是官方 FAQ 的**主張**，以實際發放情況為優先（2026-09-11 時點・發放條件可能變更）。有發放的話，此刻不需付費即可試用。沒有的話，先在 Step 5 儲值。

首次的流程與時程：

- 核准後生成開始，進度約每 1 分鐘以表格回報
- 每個請求約需 3〜4 分鐘（V6・360 秒曲實測：171〜215 秒，2026-09-12。比舊 V5_5 略長）
- 1 個請求會完成 2 曲，喜歡哪首就用哪首
- 完成的 mp3 會存到 `output_music_kie_suno/<日期>/` 資料夾，位置會被告知
- 平台上的生成音源**約 14 天**會被刪除。存在本機的檔案是唯一的永久副本。需要的曲請及早備份（保存期限以最新官方資訊為優先）
- 不滿意時可用「再來一次」重新生成（每請求約 12 credits）

### Step 5 — 綁卡與儲值（需要時再進行）

免費 credits 用完後，或出現餘額不足提示時進行：

1. 登入後，開啟 dashboard 的 **Billing / Top-up** 頁面（日文介面的選單名稱為「**請求情報**」）。
2. 綁定信用卡（**Apple Pay** 也可以使用。卡號不會被對方得知，比較安心）。
3. 儲值 credits。儲值價格參考（**2026-09-11 時點**・細節一律以官方 Billing 頁面標示為優先）：

   - **$5 = 1,000 credits**
   - **$50 = 10,000 credits**
   - **$500 以上**的儲值會附贈優惠的 bonus credits

   消耗參考：**1 請求 = 約 12 credits**。credits 沒有有效期限（最新條款以官方 Billing 頁面標示為優先）。

## 用法（一般流程）

像「用 Suno 生成 3 首工作用 BGM」「用更實驗性的音色做 5 首」這樣自然地拜託，agent 會：

1. 確認 credits 餘額
2. 建立並提示生成計畫 `plan.md`（曲數・風格・預估 credits・目前餘額）
3. 核准後開始批次生成
4. 每 1 分鐘回報進度表（每請求約 3〜4 分鐘）
5. 完成後，告知樂曲檔案與報告

## 呼叫語句集（可直接複製）

| 目的 | 語句 |
| --- | --- |
| 第一首 | 用 Suno 做 1 首 6 分鐘的工作用 BGM |
| 比較生成（推薦） | 同樣風格，有 vocal 與無 vocal 各生成 1 首來比較 |
| 指定氛圍 | 3 首沉穩的深夜鋼琴爵士 BGM |
| 指定喜歡的樂器 | 5 首木吉他民謠風，不要 vocal |
| 日文 vocal 曲 | 用日文歌詞，做 1 首旅程開場的歌 |
| 實驗性 | 同樣氛圍但更實驗性的編曲，5 首 |
| 一次多首 | 10 首讀書用 BGM，氛圍交給你 |

> ※ 曲長的指定在 V6（預設）會反映。V6_MINI 有時會忽略長度。

只要傳達「想做的場景」「氛圍」「曲數」就可以。模糊的請求也沒關係 — agent 會以三個問題（場景／心情／樂器與節奏）收斂。猶豫時會提示 a〜e 的選項，回答一個字母也可以（大寫也可以）。也可以選「跟上次同樣風格」。agent 會提示生成計畫並等待核准。曲數・長度・預估 credits 一定會在核准前確認。

## 直接執行（指令）

以下指令預設在安裝資料夾（`.agents/skills/music-kie-suno/`）執行。從其他資料夾執行時，請以完整路徑指定，如 `node <安裝位置>/scripts/suno.js …`。

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

## 輸出與命名規則

- 輸出位置：專案內為 `<專案>/output_music_kie_suno/<YYMMDD>/`、專案外為 `~/Documents/output_music_kie_suno/<YYMMDD>/`
- 保存位置首次可選。要變更時，跟 agent 說「把保存位置改成 ○○」即可設定（保存在環境變數 `OUTPUT_DIR_MUSIC_KIE_SUNO`。解除即回到預設）
- 預設模型為 **V6**（經試聽比較選定）。變化度以風格權重調整（說「更實驗性一點」即可）。`V6_WILD` 噪訊感明顯不建議使用、`V6_MINI` 輕量但可能忽略指定長度。
- 檔名：`suno-<model>-<YYMMDD>-<HHMMSS>-<連番>-<曲名>.mp3`（例：第 1 曲 `suno-V6-260910-164913-001-Quiet_Hours_A1.mp3`。第 2 曲以 agent 命名的別題保存（例：`...-002-Quiet_Hours_A2.mp3`）。沒有別題時會加 `_v2` 尾碼）
- 每個請求生成 2 曲，兩首都會下載
- 統計累積在 `log.jsonl`

## 收費參考

1 請求 = 約 12 credits（2026-09 時點的實測參考值。V6 系列同額 — 已由維運者驗證）。失敗的請求不消耗 credits（2026-09-11 時點的運用實績）。執行前一定確認餘額與總預估，核准後才開始生成。

## 關於商用利用（YouTube 投稿等）

官方來源：

- KIE.AI 服務條款: https://kie.ai/ja/terms-of-use — 已確認全 13 條（2026-09-13 再確認・生效 2025-08-01）。關於生成物（音樂・圖像・影片）的權利或商用可否，**沒有任何**明文規定。條款只處理投稿內容（User Content）的授權條款。需要確切答案時，請直接向 KIE.AI 支援（https://kie.ai/vip-support）確認。
- 生成引擎 Suno 的授權規定: https://suno.com/help/licensing — 付費方案明記可商用（免費方案僅限非商用）。

重要用途需要確切保證時，請在公開前向 KIE.AI 支援確認。

## 關於安全性

本 skill 以下列方針維持安全性：

- **程式碼全面公開（MIT License）** — 運作的一切公開，任何人可審計。幾乎不依賴外部函式庫，是僅用 Node.js 標準功能的最低構成
- **API key 只走環境變數** — key 不會被寫進程式碼，也不會寫進計畫・報告・狀態檔。即使是 agent 代辦設定，也不會把 key 重新顯示在聊天
- **內建自我檢查腳本** — `scripts/self-audit.sh` 會自動檢查是否有 key 直寫、允許清單外的連線目標、危險處理
- **付費只在核准後** — 不會在未確認餘額與預估的情況下開始生成，失敗的請求不收費

生成樂曲的權利，請參考「商用利用」章節與 [FAQ.md](FAQ.md)。

## 作者・回饋

**Ko @ AIxBGM自動販売機**

GitHub: **https://github.com/GenKoKo** — bug 回報、改善建議、功能新增的委託都歡迎到此。使用這個 skill 時遇到什麼困擾、想要什麼，再瑣碎的事都歡迎。