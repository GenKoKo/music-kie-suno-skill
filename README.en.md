# music-kie-suno-skill

![Version](https://img.shields.io/badge/version-0.5.2-blue) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js) ![API](https://img.shields.io/badge/API-KIE.AI%20Suno-orange) ![Model](https://img.shields.io/badge/model-V6%20family-6aa84f)
![OS](https://img.shields.io/badge/OS-macOS%20%7C%20Windows-informational) ![Agents](https://img.shields.io/badge/agents-Claude%20Code%20%7C%20ChatGPT%20%7C%20pi-purple) ![License](https://img.shields.io/badge/license-MIT-green)

**言語 / Language**: [日本語](README.md)｜English (this page)

> **Supported models: the V6 family only** (default V6; V6_MINI / V6_WILD selectable). Older versions (V3_5–V5_5) are discontinued upstream and not supported.

Batch-generate AI music through the KIE.AI Suno API. Designed so that **non-engineers can reach their first track** just by following this README — the actual generation is performed by your AI agent (Claude Code / ChatGPT / pi, etc.).

Common questions (commercial use, billing, troubleshooting) are collected in [FAQ.md](FAQ.md) (Japanese).

🎬 **Explainer slides**: [open in your browser](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — 16 pages walking through the whole skill (details in the explainer-slides section below).

## Agent quick start (this section is for the AI agent)

If you are an AI agent (Claude Code / ChatGPT / pi, etc.) whose user just asked to "create songs with Suno", follow this section in order. The user is typically a non-engineer: run every terminal step yourself and only ask them for decisions (approval, billing).

1. **Detect the runtime environment.** Check for Node.js with `node --version`. **If Node.js is present, skip this step silently** — do not bring up installation. `npx` ships with Node.js, so without Node neither the install nor the skill can run. If missing, detect the user's OS and install it: macOS → `brew install node` if Homebrew exists; otherwise have the user run the one-line official .pkg command from Step 3 in their own Terminal (`sudo` needs their password, so your shell cannot run it); Windows (PowerShell) → `winget install OpenJS.NodeJS.LTS`. If the user prefers downloading from the website, point them to the official LTS installer at nodejs.org/en/download matching their OS and CPU (macOS: universal .pkg for Apple Silicon and Intel; Windows: x64 .msi). Then re-check.
2. **Install the skill.** Run `npx skills add GenKoKo/music-kie-suno-skill` yourself (do not ask the user to). It installs into `./.agents/skills/music-kie-suno/` relative to your current directory (skills.sh default).
3. **Run the preflight.** From `.agents/skills/music-kie-suno/` run `node scripts/suno.js credit`. It doubles as a balance report, a service health check, and an update notice (if it prints `UPDATE AVAILABLE`, it also prints a "What is new" changelog digest — relay it, explain the changes, and let the user decide whether to update via `npx skills add GenKoKo/music-kie-suno-skill`). Relay the output to the user. If it prints the setup guide, relay it verbatim and follow it.
4. **Onboard a first-time user.** If they have no account or API key, walk them through Onboarding Steps 1–2 below (registration link defaults to the Japanese locale: `https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8`). Then set the key for them after detecting their OS and shell: macOS / Linux → persistent `export` in `~/.zshrc` (or the user's rc); Windows → `setx` (persistent) or `$env:` (current session only). If the user pastes the key in chat, never echo it back; mention once that it transited chat and can be regenerated at https://kie.ai/ja/api-key.
5. **Generate.** On a natural-language request (e.g. "create 2 BGM tracks with Suno"): check the balance → propose a generation plan → get the user's explicit approval (nothing is spent before approval) → run the batch → report progress and deliver the files. If the user speaks in track counts, convert to a request count before planning — **1 request = exactly 2 tracks** (two versions of the same plan entry), e.g. "3 tracks" → 2 requests = 4 tracks — and confirm the conversion with the user. The full operational contract lives in `SKILL.md` — read it before your first generation.

Everything below is written for the human user (especially non-engineers). Read on if you want the details.

## Explainer slides

![Explainer slides cover](docs/slides/p01.png)

🎬 **All 16 pages**: [open on GitHub Pages](https://genkoko.github.io/music-kie-suno-skill/s/music-skill-deep-dive) — the generation flow, V6 family comparison, and safety design, explained page by page.

## Install

```bash
npx skills add GenKoKo/music-kie-suno-skill
```

GitHub: **https://github.com/GenKoKo/music-kie-suno-skill**

After installing, run the commands (credit / generate / status) from that install folder (`.agents/skills/music-kie-suno/`). From anywhere else, point at the script explicitly (`node <install-dir>/scripts/suno.js …`).

Works with skill-aware agents (Claude Code / ChatGPT / pi). If a newer version is published, the first balance check reports it automatically. No post-install setup — on first invocation the agent starts with a balance check, and if you have no account or key yet, it walks you through the Onboarding below first.

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
# macOS (with Homebrew)
brew install node
```

```bash
# macOS (one line, no Homebrew needed: official .pkg)
# You will be prompted for your Mac password (nothing shows while typing). Paste into Terminal and run
cd /tmp && curl -fsSL https://nodejs.org/dist/latest-v24.x/ | grep -o 'node-v[0-9.]*\.pkg' | head -1 | xargs -I{} curl -fsSL -o node.pkg "https://nodejs.org/dist/latest-v24.x/{}" && sudo installer -pkg node.pkg -target /
```

**Prefer downloading from the website?** Open https://nodejs.org/en/download and pick the LTS build: on macOS choose **macOS Installer (.pkg)** (universal — Apple Silicon and Intel); on Windows choose **Windows Installer (.msi)** (x64). Not sure which file? Ask the agent — it detects your OS and CPU for you.

```bash
# Windows (PowerShell)
winget install OpenJS.NodeJS.LTS
```

> 🔐 **The only password moment is installing Node.js itself** (macOS installer run / Windows UAC prompt). Setting the API key and generating music need no password.

There are two ways to set the API key — compare them and pick the one that suits you:

| Method              | Effort                          | Best for                                            | Note                                                                     |
| ------------------- | ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Let the agent do it | Minimal (paste + "set this up") | Quick starters; anyone unfamiliar with terminals    | The key travels through chat (regenerating the key later invalidates it) |
| Manual setup        | One command you run yourself    | Anyone who prefers not to send the key through chat | You must pick the command matching your OS and shell                     |

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
- Each request takes ~3–4 minutes (V6, 360 s tracks: observed 171–215 s, 2026-09-12 — longer than the old V5_5)
- Every request produces 2 tracks — keep the one you like
- Finished mp3 files land in the `output_music_kie_suno/<date>/` folder; the agent tells you where
- Generated audio is kept on the platform for only **~14 days**, then deleted. The local files in your output folder are the only permanent copy — back up tracks you care about (retention policy: always defer to the official pages)
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
4. Report a progress table every minute (~3–4 min per request)
5. Deliver the audio files and a report

## Phrase cheat sheet (copy & paste)

| Goal                | Phrase                                                      |
| ------------------- | ----------------------------------------------------------- |
| First track         | Generate a 6-minute study BGM track with Suno               |
| Specific mood       | 3 calm late-night piano jazz BGM tracks                     |
| Favorite instrument | 5 acoustic guitar folk tracks, instrumental                 |
| Japanese vocals     | One song with Japanese lyrics about the start of a journey  |
| Experimental        | 5 more tracks, same mood but more experimental arrangements |
| Bulk                | 10 study BGM tracks, mood up to you                         |

> Requested lengths are honored on V6 (the default); V6_MINI may ignore them.

As long as the scene, mood, and track count come across, you are set. Vague is fine — the agent narrows it down with three questions (scene / mood / instruments & tempo). When you are unsure, it offers 3–5 labeled options (a/b/c/... lowercase, though case does not matter) so a one-letter answer is enough — "same style as last time" is one of them, then proposes a plan and waits for your approval. Count, length, and estimated credits are always confirmed before anything runs.

## Direct commands

The commands below assume you are inside the install folder (`.agents/skills/music-kie-suno/`). From anywhere else, pass the full path (`node <install-dir>/scripts/suno.js …`).

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

- Output: `<project>/output_music_kie_suno/<YYMMDD>/` inside a project, otherwise `~/Documents/output_music_kie_suno/<YYMMDD>/`
- The output folder is chosen on first use; the above is the default. To change it, just tell the agent "save tracks to X" (stored in the `OUTPUT_DIR_MUSIC_KIE_SUNO` environment variable; unset it to reset)
- The default model is **V6** (chosen by listening test). More variation is tuned via style weights — just ask for something more experimental. `V6_WILD` is not recommended (grainy sound) and `V6_MINI` is faster/lighter but may ignore the requested length.
- Filename: `suno-<model>-<YYMMDD>-<HHMMSS>-<seq>-<trackname>.mp3` (e.g. track 1 `suno-V6-260910-164913-001-Quiet_Hours_A1.mp3`; track 2 gets its own composed name, e.g. `suno-V6-260910-164913-002-Quiet_Hours_A2.mp3` — without one it falls back to a `_v2` suffix)
- Each request produces 2 tracks; both are downloaded automatically
- Usage statistics accumulate in `log.jsonl`

## Cost reference

~12 credits per request (measured 2026-09, reference value; V6 family same price — operator-verified). Failed requests consume no credits (operational experience as of 2026-09-11). The balance and total estimate are always confirmed before generation starts.

## Commercial use (YouTube uploads etc.)

Official sources:

- KIE.AI Terms of Use: https://kie.ai/terms-of-use — general terms; as of 2026-09-11 it contains no explicit generated-music rights clause.
- Suno licensing policy (the generation engine): https://suno.com/help/licensing — paid tiers grant full commercial rights ("Songs you create as a paid Suno subscriber are yours..."); the free tier is non-commercial only.

If you need a definitive commercial assurance for high-stakes use, confirm with KIE.AI support before publishing.

## Security

This skill is built with the following safety principles:

- **Fully open code (MIT License)** — everything is public and auditable. The script runs on Node.js standard features only, with almost no third-party dependencies
- **Your API key lives in an environment variable only** — it is never embedded in code, and never written into plans, reports, or status files. Even the agent-assisted setup never echoes the key back to you
- **Bundled self-audit script** — `scripts/self-audit.sh` automatically checks for hardcoded keys, connections to non-allowlisted URLs, and unsafe patterns
- **No spend before approval** — generation never starts without a balance + estimate check, and failed requests are not charged

For the rights of generated music, see the commercial-use section above and [FAQ.md](FAQ.md).

## Author / feedback

**Ko @ AIxBGM自動販売機**

GitHub: **https://github.com/GenKoKo** — bug reports, improvement ideas, and feature requests are all welcome. Tell me what confused you or what you wished this skill could do.
