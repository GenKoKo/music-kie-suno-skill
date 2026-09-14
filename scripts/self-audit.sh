#!/usr/bin/env bash
# self-audit.sh — reproducible safety assertions for this skill. Exit 0 = pass.
set -u
cd "$(dirname "$0")/.."
fail=0

# 1. All URLs must be https and on allowlisted hosts
bad_urls=$(grep -rhoE 'https?://[A-Za-z0-9./_-]+' scripts/ SKILL.md README.md README.en.md FAQ.md 2>/dev/null | sort -u | grep -vE '^https://(api\.kie\.ai|kie\.ai|docs\.kie\.ai|nodejs\.org|github\.com|genkoko\.github\.io|tempfile\.aiquickdraw\.com|audiostream\.kie\.ai|musicfile\.kie\.ai|example\.com|suno\.com|raw\.githubusercontent\.com|img\.shields\.io)' || true)
if [ -n "$bad_urls" ]; then echo 'FAIL: non-allowlisted URLs:'; echo "$bad_urls"; fail=1; fi

# 2. No hardcoded key-like values
if grep -rnE 'KIE_AI_API_KEY[^=]*=[[:space:]]*[A-Za-z0-9]{20}' scripts/ 2>/dev/null; then echo 'FAIL: hardcoded key-like string'; fail=1; fi

# 3. No dynamic execution or obfuscation
if grep -rnE 'eval\(|base64 (-d|--decode)|[|] *(ba)?sh\b' scripts/ 2>/dev/null; then echo 'FAIL: dynamic execution pattern'; fail=1; fi

# 4. The key must come only from the environment variable
if ! grep -q 'process.env\[KEY_ENV\]' scripts/suno.js || ! grep -q "KEY_ENV = 'KIE_AI_API_KEY'" scripts/suno.js; then echo 'FAIL: key must be read from env'; fail=1; fi

# 5. child_process usage limited to detached spawn (background mode)
if grep -n 'child_process' scripts/suno.js | grep -v 'spawn'; then echo 'FAIL: unexpected child_process usage'; fail=1; fi

if [ "$fail" -eq 0 ]; then echo 'SELF-AUDIT PASSED'; else exit 1; fi
