---
description: "Manual AI logging — ONLY for web tools (ChatGPT, Gemini Web, Claude.ai, etc.). NOT for Antigravity."
---

# Manual AI logging (web tools only)

Antigravity IDE, Claude Code, Cursor, Codex, Copilot, and Gemini CLI **log automatically** via hooks or `log_antigravity.py` in pre-push. **Do not** run the commands below for those tools.

This workflow is only for **web tools without hooks** — e.g. ChatGPT, Gemini Web, Claude.ai, Perplexity, etc.

## How to run

**Linux / macOS / Git Bash:**
```bash
# Interactive mode (script prompts for tool + prompt)
bash scripts/_pyrun.sh scripts/log_manual.py

# One-line mode
bash scripts/_pyrun.sh scripts/log_manual.py --tool "<tool name>" --prompt "<description of work done>"
```

**Windows (cmd.exe / PowerShell):**
```cmd
scripts\_pyrun.cmd scripts\log_manual.py
scripts\_pyrun.cmd scripts\log_manual.py --tool "<tool name>" --prompt "<description of work done>"
```

## Examples

```bash
bash scripts/_pyrun.sh scripts/log_manual.py --tool chatgpt --prompt "Brainstorm UI layout for verify page"
bash scripts/_pyrun.sh scripts/log_manual.py --tool gemini-web --prompt "Research risk scoring algorithms"
bash scripts/_pyrun.sh scripts/log_manual.py --tool claude-web --prompt "Explain OAuth2 PKCE flow"
```

Entries are appended to `.ai-log/session.jsonl` and submitted with other auto logs on the next `git push`.
