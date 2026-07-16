@echo off
REM Windows wrapper for Codex hooks. The hook payload is passed on stdin;
REM this wrapper keeps stdin attached while resolving repo-root paths.

set "ROOT="
for /f "delims=" %%R in ('git rev-parse --show-toplevel 2^>nul') do set "ROOT=%%R"
if not defined ROOT set "ROOT=%CD%"

call "%ROOT%\scripts\_pyrun.cmd" "%ROOT%\scripts\log_hook.py" --tool=codex
