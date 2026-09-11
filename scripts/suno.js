'use strict';
// music-kie-suno — batch AI music generation via the KIE.AI Suno API.
// Node.js stdlib only. API docs: https://docs.kie.ai/suno-api/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const API = 'https://api.kie.ai';
const KEY_ENV = 'KIE_AI_API_KEY';
const CREDIT_REF_PER_REQUEST = 12;
const POLL_INTERVAL_MS = 5000;
const POLL_CAP_MS = 900000; // per-task poll timeout (V6 360s tracks observed 171-215s; 15 min leaves queue margin for slow queues)
const CREDIT_REFRESH_MS = 60000;
const PROGRESS_EVERY_MS = 60000;
const SUBMIT_RETRIES = 2;
const SUBMIT_PACING = { maxPerWindow: 18, windowMs: 10000 }; // official limit 20 new requests / 10 s; 18 leaves margin for concurrent web use
const V6_FAMILY = ['V6', 'V6_MINI', 'V6_WILD'];
const LIMITS = { V6: { prompt: 5000, style: 1000 } };
const TITLE_LIMIT = 80;
const CALLBACK_URL = 'https://example.com/suno-callback'; // required by API; we poll instead
const SKILL_REPO = 'GenKoKo/music-kie-suno'; // published repo (skills.sh / GitHub) — confirm slug before release

const die = m => { console.error('ERROR: ' + m); process.exit(1); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad2 = n => String(n).padStart(2, '0');
const pad3 = n => String(n).padStart(3, '0');
const stampParts = d => { d = d || new Date(); return { date: String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate()), time: pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) }; };
const sanitize = t => String(t).replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'track';
const log = m => console.log('[' + new Date().toISOString() + '] ' + m);

function loadKey() {
  const k = process.env[KEY_ENV];
  if (!k) {
    console.error('ERROR: ' + KEY_ENV + ' is not set.\n' +
      'Setup guide:\n' +
      '  1. Get your API key: https://kie.ai/api-key\n' +
      '  2. Set it as an environment variable:\n' +
      '       macOS / Linux : export ' + KEY_ENV + '=your_key      (then add it to ~/.zshrc or ~/.bashrc)\n' +
      '       Windows        : setx ' + KEY_ENV + ' your_key       (reopen the terminal)\n' +
      '     Tip: paste the key to your AI agent and say "set this up for me" — it writes the env var and verifies the balance.\n' +
      '  3. Run the command again.');
    process.exit(1);
  }
  return k.trim();
}

function call(method, url, body, key, timeoutMs) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = httpsRequest(url, { method: method, headers: Object.assign({ Authorization: 'Bearer ' + key }, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) }, res => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => { let j = null; try { j = JSON.parse(buf); } catch (e) {} resolve({ code: res.statusCode, json: j, raw: buf.slice(0, 400) }); });
    }, timeoutMs || 30000);
    r.on('error', reject);
    r.setTimeout(timeoutMs || 30000, () => r.destroy(new Error('request timeout')));
    if (data) r.write(data);
    r.end();
  });
}
function httpsRequest(url, opts, cb) {
  const u = new URL(url);
  const https = require('https');
  return https.request(Object.assign({ hostname: u.hostname, path: u.pathname + u.search, port: u.port || 443 }, opts), cb);
}
function getBinary(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const https = require('https');
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 4) { res.resume(); return resolve(getBinary(res.headers.location, redirects + 1)); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('download HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchCredit(key) {
  try {
    const r = await call('GET', API + '/api/v1/chat/credit', null, key);
    if (r.code === 200 && r.json && typeof r.json.data === 'number') return r.json.data;
    return null;
  } catch (e) { return null; }
}
function getText(url) {
  return new Promise(resolve => {
    const https = require('https');
    const req = https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => resolve(b));
    });
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')); });
    req.on('error', () => resolve(null));
  });
}
function skillVersionFrom(md) { const m = String(md).match(/version:\s*([0-9]+\.[0-9]+\.[0-9]+)/); return m ? m[1] : null; }
function localVersion() { try { return skillVersionFrom(fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf8')); } catch (e) { return null; } }
function newerVersion(a, b) { const pa = (a || '').split('.').map(Number), pb = (b || '').split('.').map(Number); for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0; } return false; }
async function updateNotice() {
  const local = localVersion();
  if (!local) return null;
  const md = await getText('https://raw.githubusercontent.com/' + SKILL_REPO + '/main/SKILL.md');
  if (md == null) return null; // network/repo unavailable — stay silent
  const remote = skillVersionFrom(md);
  if (remote && newerVersion(remote, local)) return 'UPDATE AVAILABLE: ' + local + ' -> ' + remote + ' — run: npx skills add ' + SKILL_REPO;
  return null;
}

async function credit(key) {
  const v = await fetchCredit(key);
  if (v == null) die('credit check failed (401/403 = invalid key, 5xx/network = service temporarily unavailable — retry later)');
  return v;
}

function insufficientMsg(bal, est, n, billingUrl) {
  const maxAff = Math.floor(bal / CREDIT_REF_PER_REQUEST);
  return ['insufficient balance: ' + bal + ' credits < ~' + est + ' needed for ' + n + ' requests (~' + CREDIT_REF_PER_REQUEST + '/request). Choose one:',
    maxAff > 0
      ? '  a) trim the plan to ' + maxAff + ' request' + (maxAff === 1 ? '' : 's') + ' (~' + (maxAff * CREDIT_REF_PER_REQUEST) + ' credits) and re-run with the smaller plan'
      : '  a) balance is below the cost of a single request (~' + CREDIT_REF_PER_REQUEST + ' credits) — trimming is not viable',
    '  b) top up at ' + billingUrl + ' and re-run the original plan'].join('\n');
}

async function submit(body, key) {
  for (let attempt = 0; ; attempt++) {
    let r;
    try { r = await call('POST', API + '/api/v1/jobs/createTask', body, key); }
    catch (e) { r = { code: 0, json: null, raw: String(e.message || e) }; }
    const retriable = r.code === 429 || r.code === 0 || (r.code >= 500 && r.code <= 599);
    if (!retriable || attempt >= SUBMIT_RETRIES) return r;
    const wait = 2000 * Math.pow(2, attempt);
    log('submit attempt ' + (attempt + 1) + ' failed (HTTP ' + r.code + '), retrying in ' + wait / 1000 + 's');
    await sleep(wait);
  }
}

const recentSubmits = [];
async function acquireSubmitSlot() {
  for (;;) {
    const now = Date.now();
    while (recentSubmits.length && now - recentSubmits[0] >= SUBMIT_PACING.windowMs) recentSubmits.shift();
    if (recentSubmits.length < SUBMIT_PACING.maxPerWindow) { recentSubmits.push(now); return; }
    const waitMs = SUBMIT_PACING.windowMs - (now - recentSubmits[0]) + 50;
    log('submit pacing: account limit ' + SUBMIT_PACING.maxPerWindow + ' requests / ' + (SUBMIT_PACING.windowMs / 1000) + 's — next slot in ~' + Math.ceil(waitMs / 1000) + 's');
    await sleep(waitMs);
  }
}

function gitRoot() {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function baseDir() {
  const out = process.env.OUTPUT_DIR_MUSIC_KIE_SUNO; // agent-assisted custom output root (absolute path)
  if (out && out.trim()) return out.trim();
  return gitRoot() || os.homedir() + path.sep + 'Documents';
}
function sunoRoot() { return path.join(baseDir(), 'output_music_kie_suno'); }
function todayDir() { return path.join(sunoRoot(), stampParts().date); }
function nextNNN(dir) {
  let max = 0;
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) { const m = f.match(/^suno-.+-(\d{3})-[^-]+\.mp3$/); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return max + 1;
}
function trackFilename(model, createdAtMs, nnn, title, variantIdx) {
  const ct = createdAtMs ? new Date(createdAtMs) : new Date();
  const s = stampParts(ct);
  return 'suno-' + model + '-' + s.date + '-' + s.time + '-' + pad3(nnn) + '-' + sanitize(title) + (variantIdx === 0 ? '' : '_v' + (variantIdx + 1)) + '.mp3';
}

function parsePlan(file) {
  if (!fs.existsSync(file)) die('plan file not found: ' + file);
  const md = fs.readFileSync(file, 'utf8');
  const m = md.match(/```json\s*([\s\S]*?)```/);
  if (!m) die('no ```json block found in plan file: ' + file);
  let plan;
  try { plan = JSON.parse(m[1]); } catch (e) { die('plan JSON parse error: ' + e.message); }
  if (!Array.isArray(plan) || !plan.length) die('plan JSON must be a non-empty array of requests');
  const seen = {};
  for (const p of plan) {
    if (!p.title) die('plan entry missing required "title"');
    if (p.title.length > TITLE_LIMIT) die('title too long (' + p.title.length + ' > ' + TITLE_LIMIT + '): ' + p.title);
    const k = p.title.toLowerCase();
    if (seen[k]) die('duplicate title in plan: ' + p.title);
    seen[k] = true;
    if (p.title2) {
      if (p.title2.length > TITLE_LIMIT) die('title2 too long (' + p.title2.length + ' > ' + TITLE_LIMIT + '): ' + p.title2);
      const k2 = p.title2.toLowerCase();
      if (seen[k2]) die('duplicate title in plan: ' + p.title2);
      seen[k2] = true;
    } else p.title2 = null;
    p.model = V6_FAMILY.indexOf(p.model) !== -1 ? p.model : 'V6';
    const lim = LIMITS.V6;
    if (!p.style) die('plan entry missing required "style" (title: ' + p.title + ')');
    if (p.style.length > lim.style) die('style too long (' + p.style.length + ' > ' + lim.style + ')');
    if (p.lyrics && p.lyrics.length > lim.prompt) die('lyrics too long (' + p.lyrics.length + ' > ' + lim.prompt + ')');
    if (p.duration && (p.duration < 10 || p.duration > 360)) die('duration must be 10-360 seconds (title: ' + p.title + ')');
    if (!p.instrumental && !p.lyrics) die('plan entry requires "lyrics" when instrumental is not true (title: ' + p.title + ')');
    for (const w of ['styleWeight', 'weirdnessConstraint', 'audioWeight']) if (p[w] != null && (typeof p[w] !== 'number' || p[w] < 0 || p[w] > 1)) die(w + ' must be a number between 0 and 1');
  }
  return plan;
}

function requestBody(entry) {
  const input = { custom_mode: true, model: entry.model, style: entry.style, title: entry.title, instrumental: !!entry.instrumental };
  if (entry.instrumental === false || entry.lyrics) input.prompt = entry.lyrics || '';
  if (entry.lyrics) input.prompt = entry.lyrics;
  if (entry.duration) input.duration = entry.duration;
  for (const pair of [['styleWeight', 'style_weight'], ['weirdnessConstraint', 'weirdness_constraint'], ['audioWeight', 'audio_weight']]) if (entry[pair[0]] != null) input[pair[1]] = entry[pair[0]];
  if (entry.negativeTags) input.negative_tags = entry.negativeTags;
  if (entry.vocalGender) input.vocal_gender = entry.vocalGender;
  if (entry.personaId) input.persona_id = entry.personaId;
  return { model: 'ai-music-api/generate', callBackUrl: CALLBACK_URL, input };
}

function newStatus(plan, outDir) {
  return { startedAt: new Date().toISOString(), outDir: outDir, planFile: null, credits: { start: null, last: null }, requests: plan.map(p => ({ title: p.title, title2: p.title2 || null, model: p.model, instrumental: !!p.instrumental, status: 'queued', taskId: null, stage: '', submittedAt: null, completedAt: null, elapsedSec: null, files: [], error: null })) };
}
function saveStatus(st, outDir) { st.updatedAt = new Date().toISOString(); fs.writeFileSync(path.join(outDir, 'status.json'), JSON.stringify(st, null, 2)); }
function renderTable(st) {
  const lines = ['| # | title | status | detail |', '|---|---|---|---|'];
  st.requests.forEach((r, i) => {
    let detail = '';
    if (r.status === 'done') detail = r.files.map(f => f.file).join('<br>');
    else if (r.status === 'failed') detail = r.error || 'failed';
    else detail = (r.stage || r.status) + (r.files.length ? ' | ' + r.files.map(f => f.file).join('<br>') : '');
    lines.push('| ' + (i + 1) + ' | ' + r.title + ' | ' + r.status + ' | ' + detail + ' |');
  });
  const used = st.credits.start != null && st.credits.last != null ? (st.credits.start - st.credits.last).toFixed(2) : '?';
  lines.push('', 'credits used so far: ' + used + ' (balance ' + (st.credits.last == null ? '?' : st.credits.last) + ')');
  return lines.join('\n');
}

function extractSunoData(j) {
  const d = j && j.data;
  if (d && d.response && Array.isArray(d.response.sunoData)) return d.response.sunoData;
  if (d && typeof d.resultJson === 'string') { try { const rj = JSON.parse(d.resultJson); if (Array.isArray(rj.data)) return rj.data; } catch (e) {} }
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.tracks)) return d.tracks;
  return null;
}
const TERMINAL_FAIL = { CREATE_TASK_FAILED: 1, GENERATE_AUDIO_FAILED: 1, SENSITIVE_WORD_ERROR: 1 };

async function runGenerate(args) {
  const key = loadKey();
  const planFile = args.plan; if (!planFile) die('generate requires --plan <file>');
  const yes = args.yes;
  const plan = parsePlan(planFile);
  const outDir = todayDir(); fs.mkdirSync(outDir, { recursive: true });
  const bal0 = await credit(key);
  const est = plan.length * CREDIT_REF_PER_REQUEST;
  const billingUrl = args.lang === 'en' ? 'https://kie.ai/billing' : 'https://kie.ai/ja/billing'; // default ja — skill targets Japanese users
  if (!yes) {
    const lines = ['=== CONFIRMATION REQUIRED (re-run with --yes to proceed) ===', '', 'requests: ' + plan.length + ' (2 tracks each, ' + (plan.length * 2) + ' total)', 'model: ' + plan[0].model + (plan.every(p => p.model === plan[0].model) ? '' : ' (mixed)'), 'estimated cost: ~' + est + ' credits (' + CREDIT_REF_PER_REQUEST + ' per request, reference value)', 'current balance: ' + bal0 + ' credits', 'submit pacing: max ' + SUBMIT_PACING.maxPerWindow + ' requests / ' + (SUBMIT_PACING.windowMs / 1000) + 's (official account limit)', 'output dir: ' + outDir, '', 'per-request plan:', ...plan.map((p, i) => '  ' + (i + 1) + '. [' + (p.instrumental ? 'instrumental' : 'with vocals') + '] ' + p.title + ' — ' + (p.style || '').slice(0, 90) + (p.lyrics ? ' + lyrics(' + p.lyrics.length + ' chars)' : ''))];
    console.log(lines.join('\n'));
    if (bal0 < est) { console.error('ERROR: ' + insufficientMsg(bal0, est, plan.length, billingUrl)); process.exit(1); }
    return;
  }
  if (bal0 < est) die(insufficientMsg(bal0, est, plan.length, billingUrl));
  const st = newStatus(plan, outDir);
  st.credits.start = bal0; st.credits.last = bal0;
  saveStatus(st, outDir);
  fs.writeFileSync(path.join(sunoRoot(), '.lastrun'), outDir);
  log('submitting ' + plan.length + ' requests (paced: max ' + SUBMIT_PACING.maxPerWindow + ' / ' + (SUBMIT_PACING.windowMs / 1000) + 's, official account limit)...');
  const bodies = plan.map(requestBody);
  await Promise.all(plan.map(async (p, i) => {
    await acquireSubmitSlot();
    const r = await submit(bodies[i], key);
    const taskId = r.json && r.json.data && (r.json.data.task_id || r.json.data.taskId);
    st.requests[i].submittedAt = new Date().toISOString();
    if (r.code !== 200 || !taskId) {
      st.requests[i].status = 'failed'; st.requests[i].error = 'submit failed HTTP ' + r.code + ': ' + r.raw;
      log('[' + p.title + '] submit FAILED: ' + r.raw);
    } else {
      st.requests[i].status = 'submitted'; st.requests[i].taskId = taskId;
      log('[' + p.title + '] taskId ' + taskId);
    }
    saveStatus(st, outDir);
  }));
  const active = st.requests.map((r, i) => ({ r: r, i: i })).filter(x => x.r.status === 'submitted');
  log('polling ' + active.length + ' active tasks...');
  let lastProgress = 0;
  let lastCreditAt = Date.now();
  const startMs = Date.now();
  for (;;) {
    let pending = 0;
    for (const a of active) {
      const r = a.r;
      if (r.status === 'done' || r.status === 'failed') continue;
      const elapsed = Date.now() - new Date(r.submittedAt).getTime();
      if (elapsed > POLL_CAP_MS) { r.status = 'failed'; r.error = 'poll timeout after ' + POLL_CAP_MS / 1000 + 's'; continue; }
      pending++;
      let resp;
      try { resp = await call('GET', API + '/api/v1/jobs/recordInfo?taskId=' + encodeURIComponent(r.taskId), null, key); } catch (e) { continue; }
      if (resp.code !== 200 || !resp.json) continue;
      const j = resp.json;
      r.stage = (j.data && (j.data.status || (j.data.state || '').toUpperCase())) || '';
      const sd = extractSunoData(j);
      if (sd && r.files.length < sd.length) {
        for (let t = 0; t < sd.length; t++) {
          const tr = sd[t] || {};
          const url = tr.audio_url || tr.source_audio_url || tr.audioUrl;
          if (!url) continue;
          r.downloadedIds = r.downloadedIds || {};
          if (tr.id && r.downloadedIds[tr.id]) continue;
          try {
            const bin = await getBinary(url);
            const nnn = nextNNN(outDir);
            const tTitle = t === 1 && r.title2 ? r.title2 : r.title;
            const fname = trackFilename(r.model, tr.createTime, nnn, tTitle, t === 1 && !r.title2 ? t : 0);
            fs.writeFileSync(path.join(outDir, fname), bin);
            if (tr.id) r.downloadedIds[tr.id] = 1;
            r.files.push({ file: fname, title: tTitle, url, bytes: bin.length });
            log('[' + r.title + '] saved ' + fname + ' (' + (bin.length / 1048576).toFixed(1) + ' MB)');
          } catch (e) { log('[' + r.title + '] download failed: ' + e.message); }
        }
      }
      if (r.stage === 'SUCCESS' && r.files.length >= 2) { r.status = 'done'; r.completedAt = new Date().toISOString(); r.elapsedSec = Math.round((Date.now() - new Date(r.submittedAt).getTime()) / 1000); log('[' + r.title + '] DONE in ' + r.elapsedSec + 's'); }
      else if (TERMINAL_FAIL[r.stage] && !r.files.length) { r.status = 'failed'; r.error = 'generation failed: ' + r.stage; log('[' + r.title + '] FAILED: ' + r.stage); }
    }
    if (Date.now() - lastCreditAt >= CREDIT_REFRESH_MS) {
      const v = await fetchCredit(key);
      if (v != null) { st.credits.last = v; lastCreditAt = Date.now(); }
    }
    saveStatus(st, outDir);
    if (Date.now() - lastProgress >= PROGRESS_EVERY_MS) {
      lastProgress = Date.now();
      fs.writeFileSync(path.join(outDir, 'progress.md'), '# progress ' + new Date().toISOString() + '\n\n' + renderTable(st) + '\n');
    }
    if (!pending) break;
    const totalElapsed = Date.now() - startMs;
    if (totalElapsed > 3600000) { log('global deadline reached'); break; }
    await sleep(POLL_INTERVAL_MS);
  }
  const balEnd = await fetchCredit(key);
  if (balEnd != null) st.credits.last = balEnd;
  saveStatus(st, outDir);
  const lines = ['# generation report', '', '- finished: ' + new Date().toISOString(), '- credits: ' + bal0 + ' -> ' + st.credits.last + ' (used ' + (bal0 - st.credits.last).toFixed(2) + ')', '', renderTable(st)];
  fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n') + '\n');
  const usage = st.requests.map(r => JSON.stringify({ v: 1, at: new Date().toISOString(), title: r.title, taskId: r.taskId, status: r.status, elapsedSec: r.elapsedSec, tracks: (r.files || []).map(f => ({ file: f.file, title: f.title, url: f.url || null })) }));
  fs.appendFileSync(path.join(sunoRoot(), 'usage.jsonl'), usage.join('\n') + '\n');
  log('REPORT_READY: ' + path.join(outDir, 'report.md'));
}

function spawnBg(args) {
  const child = spawn(process.execPath, [__filename].concat(args), { detached: true, stdio: 'ignore', env: process.env });
  child.unref();
  log('running in background (pid ' + child.pid + '). Poll progress with: node suno.js status');
}

function statusCmd(args) {
  let dir = args.dir;
  if (!dir) {
    const lr = path.join(sunoRoot(), '.lastrun');
    if (!fs.existsSync(lr)) die('no previous run found. Use generate --plan <file> --yes first, or pass --dir <runDir>.');
    dir = fs.readFileSync(lr, 'utf8').trim();
  }
  const sf = path.join(dir, 'status.json');
  if (!fs.existsSync(sf)) die('status.json not found in ' + dir);
  const st = JSON.parse(fs.readFileSync(sf, 'utf8'));
  const done = st.requests.filter(r => r.status === 'done').length;
  const failed = st.requests.filter(r => r.status === 'failed').length;
  console.log('run: ' + dir);
  console.log('updated: ' + st.updatedAt + ' | done ' + done + '/' + st.requests.length + ' | failed ' + failed);
  console.log(renderTable(st));
  if (done + failed === st.requests.length) console.log('ALL_REQUESTS_FINISHED');
}

function parseArgs(argv) {
  const args = {}; const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.indexOf('--') === 0) { const k = a.slice(2); const v = argv[i + 1] && argv[i + 1].indexOf('--') !== 0 ? argv[i + 1] : true; args[k] = v; if (v !== true) i++; }
    else rest.push(a);
  }
  args._ = rest;
  return args;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (cmd === 'credit') { const key = loadKey(); const b = await credit(key); console.log('balance: ' + b + ' credits'); const note = await updateNotice(); if (note) console.log(note); }
  else if (cmd === 'generate') {
    if (args.bg) { spawnBg(process.argv.slice(2).filter(a => a !== '--bg')); return; }
    await runGenerate(args);
  }
  else if (cmd === 'status') statusCmd(args);
  else {
    console.log('Usage:\n  node suno.js credit                          – check remaining credits\n  node suno.js generate --plan <plan.md>       – print confirmation summary (no spend)\n  node suno.js generate --plan <plan.md> --yes --bg [--lang en]  – execute batch in background (billing link defaults to ja; --lang en for English)\n  node suno.js status [--dir <runDir>]         – render current batch status table\n  Env: KIE_AI_API_KEY (required) | OUTPUT_DIR_MUSIC_KIE_SUNO (optional custom output root)');
    if (cmd) die('unknown command: ' + cmd);
    process.exit(cmd ? 1 : 0);
  }
})().catch(e => { console.error('FATAL ' + (e && e.message)); process.exit(1); });
