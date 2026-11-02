#!/usr/bin/env python3
"""PreToolUse hook for dag-worker: the implementer may not change the oracle or pipeline files, nor see holdouts.

Blocks with exit code 2 and a reason on stderr:
- Edit / Write / MultiEdit / NotebookEdit outside the project or on protected paths: .agentic/**, .claude/**,
  .github/**, .gitlab-ci.yml, contract/** and the acceptance tests from .agentic/project.json -> oracle.paths;
- Read / Glob / Grep on .agentic/holdouts;
- Bash: any mention of holdouts, git commands that change the index or history, and writes
  (redirects, rm, mv, cp, sed -i, tee, PowerShell file cmdlets) that mention a protected path.
"""

import json
import os
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

BASE_PROTECTED = [".agentic/**", ".claude/**", ".github/**", ".gitlab-ci.yml", "contract/**"]
WRITE_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
READ_TOOLS = {"Read", "Glob", "Grep"}
GIT_MUTATING = re.compile(
    r"\bgit\s+(?:-c\s+\S+\s+)*(add|commit|checkout|restore|reset|stash|clean|push|rebase|merge|rm|mv|tag|"
    r"cherry-pick|revert|switch|apply|am|update-index)\b"
)
WRITE_OPS = re.compile(
    r">|\b(rm|mv|cp|del|tee|touch|truncate|rmdir|unlink|Remove-Item|Set-Content|Out-File|Add-Content|"
    r"Move-Item|Copy-Item|New-Item|Rename-Item)\b|\bsed\s+-\w*i|\bperl\s+-\w*i"
)


def block(reason: str) -> None:
    print(
        f"Заблоковано хуком protect_paths: {reason} Воркер змінює лише файли своєї зони; оракул (приймальні тести), "
        "файли конвеєра (.agentic/, .claude/, CI, contract/) і git-операції — поза його межами. "
        "Потрібна зміна — поверни запит головному агенту.",
        file=sys.stderr,
    )
    sys.exit(2)


def glob_to_regex(pattern: str) -> re.Pattern:
    out, i = [], 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    return re.compile("".join(out) + "$")


def protected_globs(cwd: Path) -> list[str]:
    globs = list(BASE_PROTECTED)
    try:
        project = json.loads((cwd / ".agentic" / "project.json").read_text(encoding="utf-8"))
        paths = (project.get("oracle") or {}).get("paths") or []
        globs += [p for p in paths if isinstance(p, str) and p.strip()]
    except (OSError, ValueError, AttributeError):
        pass
    return globs


def literal_prefix(pattern: str) -> str:
    return re.split(r"[*?\[]", pattern, maxsplit=1)[0]


def relative(path: str, cwd: Path) -> str | None:
    """Шлях відносно кореня проєкту у форматі a/b/c; None — поза проєктом."""
    if not path:
        return ""
    candidate = Path(path)
    full = candidate if candidate.is_absolute() else cwd / candidate
    rel = os.path.relpath(os.path.normpath(str(full)), os.path.normpath(str(cwd))).replace("\\", "/")
    return None if rel == ".." or rel.startswith("../") else rel


def mentions_holdouts(text: str) -> bool:
    return "holdouts" in text.lower()


def main() -> None:
    try:
        event = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    except ValueError:
        block("хук не зміг прочитати вхідні дані.")
    tool = event.get("tool_name")
    data = event.get("tool_input") or {}
    cwd = Path(event.get("cwd") or ".").resolve()
    globs = protected_globs(cwd)
    compiled = [glob_to_regex(g) for g in globs]

    if tool in WRITE_TOOLS:
        path = str(data.get("file_path") or data.get("notebook_path") or "")
        rel = relative(path, cwd)
        if rel is None:
            block(f"запис поза проєктом ({path}).")
        if mentions_holdouts(rel) or any(rx.match(rel) for rx in compiled):
            block(f"файл «{rel}» захищений.")
        sys.exit(0)

    if tool in READ_TOOLS:
        targets = " ".join(str(data.get(k) or "") for k in ("file_path", "path", "pattern", "glob"))
        if mentions_holdouts(targets):
            block("holdouts приховані від воркера.")
        sys.exit(0)

    if tool in ("Bash", "PowerShell"):
        command = str(data.get("command") or "")
        if mentions_holdouts(command):
            block("holdouts приховані від воркера.")
        if GIT_MUTATING.search(command):
            block("git-операції, що змінюють індекс чи історію, робить лише головний агент на гейті.")
        if "verify-gate" in command and re.search(r"(^|\s)--(vendor|new-sprint)(\s|=|$)", command):
            block("--vendor і --new-sprint змінюють файли конвеєра; їх запускає етап 5 чи координатор.")
        # Перенаправлення потоків (2>&1, >/dev/null, > NUL) нічого не пишуть у файли проєкту.
        stripped = re.sub(r"\d*>&\d+|\d*>\s*(/dev/null|nul)\b", " ", command, flags=re.IGNORECASE)
        if WRITE_OPS.search(stripped):
            normalized = stripped.replace("\\", "/")
            for prefix in {literal_prefix(g).rstrip("/") for g in globs} - {""}:
                if re.search(rf"(?<![\w.-]){re.escape(prefix)}(?=/|\s|$|[\"'])", normalized):
                    block(f"команда змінює файли в захищеному «{prefix}».")
        sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
