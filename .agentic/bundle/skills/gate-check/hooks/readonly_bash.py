#!/usr/bin/env python3
"""PreToolUse hook for read-only subagents (independent-reviewer, red-team-auditor).

Allows only one simple read-only command at a time: git inspection, registry lookups,
version checks, verify-gate.py without --run / --debt / --vendor, and the project's own verify_commands.
Everything else is blocked with exit code 2 and a reason on stderr.
"""

import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

# Shell syntax that could chain, redirect or substitute commands.
FORBIDDEN = re.compile(r"[;|<>`\r\n]|&&|\$\(")

ALLOWED = [
    r"git (status|diff|log|show|ls-files|check-ignore|rev-parse|describe|blame|shortlog|cat-file)\b.*",
    r"git branch( --show-current| --list| -a)?\s*",
    r"git remote -v\s*",
    r"(python3?|py)( -I)? (\"[^\"]*verify-gate\.py\"|'[^']*verify-gate\.py'|\S*verify-gate\.py)( .*)?",
    r"(npm|pnpm) (view|info|ls|list|why)\b.*",
    r"(npm|pnpm|node|python3?|py|uv|cargo|go|dotnet|git) (--version|-v|version)\s*",
    r"pip index versions \S+\s*",
    r"cargo (search|tree)\b.*",
    r"go list\b.*",
    r"dotnet list\b.*",
    r"uv (tree|pip list)\b.*",
    r"(ls|dir|pwd)( \S+)*\s*",
]


def block(command: str, reason: str) -> None:
    print(
        f"Заблоковано хуком read-only: «{command}». {reason} "
        "Дозволено одну просту команду читання: git status / diff / log / show / ls-files, "
        "перегляд реєстру пакетів, версії інструментів, verify-gate.py без --run і --debt "
        "або команду з verify_commands проєкту. Для читання файлів — Read, Grep, Glob.",
        file=sys.stderr,
    )
    sys.exit(2)


def verify_commands(cwd: str) -> set[str]:
    try:
        data = json.loads((Path(cwd) / ".agentic" / "project.json").read_text(encoding="utf-8"))
        commands = data.get("verify_commands") or {}
        return {c.strip() for cmds in commands.values() if isinstance(cmds, list) for c in cmds if isinstance(c, str)}
    except (OSError, ValueError, AttributeError):
        return set()


def main() -> None:
    try:
        event = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    except ValueError:
        block("?", "Хук не зміг прочитати вхідні дані.")
    if event.get("tool_name") != "Bash":
        sys.exit(0)
    command = str((event.get("tool_input") or {}).get("command", "")).strip()
    if command in verify_commands(event.get("cwd") or "."):
        sys.exit(0)  # the project's own checks; they write only to ignored build/test folders
    if FORBIDDEN.search(command):
        block(command, "Ланцюжки, конвеєри, перенаправлення й підстановки команд заборонені.")
    if re.search(r"(^|\s)--output\b", command):
        block(command, "Прапорець --output пише результат у файл.")
    if re.search(r"(^|\s)--(run|debt|vendor|new-sprint)(\s|=|$)", command) and "verify-gate" in command:
        block(command, "verify-gate.py --run і --debt виконують команди проєкту, а --vendor і --new-sprint пишуть файли; це робить етап, а не рев'юер.")
    if any(re.fullmatch(pattern, command) for pattern in ALLOWED):
        sys.exit(0)
    block(command, "Команди немає в списку дозволених.")


if __name__ == "__main__":
    main()
