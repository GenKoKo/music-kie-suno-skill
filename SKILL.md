---
name: music-kie-suno
description: Batch-generate AI music via the KIE.AI Suno API with credit-aware preflight, user-confirmed generation plans, live per-track progress tables, and auto-download with timestamped filenames. Use when the user wants to create songs, BGM, or instrumental tracks with Suno or KIE (e.g., "Sunoで曲を作って", "BGM生成して", "generate music with Suno", "作業用BGMを作って").
metadata:
  version: 0.4.0
---

# Suno (KIE.AI) batch music generation

Generate music in batch through the KIE.AI Suno API. Credit-safe by design: preflight before every run, explicit user confirmation before any spend, live progress reporting.

## Prerequisites

- Node.js (any recent version; the script uses Node stdlib only)
- `KIE_AI_API_KEY` environment variable (get a key at https://kie.ai/api-key)
- Detect the user's OS before env-var setup and relay only the matching instructions: macOS/Linux → `export` in `~/.zshrc`; Windows → persistent `setx` or current-session `$env:` in PowerShell

## Step 0 — Preflight (every activation)

Run:

```bash
node scripts/suno.js credit
```

- If it prints the setup guide, relay it to the user verbatim and stop.
- Otherwise relay the balance. This call doubles as a health check (5xx / network error = service temporarily unavailable).
- The credit preflight also compares the installed version against the published repo's main branch and prints an `UPDATE AVAILABLE` line when the remote is newer — relay it and suggest `npx skills add GenKoKo/music-kie-suno`.
- If `node` itself is missing (command not found), guide the Node.js install first and re-run the preflight: macOS → `brew install node` or the graphical installer from nodejs.org (prefer the installer for users without Homebrew); Windows → `winget install OpenJS.NodeJS.LTS` or the installer from nodejs.org.
- First-time user (no account, no key)? Walk them through the README onboarding: register → obtain API key → set the env var (they may paste the key to you — see Assisted API-key setup) → first track. Card binding & top-up are only needed when the balance is insufficient — new accounts may carry free testing credits per the official FAQ (actual granting varies). The registration link and its disclosure are in the README.
- **Referral link (default Japanese)**: this skill targets Japanese users — give `https://kie.ai/ja?ref=dd95e71edb49afb16467a8523cbf31d8` by default; use `https://kie.ai?ref=dd95e71edb49afb16467a8523cbf31d8` only when the user clearly communicates in another language. Always include the disclosure text from the README.

## Assisted API-key setup (user pastes the key in chat)

For non-engineer users the easy path is acceptable: the user pastes the API key into the chat and asks you to set it up. Rules:

1. **Never repeat the key** in your reply or in any file — refer to it as "your key". Mention once that the key transited the chat; a user who minds can regenerate it at https://kie.ai/api-key afterwards.
2. **Write it persistently, matching the OS/shell**:
   - macOS/Linux: append `export KIE_AI_API_KEY=<key>` to `~/.zshrc` (zsh) or `~/.bashrc` (bash). If a `KIE_AI_API_KEY` line already exists, replace it — do not append duplicates.
   - Windows (PowerShell): `setx KIE_AI_API_KEY <key>` (persists for new terminals only).
3. **Verify with a one-off env-prefixed run** (independent of rc reload):
   - macOS/Linux: `env KIE_AI_API_KEY=<key> node scripts/suno.js credit`
   - Windows: `$env:KIE_AI_API_KEY = "<key>"; node scripts/suno.js credit`
4. Report the balance → onboarding done. The key may exist ONLY in the shell rc / user environment — never in plan files, `status.json`, reports, or repo files.
5. **Manual-path support**: when the user prefers manual setup or asks for the command, detect the OS and shell (process platform, `$SHELL`, `OSTYPE`) and present ONLY the matching one-line command — zsh/bash `export` with the correct rc file, Windows persistent `setx`, or current-session `$env:` — plus how to open the terminal (macOS: Terminal.app; Windows: PowerShell). The agent runs on the user's machine, so its platform matches the user's.

## Output folder (first-run choice)

During onboarding (or anytime), ask once where downloaded tracks should go:

- **Default (recommended)**: `<project>/music_kie_suno/<YYMMDD>/` inside a git project, otherwise `~/Documents/music_kie_suno/<YYMMDD>/` — nothing to do.
- **Custom folder**: set the environment variable `MUSIC_KIE_SUNO_OUT_DIR` to an absolute path — the same agent-assisted flow as the API key (`export MUSIC_KIE_SUNO_OUT_DIR=/path/to/dir` in the shell rc, or `setx` on Windows; create the folder if missing). All runs then use `<that path>/<YYMMDD>/`; the custom folder takes precedence even inside a git project. Unsetting the variable restores the default.

Verify with the dry-run (`generate --plan <file>` without `--yes`) — the `output dir:` line shows the resolved path.

## Step 1 — Collect the request

From the user, gather:

1. Number of requests N (each request produces exactly 2 tracks)
2. Style / mood / genre description
3. Instrumental or with vocals
4. Model (default `V5_5`)
5. Duration in seconds (V5_5 only; default 360)

### Guiding vague style requests (instrumental)

When the user cannot articulate a style, narrow it with three quick questions, then compose the style text from the answers:

1. Scene / purpose: study, sleep, cafe, deep work...
2. Mood: calm, warm, nostalgic, focused, melancholic...
3. Instrument & tempo preference: e.g. piano + brushed drums slow, acoustic guitar folk, ambient pad drone...

Composition formula: `<genre> with <instruments>, <texture>, <tempo> BPM, <mood> atmosphere`.
Example: `Calm lo-fi jazz with soft piano, muted trumpet, brushed drums, warm vinyl texture, slow tempo around 70 BPM, relaxed late-night study atmosphere`.

### Style-text variation techniques (same genre anchor)

Keep `<genre>` fixed and rotate exactly ONE component per request — large audible differences while staying recognisably in-style:

1. **Instrument swap within the same family** (same family, different word = different timbre): `soft piano` / `rhodes` / `felt piano` / `wurlitzer`; `muted trumpet` / `flugelhorn` / `soft saxophone`; `brushed drums` / `rimshots` / `soft kick`.
2. **Texture / recording feel**: `vinyl crackle` / `tape saturation` / `airy room reverb` / `close-mic dry` / `rain outside the window`.
3. **Opening instrument directive** (directly diversifies track openings): `opens with solo piano` vs `opens with brushed drums groove` vs `opens with ambient pad`.
4. **Arrangement density**: `sparse and minimal` vs `lush and layered`; `steady loop-friendly groove` vs `slow build to a gentle climax`.
5. **Key / era wording**: `major key, warm` vs `minor key, melancholic`; `1960s trio recording` vs `modern bedroom production`.

Example derivation from one anchor (lo-fi jazz): swap instruments (`felt piano, flugelhorn`) / swap texture + era (`tape saturation, close-mic dry, late-night hotel lobby`) / opening directive (`opens with brushed drums groove, airy room reverb`).

## Step 2 — Variation policy

- **Same-style batch**: ask the user to pick one of three verified weight combos — 1) conservative `weirdnessConstraint 0.2 / styleWeight 0.9`, 2) middle `0.5 / 0.6`, 3) experimental `0.8 / 0.4` (max variability). If the user has no preference, use the **experimental** combo. Audible differences verified 2026-09-10 on V5_5 instrumental.
- **Style-text variation** (a different style per request): only when the user explicitly asks for style variety; compose each variant and show them in the plan.
- The combo choice appears in the confirmation-gate summary so the user sees it before approving.

## Step 3 — Pure-instrumental presets

- **V5_5**: `instrumental: true`, `duration: 360` (the duration parameter controls length precisely — verified).
- **Below V5_5** (V4, V4_5, ...): `instrumental: false` + `lyrics` set to `"[Instrumental Break]"` repeated 150 times + `"[END]"` (legacy technique to maximize length; the duration parameter is ignored on these models).

## Step 4 — Titles

- Auto-assign SHORT English titles based on the requested style, unless the user specified titles (Japanese titles are fine when the user asks).
- Titles must be unique within the batch, max 80 characters. Track 2 of each request gets a varied form of the request title.

## Step 5 — Compose the plan file

Write `<music_kie_suno root>/plans/plan-<YYMMDD>-<HHMMSS>.md`: a human-readable summary on top, then ONE ```json fence at the bottom containing the machine-readable array. The script parses only the json fence.

```json
[
  {"title": "Quiet Hours A1", "style": "Calm lo-fi jazz, soft piano, brushed drums, slow tempo", "model": "V5_5", "instrumental": true, "duration": 360}
]
```

Fields: `title` (required), `style` (required), `model`, `instrumental`, `lyrics`, `duration` (V5_5 only), `styleWeight` / `weirdnessConstraint` / `audioWeight` (0–1), `negativeTags`, `vocalGender` (customMode only), `personaId` / `personaModel` (personas, V5+). See "Parameters & per-model availability" below.

Output root: `<git project root>/music_kie_suno/` when running inside a project, otherwise `~/Documents/music_kie_suno/`.

## Step 6 — Confirmation gate (mandatory)

```bash
node scripts/suno.js generate --plan <plan-file>
```

Without `--yes` this prints the confirmation summary (requests, estimated cost ≈ N × 12 credits, current balance) and spends nothing. Present the summary to the user and WAIT for explicit approval. Do not proceed on silence.

## Step 7 — Execute in background

```bash
node scripts/suno.js generate --plan <plan-file> --yes --bg
```

Note the run directory from the output. Balance errors show the Japanese billing URL by default; append `--lang en` for non-Japanese users.

## Step 8 — Progress reporting (every ~1 minute)

```bash
node scripts/suno.js status
```

Relay the markdown table to the user each time (statuses: `queued` → `submitted` → `PENDING` / `TEXT_SUCCESS` / `FIRST_SUCCESS` → `done` / `failed`, with downloaded files listed). Repeat until `ALL_REQUESTS_FINISHED`. Expectation to relay: ~1.5–2 minutes per request (median 91 s, measured 2026-09).

## Step 9 — Delivery

Point the user to `report.md` in the run directory and list the downloaded `.mp3` paths. Summarize elapsed time and credits used. Past runs live under `music_kie_suno/<YYMMDD>/` (report.md + status.json); re-render any past run with `node scripts/suno.js status --dir <runDir>`.

## Parameter limits (validated by the script before submission)

| model | lyrics (prompt) | style | title | duration param |
|---|---|---|---|---|
| V4 | 3000 chars | 200 chars | 80 chars | not supported |
| V4_5 / V4_5PLUS / V4_5ALL | 5000 chars | 1000 chars | 80 chars | not supported |
| V5 / V5_5 | 5000 chars | 1000 chars | 80 chars | V5_5 only |

Cost reference: ~12 credits per request (measured 2026-09; the script always shows the real balance delta). Cost is uniform per request across models in music-generation mode (operator-verified 2026-09-11).

Rate limit (official): each account allows at most 20 new generation requests per 10 seconds (≈ 100+ concurrent tasks). The script paces submissions through a sliding window at 18 requests / 10 s — leaving margin in case the user is also generating manually on the website. It also aborts before any submission when the balance is below the estimated total (~12/request), guaranteeing the whole batch is fundable before the first request is sent.

## Parameters & per-model availability (official docs)

| parameter | type | effect | availability |
|---|---|---|---|
| customMode | bool | custom lyrics/style control | all models |
| instrumental | bool | pure instrumental, no vocals | all models |
| prompt (lyrics) | string | lyrics in custom mode; required when instrumental=false | all models (see limits) |
| style | string | genre / instruments / tempo / mood; required | all models |
| title | string | track title; required | all models |
| model | enum | V3_5 / V4 / V4_5 / V4_5PLUS / V4_5ALL / V5 / V5_5 | — |
| duration | number | audio length in seconds (default 20, min 10) | customMode=true AND V5_5 only |
| negativeTags | string | styles/traits to exclude (comma-separated) | all models |
| vocalGender | string | `m` / `f` vocal preference | customMode=true only |
| styleWeight | number 0–1 (2 dp) | adherence strength to the style text | all models |
| weirdnessConstraint | number 0–1 (2 dp) | experimental / creative deviation | all models |
| audioWeight | number 0–1 (2 dp) | balance of audio features vs other factors | all models |
| personaId | string | Persona / Voice ID to apply | customMode=true only |
| personaModel | enum | `style_persona` / `voice_persona` | model V5 and above only |
| callBackUrl | string | async callback URL; required by API, this skill polls instead | all models |

## Style variation levers (same style text)

Different renders WITHOUT changing the style string — combination levers, strongest first:

1. `weirdnessConstraint`: low 0.1–0.3 conservative / high 0.6–0.9 experimental arrangements. The main character lever.
2. `styleWeight`: low 0.3–0.5 lets the model drift from the style text; high 0.8–1.0 strict adherence. Opposing weirdness gives orthogonal control.
3. `negativeTags`: exclude instruments/genres named in the style text (e.g. exclude `piano` to force other instruments to lead).
4. `audioWeight`: shifts tonal emphasis; subtle.
5. `vocalGender` / `personaId`: only for vocal tracks.

**Verified combos (2026-09-10, V5_5 instrumental, identical style text — audible difference confirmed by operator listening test)**:

- conservative: `weirdnessConstraint 0.2 + styleWeight 0.9`
- middle: `0.5 + 0.6`
- experimental: `0.8 + 0.4` ← default when the user has no preference

## Composition & selection tips

- **Opening first**: BGM listeners decide within the first 7–15 seconds. Put the core atmosphere at the front of the style text and use opening-instrument directives (variation technique #3) to shape the critical opening.
- **Choosing between the 2 tracks of a request**: judge by the opening 30 seconds; re-generate via a new request only if both are unusable (each retry costs ~12 credits).
- **Japanese lyrics (vocal tracks)**: convert kanji to katakana/hiragana in lyrics to avoid mispronunciation; watch particles (は read as わ, へ as え).
- **Known issue**: V5_5 vocal mode may exhibit high-frequency noise audible to ~15% of listeners (reported 2026-03). The instrumental default avoids it; vocal users should check renders.
- **Consistent vocals**: `personaId` / `personaModel` reuse a favored vocal or style across generations (persona requires customMode; personaModel V5+).
- **BPM**: include a target BPM in the style text as guidance — it nudges but does not guarantee tempo.

## User FAQ

A Japanese-language user FAQ lives in `FAQ.md` (commercial use, billing, timing, output location, troubleshooting). When a user asks a common question, relay the answer or link the file; expand it in future versions as new questions accumulate.

## Commercial use (user FAQ)

When users ask whether generated tracks can be used for YouTube uploads or monetization, relay the official sources — do not make legal promises on your own authority:

- KIE.AI Terms of Use: https://kie.ai/terms-of-use (日本語: https://kie.ai/ja/terms-of-use) — general terms only; as of 2026-09-11 it contains no explicit generated-music rights clause.
- Suno licensing policy (the generation engine): https://suno.com/help/licensing — paid tiers grant full commercial rights ("Songs you create as a paid Suno subscriber are yours..."); the free tier is non-commercial only.
- KIE.AI API generation is a paid service, but the output-rights terms are not spelled out in the KIE.AI ToS. For a definitive commercial assurance on high-stakes use, direct the user to KIE.AI support (https://kie.ai/vip-support — Discord/Telegram 1-on-1).

## Error handling

- `401/403` invalid key → relay the setup guide.
- `402` insufficient credits / pre-check failure → the script prints both remedies: trim the plan to the affordable count (`floor(balance ÷ ~12)`) or top up at the billing page. The billing link defaults to the Japanese page (https://kie.ai/ja/billing); pass `--lang en` for non-Japanese users (https://kie.ai/billing). Relay the link matching the user's language.
- `429` / `5xx` / network errors at submission → auto-retried twice with exponential backoff (a failed submission consumes no credits).
- Polling-stage failures are reported with status + measured credit delta, never auto-retried (a retry would spend credits again).
- Failed generations consume no credits — submission failures and generation failures (incl. SENSITIVE_WORD_ERROR) are not charged (operator-verified 2026-09-11).
- KIE.AI service interruptions: transient server issues can interrupt generation or balance checks. In-run balance refresh is non-fatal (last known value kept); when things fail, advise the user to wait a while and retry — failed tasks are not charged.

## Author / feedback

**Ko @ AIxBGM自動販売機** — feedback and feature requests welcome. GitHub: https://github.com/GenKoKo
