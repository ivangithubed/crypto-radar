#!/usr/bin/env python3
"""Project-level PreToolUse hook: keeps .agentic/holdouts hidden from every agent of the project.

The owner opens holdouts by starting a session with the environment variable SDD_HOLDOUTS=author;
an agent cannot change the environment of its own Claude Code process. The validator runs holdouts as a
subprocess (verify-gate.py --stage 7 --run), so the tools of an agent never read them.
Blocks with exit code 2: Read / Glob / Grep / Edit / Write / MultiEdit / NotebookEdit on holdouts and
Bash / PowerShell commands that mention holdouts.
"""

import json
import os
import sys

sys.dont_write_bytecode = True
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

FILE_TOOLS = {"Read", "Glob", "Grep", "Edit", "Write", "MultiEdit", "NotebookEdit"}


def main() -> None:
    if os.environ.get("SDD_HOLDOUTS") == "author":
        sys.exit(0)
    try:
        event = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    except ValueError:
        sys.exit(0)
    tool = event.get("tool_name")
    data = event.get("tool_input") or {}
    if tool in FILE_TOOLS:
        text = " ".join(str(data.get(k) or "") for k in ("file_path", "notebook_path", "path", "pattern", "glob"))
    elif tool in ("Bash", "PowerShell"):
        text = str(data.get("command") or "")
    else:
        sys.exit(0)
    if "holdouts" in text.lower():
        print(
            "Заблоковано хуком holdout_guard: .agentic/holdouts — приховані сценарії, яких виконавець не бачить. "
            "Їх запускає валідатор на гейті етапу 7 (verify-gate.py --stage 7 --run). Відкрити їх може лише власник: "
            "сесія, запущена зі змінною середовища SDD_HOLDOUTS=author.",
            file=sys.stderr,
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
