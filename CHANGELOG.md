# Changelog

All notable changes to this skill are documented here.

## 0.4.0 — 2026-09-11 (unreleased; supersedes the draft 0.3.1 — the changeset outgrew a patch bump)

- Onboarding walkthrough feedback:
  - Registration needs no password — register/sign in directly with Google or Microsoft SSO
  - Top-up pricing table with date: $5 = 1,000 credits / $50 = 10,000 credits / $500+ comes with bonus credits (official Billing page always takes precedence)
  - Japanese UI menu names noted (Billing / Top-up → 「請求情報」, API key → 「APIキー」)
  - Step 3 now states the API key body is shown in the Default row with one-click copy
  - Step 2: noted Apple Pay support (card number is not disclosed to the merchant)
  - Step 2: stated credits never expire, deferring to the official Billing page for the latest terms
  - suno.js: client-side submit pacing — sliding window capped at 20 requests / 10 s (official account limit); large plans batch automatically instead of firing all requests at once. Credit pre-check (abort before any spend when balance < estimated total) already enforced fail-closed, now documented in SKILL.md
  - SKILL.md: referral and billing links default to the Japanese locale; non-Japanese variants only when the user clearly communicates in another language
  - suno.js: parsePlan now warns when V5_5 has no duration (defaults to a ~20s short track) and rejects vocal entries without lyrics
  - suno.js: submit pacing margin — 18 requests / 10 s (official cap 20) to coexist with manual web generation; `--lang` documented in usage text
  - Docs: failed requests consume no credits and per-request cost is uniform across models (verified 2026-09-11); agent OS detection for env-var instructions
  - Assisted API-key setup: users may paste the key to the agent, which writes the env var (shell rc / setx), never echoes the key, and verifies the balance; documented in SKILL.md + both READMEs + the script setup guide
  - SKILL.md: preflight now handles missing Node.js (install guidance incl. nodejs.org graphical installer for non-engineers) before key setup
  - READMEs: invocation phrase cheat sheet (5 copy-paste templates, ja/en) for non-engineer onboarding
  - READMEs: end-to-end no-hesitation pass — Install section (`npx skills add`), post-setup verification line, first-run expectations (timing median 91 s, 2 tracks per request, output location, retry), Japanese-vocal cheat-sheet row
  - SKILL.md: relay generation timing expectations (~1.5–2 min, median 91 s); past-run lookup via `status --dir <runDir>`
  - Commercial-use FAQ: relay official sources only — KIE.AI ToS (https://kie.ai/terms-of-use, /ja variant; no explicit generated-music clause as of 2026-09-11) + Suno licensing (https://suno.com/help/licensing, paid tiers grant full commercial rights); suno.com added to the self-audit URL allowlist
  - FAQ.md (ja): seed FAQ covering commercial use, billing, timing, output location, and troubleshooting — linked from both READMEs and SKILL.md, included in the self-audit URL allowlist; expandable per version
  - suno.js: user-selectable output folder — asked once during onboarding (default = current behavior); custom path set via the `MUSIC_KIE_SUNO_OUT_DIR` environment variable (same agent-assisted flow as the API key), takes precedence over the git-project default, unsetting resets. Documented in SKILL.md, READMEs, and FAQ
  - Output directory renamed `suno_kie/` → `music_kie_suno/` to match the skill name; 0.3.0 users can rename an existing folder by hand to carry over history (usage.jsonl, past runs)
  - FAQ.md: digest of the official KIE.AI FAQ (ja) — failed tasks not charged, credits never expire, bonus credits, 80 free credits for new accounts (noted per the official FAQ; actual granting depends on registration), support/logs/pricing/invoice links, each marked （公式）; free-trial credits noted in README Step 2 (ja/en); SKILL.md support pointer updated to vip-support
  - suno.js robustness: in-run credit refresh is now non-fatal and throttled to 60 s (a transient 5xx/network error no longer kills the polling loop); final settlement falls back to the last known balance
  - suno.js: per-task poll timeout raised 5 → 10 min (queue margin); usage text documents MUSIC_KIE_SUNO_OUT_DIR
  - FAQ + SKILL.md: service-interruption entry — KIE.AI server conditions can interrupt generation; retry later, failed requests are not charged
  - Onboarding reordered for try-before-you-buy: register → API key → env setup → first track (possibly with free testing credits); card binding & top-up moved to a when-needed Step 5 — SKILL.md onboarding pointer, both READMEs, and a new FAQ entry updated
  - suno.js: automatic update notice — the credit preflight compares the installed version (SKILL.md frontmatter) with the published repo main branch (raw.githubusercontent.com) and prints `UPDATE AVAILABLE` with the reinstall command; numeric-safe compare, silent on network failure; raw.githubusercontent.com added to the self-audit allowlist
  - .gitignore: ignore runtime output (music_kie_suno/ + legacy suno_kie/) and .DS_Store so users running inside the repo never commit generated tracks or usage stats
  - 80-credit notes unified everywhere: official claim — actual granting prevails; ~6 requests ≈ 12 tracks; top up first if not granted
  - READMEs + SKILL.md: API-key setup now shows an assisted-vs-manual comparison (effort / best for / caveats); agents must detect OS and shell and present only the matching one-line command, with terminal-app guidance for non-engineers
  - suno.js: insufficient-balance error now offers both remedies — trim the plan to the affordable request count (`floor(balance ÷ ~12)`) or top up at the billing page; the link defaults to the Japanese page (https://kie.ai/ja/billing — the skill targets Japanese users), `--lang en` switches to https://kie.ai/billing
  - Windows env var: added PowerShell session-level `$env:KIE_AI_API_KEY` variant alongside persistent `setx`; noted agents detect the OS and show only the relevant commands

## 0.3.0 — 2026-09-10

- Onboarding section for non-engineers: registration → login → card binding & top-up → API key → first track
- Author referral link with transparent disclosure (first-month commission only); locale-aware link (Japanese users get the /ja localized page)
- GitHub contact link for feedback
- Onboarding steps verified live in browser (SSO-only registration, billing quick-charge, api-key creation); blog screenshots captured with click annotations

## 0.2.0 — 2026-09-10

- Verified weirdness/styleWeight combos: conservative 0.2/0.9, middle 0.5/0.6, experimental 0.8/0.4 (audible differences confirmed on V5_5 instrumental, same style)
- Same-style batch flow: ask the user to pick a combo; default = experimental (max variability)
- Style guidance menu for vague instrumental requests (scene / mood / instrument+tempo)
- Style-text variation techniques for the same genre anchor: instrument-family swaps, texture/recording feel, opening-instrument directives, arrangement density, key/era wording
- Composition & selection tips: opening-first principle, 2-track selection guidance, Japanese lyrics pronunciation, V5_5 vocal-mode noise note, persona reuse, BPM guidance

## 0.1.0 — 2026-09-10

- Initial release: batch generation via the KIE.AI Suno API
- Credit preflight + mandatory confirmation gate before any spend
- Per-request plan files (markdown + embedded JSON)
- Background execution with per-minute status tables (`status` command)
- Instrumental presets: V5_5 (instrumental=true + duration 360) / below V5_5 (instrumental=false + [Instrumental Break] lyrics technique)
- Auto-download with timestamped filenames (createTime-based) and usage.jsonl statistics
- self-audit.sh safety assertions, bilingual README (ja/en)
- Full parameter reference with per-model availability and style-variation levers
