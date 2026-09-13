---
name: music-kie-suno
description: Batch-generate AI music via the KIE.AI Suno API with credit-aware preflight, user-confirmed generation plans, live per-track progress tables, and auto-download with timestamped filenames. Use when the user wants to create songs, BGM, background music, jingles, or theme songs with Suno or KIE (e.g., "Sunoで曲を作って", "作業用BGMを作って", "勉強用BGMを10曲", "睡眠用BGMがほしい", "カフェ用BGM", "BGM生成して", "テーマソングを作って", "generate background music", "create a jingle with Suno", "背景音樂"). Triggers: music generation requests for study / sleep / cafe / work / video-channel use, batch BGM production, or any request mentioning Suno / KIE.AI music creation.
metadata:
  version: 0.5.2
---

# Suno (KIE.AI) batch music generation

Generate music in batch through the KIE.AI Suno API. Credit-safe by design: preflight before every run, explicit user confirmation before any spend, live progress reporting.

## Prerequisites

- Node.js (any recent version; the script uses Node stdlib only)
- `KIE_AI_API_KEY` environment variable (get a key at https://kie.ai/api-key)
- Detect the user's OS before env-var setup and relay only the matching instructions: macOS/Linux → `export` in `~/.zshrc`; Windows → persistent `setx` or current-session `$env:` in PowerShell

## Step 0 — Preflight (every activation)

Run (from the skill's install directory — e.g. `.agents/skills/music-kie-suno/` — or pass the full path to `scripts/suno.js`):

```bash
node scripts/suno.js credit
```

- If it prints the setup guide, relay it to the user verbatim and stop.
- Otherwise relay the balance. This call doubles as a health check (5xx / network error = service temporarily unavailable).
- The credit preflight also compares the installed version against the published repo's main branch. When a newer version exists it prints `UPDATE AVAILABLE` plus a "What is new" list fetched from the repo changelog (entries between the installed and latest versions) — relay the list in Japanese by default (translate the English summaries; keep version numbers; match the user's language if clearly non-Japanese), explain what changed, then ASK the user whether to update. Update only on explicit user approval (`npx skills add GenKoKo/music-kie-suno-skill`).
- If `node` itself is missing (command not found), guide the Node.js install first and re-run the preflight. Typical raw errors that mean "Node is absent" — treat them as your trigger for the install guidance: `zsh:1: command not found: npx` / `bash: npx: command not found` (macOS), `'npx' is not recognized as an internal or external command` (Windows cmd), `npx : The term 'npx' is not recognized` (Windows PowerShell). The OS gives the user no install hints — the guidance is entirely your job. macOS → `brew install node` when Homebrew exists; without Homebrew, give the user the one-line official .pkg install to run in their Terminal (curl the latest v24 .pkg from nodejs.org/dist/latest-v24.x/ + `sudo installer` — sudo prompts for their password, so it cannot run from your shell); Windows → `winget install OpenJS.NodeJS.LTS` or the installer from nodejs.org. If Node.js is present, skip all of this silently — never bring up installation when it is not needed. Website alternative to offer the user: the LTS installer at nodejs.org/en/download matched to their system — macOS `macOS Installer (.pkg)` (universal: Apple Silicon and Intel), Windows `Windows Installer (.msi)` (x64).
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

## First-run sample — offer both modes

For the first generation, offer a two-mode comparison so the user hears the difference once: (1) instrumental only (e.g. 「6分の作業用BGMを1曲」), (2) one vocal track with lyrics in the same style — you draft the lyrics per Lyrics (vocal mode); or both (2 requests = 4 tracks, ≈ 24 credits — usually within test credits). All tracks land in the same run directory and appear together in the report table. The consent gate is unchanged: estimates, balance, time and the consent options are still required before spending.

## Output folder (first-run choice)
## Output folder (first-run choice)

During onboarding (or anytime), ask once where downloaded tracks should go:

- **Default (recommended)**: `<project>/output_music_kie_suno/<YYMMDD>/` inside a git project, otherwise `~/Documents/output_music_kie_suno/<YYMMDD>/` — nothing to do.
- **Custom folder**: set the environment variable `OUTPUT_DIR_MUSIC_KIE_SUNO` to an absolute path — the same agent-assisted flow as the API key (`export OUTPUT_DIR_MUSIC_KIE_SUNO=/path/to/dir` in the shell rc, or `setx` on Windows; create the folder if missing). All runs then use `<that path>/<YYMMDD>/`; the custom folder takes precedence even inside a git project. Unsetting the variable restores the default.

Verify with the dry-run (`generate --plan <file>` without `--yes`) — the `output dir:` line shows the resolved path.

## Step 1 — Collect the request

From the user, gather:

1. Number of requests N (each request produces exactly 2 tracks)
2. Style / mood / genre description
3. Instrumental or with vocals
4. Duration in seconds (10–360; default 360)

**Track count vs request count — always convert and confirm.** Users speak in track counts, but generation and billing happen per request, and **1 request produces exactly 2 tracks** (two versions of the same plan entry). When the user names a track count, convert it to a request count with `ceil(tracks ÷ 2)` and explicitly confirm the mismatch before composing the plan (e.g. "3 tracks" → 2 requests → 4 tracks: relay that one extra track will be produced and ask if that is OK). If the user insists on an exact odd number, explain that 2 tracks per request is the platform's granularity and let them pick the request count. Never silently round a track count into a request count.

### Guiding vague style requests (instrumental)

When the user cannot articulate a style, narrow it with three quick questions, then compose the style text from the answers:

1. Scene / purpose: study, sleep, cafe, deep work...
2. Mood: calm, warm, nostalgic, focused, melancholic...
3. Instrument & tempo preference: e.g. piano + brushed drums slow, acoustic guitar folk, ambient pad drone...
3. Instrument & tempo preference: e.g. piano + brushed drums slow, acoustic guitar folk, ambient pad drone...

Present every question with 3–5 ready-made options labeled a/b/c/d/e (lowercase, but answers are case-insensitive — "A" works too), tuned to what the user already said (study BGM → a ambient pad / b lo-fi jazz / c acoustic folk / d piano solo / e free text). The user may answer with a single letter, a letter plus a tweak ("b, slower"), or free text — all are valid. If they have no direction at all, state which option you would pick and why instead of re-asking an open question. The count is flexible: 3–5 depending on how many genuinely distinct directions exist.

If the request plausibly fits a vocal track, make one option a vocal/lyrics variant and route to the Lyrics (vocal mode) section.

Before offering options, check `<output root>/log.jsonl` — if a previous run exists, make the FIRST option "a: same style as last time (<style text>)"; if the user references a past date or time, locate that batch by the `at` timestamp in `log.jsonl` and reuse its `style` / `planFile` parameters instead of re-asking. All option answers are case-insensitive.

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

## Music design & planning quick reference (supplementary knowledge)

Platform operation is this skill's core; the notes below are supplementary music design & planning knowledge (mood, keys, tempo, arrangement). Final quality depends on the Suno generation engine — never promise masterpieces.

**Mood ↔ key / mode** (put into the style text, e.g. "in A minor"):
- Major: bright, reassuring / Minor: melancholic, night-time / Dorian: modal, jazzy / Lydian: floating, dreamy / Pentatonic: safe and easy-listening

**Genre quick reference** (tempo / core instruments / texture):
- Lo-fi hip hop: 65–80 BPM / felt piano + brushed drums + vinyl noise / 7th chords, dusty warmth
- Ambient: 60–70 / pads + long reverb / little or no rhythm
- Acoustic folk: 90–110 / acoustic guitar + cajon / room-mic intimacy
- Jazz trio: 120–140 (swing) / piano + upright bass + brushed drums / live-club air
- City pop: 100–115 / bass-forward + clean guitar + brass / glossy 80s sheen
- Cinematic: 70–90 / strings + low drums / wide reverb, gradual build

**BGM design principles** (study / work / sleep):
- No vocals, flat dynamics, no sudden drops — steady and loop-friendly
- Keep mid-frequencies centred so speech stays intelligible over the track
- Opening-first: the mood must land in the first 10 seconds

### Lyrics (vocal mode)

For vocal tracks (instrumental omitted or false, `lyrics` required), guide the writing instead of waiting for finished lyrics:

1. Persona first: who listens, when, and the feeling to deliver (e.g. 「落ち込んでいたときに回復したい」) — the lyric theme comes from that wish; season and trending topics help
2. Genre lyric conventions: before drafting, ask what themes the genre's hit lyrics share
3. Structure tags inside `lyrics`: `[Verse]` / `[Chorus]` / `[Bridge]` / `[Outro]`; starting from the chorus is a valid style
4. You draft the lyrics, the user edits — short lines, concrete imagery, singable phrasing
5. Caveats: sensitive words fail the whole request (`SENSITIVE_WORD_ERROR` — no retry, credits refunded); keep the `style` text consistent with the lyric mood

Source caveat: this guidance derives from pre-V6 Suno community experience. The process (persona → theme → structure tags → draft) carries over, but generation-behavior claims — AI vocal pronunciation quality, structure-tag effectiveness, how `style` text maps to the output — are unverified on the current V6 family: verify on a real run before asserting them to the user.

**Judging the 2 delivered tracks**:
- First 30 seconds decide; check for noise, muddy low-end, abrupt transitions
- If both are unusable, re-generate as a new request (costs ~12 credits)

## Step 2 — Variation policy

- **Same-style batch**: ask the user to pick one of three verified weight combos — 1) conservative `weirdnessConstraint 0.2 / styleWeight 0.9`, 2) middle `0.5 / 0.6`, 3) experimental `0.8 / 0.4` (max variability). If the user has no preference, use the **experimental** combo. Audible differences verified 2026-09-10 on instrumental.
- **Style-text variation** (a different style per request): only when the user explicitly asks for style variety; compose each variant and show them in the plan.
- The combo choice appears in the confirmation-gate summary so the user sees it before approving.

## Step 3 — Pure-instrumental presets

- **Default model V6** (listening test 2026-09-12 preferred its sound over V6_WILD / V6_MINI): `instrumental: true`, `duration: 360` (the duration parameter controls length precisely — verified).

## Step 4 — Titles

- Auto-assign SHORT English titles based on the requested style, unless the user specified titles (Japanese titles are fine when the user asks).
- Titles must be unique across ALL past runs: check with `node scripts/suno.js titles "<title>" "<title2>"` — the script answers USED/free per name; if USED, vary the title (add a mood or version word). The confirmation summary also warns automatically.
- Titles must be unique within the batch, max 80 characters. Compose a `title2` for every request — a distinct varied form of `title` for the second track (same uniqueness and length rules). When `title2` is omitted, the second file falls back to the plan title with a `_v2` suffix.

## Step 5 — Compose the plan file

Write `<output_music_kie_suno root>/plans/plan-<YYMMDD>-<HHMMSS>.md`: a human-readable summary on top, then ONE ```json fence at the bottom containing the machine-readable array. The script parses only the json fence.

```json
[
  {"title": "Quiet Hours A1", "title2": "Quiet Hours A2", "style": "Calm lo-fi jazz, soft piano, brushed drums, slow tempo", "instrumental": true, "duration": 360}
]
```

Fields: `title` (required), `title2` (optional second-track name), `style` (required), `instrumental`, `lyrics`, `duration` (10–360), `styleWeight` / `weirdnessConstraint` / `audioWeight` (0–1), `negativeTags`, `vocalGender`, `personaId` / `personaModel`. The plan carries no `model` field — the script always submits V6 (older versions are discontinued). See "Parameters" below.

Output root: `<git project root>/output_music_kie_suno/` when running inside a project, otherwise `~/Documents/output_music_kie_suno/`.

## Step 6 — Confirmation gate (mandatory)

```bash
node scripts/suno.js generate --plan <plan-file>
```

Without `--yes` this prints the confirmation summary (requests, estimated cost ≈ N × 12 credits, current balance) and spends nothing. Present the summary to the user and WAIT for explicit approval. Do not proceed on silence.

Without `--yes` this prints the confirmation summary (requests, estimated cost ≈ N × 12 credits, current balance) and spends nothing. Present the summary to the user and WAIT for explicit approval. Do not proceed on silence.

If the user hesitates, requests changes, or seems unsure, offer 3–5 concrete alternatives in the same labeled format (e.g., a keep as proposed / b different lead instrument / c calmer or more experimental mood / d shorter duration / e other free-text idea), then update the plan and re-present before asking for approval again. Keep every option to one line.

The approval ask itself must present the whole run as ONE batch, stated per batch rather than as separate request counts: batch size (N requests = 2N tracks), total estimated credits for the batch (≈ requests × 12), current balance, and estimated wall-clock time (V6 family ≈ 3–4 min per request), then present consent options in the labeled format — a approve and start / b change the plan / c cancel. On a, submit and start polling (Step 8). On b, gather the change and re-present the updated plan; on c, stop with nothing spent.

## Step 7 — Execute in background

```bash
node scripts/suno.js generate --plan <plan-file> --yes --bg
```

Note the run directory from the output. Balance errors show the Japanese billing URL by default; append `--lang en` for non-Japanese users.

## Step 8 — Progress reporting (every ~1 minute)

```bash
node scripts/suno.js status
```

Relay the markdown table to the user each time (statuses: `queued` → `submitted` → `PENDING` / `TEXT_SUCCESS` / `FIRST_SUCCESS` → `done` / `failed`, with downloaded files listed). Repeat until `ALL_REQUESTS_FINISHED`. Expectation to relay: the V6 family takes ~3–4 minutes per 360 s request (observed 171–215 s across V6_MINI / V6 / V6_WILD, 2026-09-12) — noticeably longer than the discontinued V5_5 (median 91 s); the poll timeout is 10 min per task, so a slow queue is not yet a failure.

## Step 9 — Delivery

At completion the script prints the report after `=== REPORT ===` — relay it directly to the user in chat. The chat table is 曲名/長さ/ファイル only (the スタイル column is kept in `report.md` for space). The report contains `保存先:` — the absolute folder path; relay it verbatim (Claude / ChatGPT desktop apps detect local paths) and offer to open the folder for the user (`open <path>` on macOS, `explorer <path>` on Windows). Past runs live under `output_music_kie_suno/<YYMMDD>/` (report.md + status.json); re-render any past run with `node scripts/suno.js status --dir <runDir>`. For `--bg` detached runs the stdout block is lost — read `report.md` and relay the same content instead. Close the loop by reporting actuals against the estimate — actual elapsed time and actual credits used vs what was quoted at approval (e.g., "quoted 48 credits / ~12 min → actual 24.00 credits / 10 min").

**Platform retention (~14 days):** generated audio remains downloadable on KIE.AI for only about 14 days and is then deleted from the platform. The local files in the output folder are the permanent copy — relay this to the user so they keep or back up tracks they care about; if local files are lost, re-download from the platform within the window or regenerate. Defer to the official KIE.AI pages for the current retention policy.

## Parameter limits (validated by the script before submission)

| lyrics (prompt) | style | title | duration |
|---|---|---|---|
| 5000 chars | 1000 chars | 80 chars | 10–360 s |

Cost reference: ~12 credits per request (measured 2026-09; the script always shows the real balance delta; V6 family same price — operator-verified).
## Generation log (`log.jsonl`)

One JSON object per request is appended to `<output root>/log.jsonl` after each batch (local only; gitignored). The schema is pinned — `v` increments only on a breaking field change:

| field | type | meaning |
|---|---|---|
| `v` | number | schema version; `1` (lines written before 0.4.0 lack this field) |
| `at` | ISO 8601 string | batch finish time |
| `title` | string | plan entry title (both tracks of a request share it — tell them apart via `files[]`) |
| `style` | string \| null | plan style text — reuse for "same as last time" generation |
| `model` / `instrumental` | string / boolean | model and instrumental flag as planned |
| `durationReq` | number \| null | requested seconds (actual audio length may differ) |
| `planFile` | string \| null | path to the plan markdown (full lyrics / prompt / parameters) |
| `taskId` | string | KIE.AI task id |
| `status` | string | `done` or `failed` |
| `elapsedSec` | number | submission → completion seconds |
| `tracks` | object[] | one object per downloaded track: `{file, title, url, durationSec}` — `title` is the per-track title (`title2` when the plan provided one), `url` is the platform download URL (valid only within the ~14-day retention window), `durationSec` is the API-reported track seconds (`null` when unavailable) |

Examples: total generation time across history — `jq -s 'map(.elapsedSec // 0) | add' log.jsonl`; every produced file — `jq -r '.files[]' log.jsonl`.

## Run file schemas (`status.json` / `report.md`)

**`status.json`** — written to the run directory at start, on every credit refresh, and at completion; read by `node scripts/suno.js status` (resolves the latest run via `.lastrun`, or pass `--dir <runDir>`). Schema:

| field | type | meaning |
|---|---|---|
| `startedAt` | ISO 8601 | run start time |
| `outDir` | string | run directory |
| `planFile` | string \| null | source plan markdown, when one was used |
| `credits.start` / `credits.last` | number \| null | balance at run start / last observed |
| `requests[]` | object[] | one per plan entry, same order as the plan |
| `requests[].title` / `title2` | string / null | plan titles (`title2` names the second track) |
| `requests[].style` / `durationReq` | string / number \| null | plan style text and requested seconds (actual audio length may differ) |
| `requests[].model` / `instrumental` | string / boolean | as planned |
| `requests[].status` | string | `queued` → `submitted` → `PENDING` / `TEXT_SUCCESS` / `FIRST_SUCCESS` → `done` / `failed` |
| `requests[].taskId` `stage` `submittedAt` `completedAt` `elapsedSec` `error` | mixed | task id, poll stage, timestamps, duration, error text |
| `requests[].files[]` | object[] | downloaded tracks: `{file, title, url, durationSec}` |
| `updatedAt` | ISO 8601 | last write time |

**`report.md`** — human receipt (Japanese) rendered at completion for non-engineer users. Fixed structure: `# 生成レポート <YYYY-MM-DD HH:mm>` + per-track table `| # | 曲名 | 長さ | ファイル | スタイル |` — 長さ shows the API-reported duration (約X分), else the requested seconds (要求X分（未確認）), else —; スタイル is the plan style — + spend line (credits and ~USD at $0.005/credit) + fixed memos (local backup, ~14-day platform retention, trim-longer-than-video advice, re-download URLs within the window, commercial-use note) + engineer footer `- credits: <before> -> <after> (used <delta>)`. Not machine-parsed — use `status.json` / `log.jsonl`. The per-request table (`| # | title | status | detail |`) remains the `status` command's rendering via `renderTable()`.


Rate limit (official): each account allows at most 20 new generation requests per 10 seconds (≈ 100+ concurrent tasks). The script paces submissions through a sliding window at 18 requests / 10 s — leaving margin in case the user is also generating manually on the website. It also aborts before any submission when the balance is below the estimated total (~12/request), guaranteeing the whole batch is fundable before the first request is sent.

## Parameters (official docs — jobs API, V6 family)

The script submits to `POST /api/v1/jobs/createTask` with the wrapper `{ model: "ai-music-api/generate", callBackUrl, input: { ... } }`; all fields below live inside `input` (snake_case). Polling: `GET /api/v1/jobs/recordInfo?taskId=`.

| parameter | type | effect |
|---|---|---|
| custom_mode | bool | custom lyrics/style control |
| instrumental | bool | pure instrumental, no vocals |
| prompt (lyrics) | string | lyrics in custom mode; required when instrumental=false |
| style | string | genre / instruments / tempo / mood; required |
| title | string | track title; required |
| title2 | string | skill-local: optional distinct composed name for the second track of the request (varied form of title; filename fallback: `_v2` suffix) |
| model | enum | V6 / V6_MINI / V6_WILD — default V6 (listening test); V6_WILD not recommended (hissy artifacts observed); plan may pin another family member on request |
| duration | number | audio length in seconds, 10–360 (default 20); honored on V6 and V6_WILD — V6_MINI may return shorter tracks (~half observed) |
| negative_tags | string | styles/traits to exclude (comma-separated) |
| vocal_gender | string | `m` / `f` vocal preference (custom_mode only; probabilistic) |
| style_weight | number 0–1 (2 dp) | adherence strength to the style text |
| weirdness_constraint | number 0–1 (2 dp) | experimental / creative deviation |
| audio_weight | number 0–1 (2 dp) | balance of audio features vs other factors |
| persona_id / persona_model | string / enum | persona reuse (`style_persona` / `voice_persona`; custom_mode only) |
| callBackUrl | string | wrapper field (camelCase, outside `input`); required by API, this skill polls instead |

Active versions: V6 / V6_MINI / V6_WILD. V3_5 / V4 / V4_5* / V5 / V5_5 are discontinued and no longer accepted by this skill.

### V6 family observed behavior (live run 2026-09-12, one 360 s instrumental request each)

| | V6 (default) | V6_WILD | V6_MINI |
|---|---|---|---|
| generation wall time | 198 s | 215 s | 171 s |
| actual duration (requested 360 s) | 359.9 / 358.8 s | 359.8 / 360.3 s | 203.6 / 184.8 s — ignores the duration parameter |
| sound (operator listen test) | preferred | hissy/grainy — not recommended | acceptable, lighter encode |
| 2-track file size | 7.7 / 7.9 MB | 6.9 / 7.8 MB | 4.0 / 4.0 MB |
| track delivery | both in one poll cycle | both in one poll cycle | staggered across polls — handled by id-based dedup |

Same endpoint, payload shape, and billing (12 credits) for the whole family; only `input.model` differs. Relay to users: default is **V6** (operator listening test preferred its sound, 2026-09-12); V6_WILD is **not recommended** — hissy/grainy artifacts in the same test; variation comes from `styleWeight` / `weirdnessConstraint` tuning instead. MINI = fastest and lightest but may ignore the requested duration. Poll cap is 10 min per task.

## Style variation levers (same style text)

Different renders WITHOUT changing the style string — combination levers, strongest first:

1. `weirdnessConstraint`: low 0.1–0.3 conservative / high 0.6–0.9 experimental arrangements. The main character lever.
2. `styleWeight`: low 0.3–0.5 lets the model drift from the style text; high 0.8–1.0 strict adherence. Opposing weirdness gives orthogonal control.
3. `negativeTags`: exclude instruments/genres named in the style text (e.g. exclude `piano` to force other instruments to lead).
4. `audioWeight`: shifts tonal emphasis; subtle.
5. `vocalGender` / `personaId`: only for vocal tracks.

**Verified combos (2026-09-10, instrumental, identical style text — audible difference confirmed by operator listening test)**:

- conservative: `weirdnessConstraint 0.2 + styleWeight 0.9`
- middle: `0.5 + 0.6`
- experimental: `0.8 + 0.4` ← default when the user has no preference

## Composition & selection tips

- **Opening first**: BGM listeners decide within the first 7–15 seconds. Put the core atmosphere at the front of the style text and use opening-instrument directives (variation technique #3) to shape the critical opening.
- **Choosing between the 2 tracks of a request**: judge by the opening 30 seconds; re-generate via a new request only if both are unusable (each retry costs ~12 credits).
- **Japanese lyrics (vocal tracks)**: convert kanji to katakana/hiragana in lyrics to avoid mispronunciation; watch particles (は read as わ, へ as え).
- **Known issue**: vocal mode may exhibit high-frequency noise audible to ~15% of listeners (reported 2026-03 on V5_5). The instrumental default avoids it; vocal users should check renders.
- **Consistent vocals**: `personaId` / `personaModel` reuse a favored vocal or style across generations (persona requires custom_mode).
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
