# music-kie-suno

> Version 0.4.0

Batch-generate AI music through the KIE.AI Suno API. Designed so that **non-engineers can reach their first track** just by following this README — the actual generation is performed by your AI agent (Claude Code / Codex / pi, etc.).

Common questions (commercial use, billing, troubleshooting) are collected in [FAQ.md](FAQ.md) (Japanese).

## Install

```bash
npx skills add GenKoKo/music-kie-suno
```

GitHub: **https://github.com/GenKoKo/music-kie-suno**

Works with skill-aware agents (Claude Code / Codex / pi). If a newer version is published, the first balance check reports it automatically. No post-install setup — on first invocation the agent starts with a balance check, and if you have no account or key yet, it walks you through the Onboarding below first.

## Getting started (Onboarding)

> 💡 **Language**: open **https://kie.ai/ja** for the Japanese UI (works logged out). You can also switch via the icon at the top-right of the landing page, or after login via the 日本語 button at the bottom of the left sidebar (English / 日本語 / 中文). Note that most docs remain English-first.

### Step 1 — Create an account

1. Sign up at KIE.AI via this link: **https://kie.ai?ref=dd95e71edb49afb16467a8523cbf31d8**
2. No password setup required — register and sign in directly with your **Google or Microsoft account (SSO)** (the email + password form is for logging into existing accounts). Signing in with either completes registration.

> **About the link**: the above is the author's referral link (Ko @ AIxBGM自動販売機). The author receives a small commission **only if you register through it and make a payment in your first month**. Using it or not changes nothing about the service, features, or pricing.

### Step 2 — Get your API key (no card needed)

1. While logged in, open **https://kie.ai/ja/api-key** (shown as 「APIキー」 in the Japanese UI).
2. A **Default** API key already exists right after registration. **The key itself is displayed in its row**, and it can be copied with one click — just copy it (creating a new key is optional, for multiple keys or IP whitelisting).
3. Keep the key private (**never share it** — it is the key to your wallet). You will use it in Step 3.

### Step 3 — Install Node.js and set the key

Install Node.js if you do not have it:

```bash
# macOS
brew install node
```

```bash
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
```

There are two ways to set the API key — compare them and pick the one that suits you:

| Method | Effort | Best for | Note |
|---|---|---|---|
| Let the agent do it | Minimal (paste + "set this up") | Quick starters; anyone unfamiliar with terminals | The key travels through chat (regenerating the key later invalidates it) |
| Manual setup | One command you run yourself | Anyone who prefers not to send the key through chat | You must pick the command matching your OS and shell |

**Easy setup (let the agent do it)**: paste the copied API key into the chat and say "set this up for me" — the agent detects your OS and shell, writes the environment variable, and verifies the balance for you. The key is never echoed in replies and is stored nowhere but your shell config.

**Manual setup (run the command yourself)**: open Terminal (macOS) or PowerShell (Windows) and run the one line matching your environment. Not sure which one? Ask the agent "show me the manual setup command" and it will present the exact line for your OS and shell:

```bash
# macOS / Linux (add to ~/.zshrc, then reopen the terminal)
export KIE_AI_API_KEY=the_key_you_copied
```

```bash
# Windows (PowerShell, persistent — then reopen the terminal)
setx KIE_AI_API_KEY the_key_you_copied
```

```powershell
# Windows (PowerShell, current terminal only)
$env:KIE_AI_API_KEY = "the_key_you_copied"
```

If you prefer not to send the key through chat, choose manual setup. Either way, you can regenerate the key later at https://kie.ai/ja/api-key.

**Verify**: reopen the terminal and run `node scripts/suno.js credit` — if the balance prints, setup is complete (the assisted path does this for you automatically).

### Step 4 — Generate your first track (possibly free)

Just ask your agent:

> "Generate a 6-minute study BGM track with Suno"

The agent walks through balance check → plan proposal → your approval → generation → download. Nothing is spent before your approval.

**You may be able to try it free**: per the official FAQ, new accounts receive 80 free testing credits (~6 requests ≈ 12 tracks) — this is the **official claim**; actual granting prevails (as of 2026-09-11; the policy may change). If granted, you can try it at this point without paying. If not granted, top up first in Step 5.

What the first run looks like:

- After approval, generation starts and progress is reported as a table about once a minute
- Each request takes ~1.5–2 minutes (measured 2026-09: median 91 s)
- Every request produces 2 tracks — keep the one you like
- Finished mp3 files land in the `music_kie_suno/<date>/` folder; the agent tells you where
- Don't like the results? Just ask again (~12 credits per request)

### Step 5 — Bind a card and top up credits (when needed)

After your free credits run out, or when you see the insufficient-balance prompt:

1. After logging in, open the **Billing / Top-up** page on the dashboard (shown as 「請求情報」 in the Japanese UI).
2. Register a credit card (**Apple Pay** is supported — your card number is never shared with the merchant, so you can pay with peace of mind).
3. Charge credits. Pricing guide (**as of 2026-09-11** — always defer to the official Billing page):
   - **$5 = 1,000 credits**
   - **$50 = 10,000 credits**
   - **$500+** top-ups come with bonus credits

   Usage guide: **1 request = ~12 credits**. Credits never expire (always defer to the official Billing page for the latest terms).

## Usage (normal flow)

Ask naturally, e.g. "generate 3 study BGM tracks with Suno" or "5 tracks, more experimental sound". The agent will:

1. Check your credit balance
2. Compose a generation plan (`plan.md`: track count, styles, estimated credits, current balance)
3. Start the batch only after your approval
4. Report a progress table every minute (~1.5–2 min per request)
5. Deliver the audio files and a report

## Phrase cheat sheet (copy & paste)

| Goal | Phrase |
|---|---|
| First track | Generate a 6-minute study BGM track with Suno |
| Specific mood | 3 calm late-night piano jazz BGM tracks |
| Favorite instrument | 5 acoustic guitar folk tracks, instrumental |
| Japanese vocals | One song with Japanese lyrics about the start of a journey |
| Experimental | 5 more tracks, same mood but more experimental arrangements |
| Bulk | 10 study BGM tracks, mood up to you |

As long as the scene, mood, and track count come across, you are set. Vague is fine — the agent narrows it down with three questions (scene / mood / instruments & tempo), then proposes a plan and waits for your approval. Count, length, and estimated credits are always confirmed before anything runs.

## Direct commands

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

## Output and naming

- Output: `<project>/music_kie_suno/<YYMMDD>/` inside a project, otherwise `~/Documents/music_kie_suno/<YYMMDD>/`
- The output folder is chosen on first use; the above is the default. To change it, just tell the agent "save tracks to X" (stored in the `MUSIC_KIE_SUNO_OUT_DIR` environment variable; unset it to reset)
- Filename: `suno-<model>-<length>-<YYMMDD>-<HHMMSS>-<seq>-<title>.mp3` (e.g. `suno-V5_5-6m00s-260910-164913-001-Quiet_Hours_A1.mp3`)
- Each request produces 2 tracks; both are downloaded automatically
- Usage statistics accumulate in `usage.jsonl`

## Cost reference

~12 credits per request (measured 2026-09, reference value). In music-generation mode the cost is uniform per request across models (as of 2026-09-11 — official page takes precedence). Failed requests consume no credits (operational experience as of 2026-09-11). The balance and total estimate are always confirmed before generation starts.

## Commercial use (YouTube uploads etc.)

Official sources:

- KIE.AI Terms of Use: https://kie.ai/terms-of-use — general terms; as of 2026-09-11 it contains no explicit generated-music rights clause.
- Suno licensing policy (the generation engine): https://suno.com/help/licensing — paid tiers grant full commercial rights ("Songs you create as a paid Suno subscriber are yours..."); the free tier is non-commercial only.

If you need a definitive commercial assurance for high-stakes use, confirm with KIE.AI support before publishing.

## Author / feedback

**Ko @ AIxBGM自動販売機**

GitHub: **https://github.com/GenKoKo** — bug reports, improvement ideas, and feature requests are all welcome. Tell me what confused you or what you wished this skill could do.
