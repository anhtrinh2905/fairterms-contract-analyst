---
description: "AI usage logging is fully automatic — do NOT call any log_* script manually"
activation: always-on
---

# AI Usage Logging — Automatic

Logging prompts to `.ai-log/session.jsonl` is **fully automated**. You (the AI agent) do **not** need — and **must not** — run any logging command after each task.

## How it works

When the student runs `git push`:
1. The pre-push hook runs `scripts/log_antigravity.py --auto`, reading Antigravity conversation transcripts directly from `~/.gemini/antigravity-ide/brain/<conv>/.system_generated/logs/transcript.jsonl` and sweeping all prompts (`USER_INPUT` + `USER_EXPLICIT`) belonging to the current repo from the last 24 hours.
2. The pre-push hook runs `scripts/submit_log.py`, uploading `.ai-log/session.jsonl` to the grading server.

All user prompts typed in Antigravity IDE are captured **verbatim from disk**; the AI does not need to summarize them.

## Do not do the following

- ❌ **Do NOT** call `scripts/log_antigravity.py "<summary>" "<model>"` after each task. This command is deprecated; calling it accidentally creates a fake "TaskComplete" log entry instead of the user's real prompt.
- ❌ **Do NOT** run `scripts/log_manual.py` for Antigravity — use it only for ChatGPT / web tools (see `.agents/workflows/log.md`).
- ❌ **Do NOT** edit or delete files in `.ai-log/` — they are managed by the pre-push hook and submit script.

## When intervention is needed

- If the pre-push hook reports an error → tell the user; do not bypass with `--no-verify` on your own.
- If the student uses a tool not covered by auto-hooks (ChatGPT, Gemini Web, etc.) → point them to `.agents/workflows/log.md` for manual logging.

## One-time setup after cloning the repo

```bash
# Linux / macOS / Git Bash
bash scripts/setup_hooks.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts\setup_hooks.ps1
```
