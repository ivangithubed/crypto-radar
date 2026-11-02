#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify-gate.py — детермінована перевірка Human Approval Gates SDD-конвеєра: передумови етапу,
звіт із 7 секцій, артефакти, секрети, правила якості коду й команди перевірки проєкту.

Валідатор не прив'язаний до стеку:
- етапи, залежності, шляхи звітів і артефакти — з pipeline.json поруч зі скриптом;
- команди перевірки, правила якості й вимкнені правила — з .agentic/project.json проєкту
  (ключі verify_commands, quality_rules, disabled_rules).

Бандл — <bundle>/skills/gate-check/verify-gate.py (встановлений бандл: <bundle> = ~/.claude).
Проєкт — каталог із --root або поточний каталог. Лише стандартна бібліотека Python 3.10+.
"""

from __future__ import annotations

import sys

sys.dont_write_bytecode = True

import argparse
import json
import locale
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

USE_COLOR = (sys.stdout.isatty() or os.environ.get("FORCE_COLOR") == "1") and not os.environ.get("NO_COLOR")


def _enable_windows_ansi() -> None:
    """Вмикає обробку ANSI-кольорів у консолі Windows (без побічних ефектів для інших ОС)."""
    if os.name != "nt" or not sys.stdout.isatty():
        return
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
    except Exception:
        pass


if USE_COLOR:
    _enable_windows_ansi()


def colorize(text: str, color_code: str) -> str:
    if not USE_COLOR:
        return text
    return f"\033[{color_code}m{text}\033[0m"


def c_pass(text: str) -> str:
    return colorize(f"✅ [PASS] {text}", "32;1")


def c_fail(text: str) -> str:
    return colorize(f"❌ [FAIL] {text}", "31;1")


def c_warn(text: str) -> str:
    return colorize(f"⚠️  [WARN] {text}", "33;1")


def c_info(text: str) -> str:
    return colorize(f"ℹ️  [INFO] {text}", "36;1")


def c_header(text: str) -> str:
    return colorize(f"\n=== {text} ===", "35;1")


SCRIPT_PATH = Path(__file__).resolve()
BUNDLE_ROOT = SCRIPT_PATH.parents[2]

DEFAULT_PATHS = {
    "project": ".agentic/project.json",
    "state": ".agentic/pipeline-state.md",
    "reports_dir": ".agentic/reports",
    "report_template": "skills/sdd-delivery/assets/stage-report.template.md",
    "tech_debt": ".agentic/tech-debt.md",
    "backlog": ".agentic/backlog.md",
    "sprints": ".agentic/sprints",
}
# Шаблони, що лежать поруч зі шаблоном звіту (paths.report_template).
STATE_TEMPLATE = "pipeline-state.template.md"
PROJECT_TEMPLATE = "project.template.json"
DEBT_TEMPLATE = "tech-debt.template.md"
BACKLOG_TEMPLATE = "backlog.template.md"
# Номер поточного спринту в трекері (розділ 14 контракту sdd-delivery): рядок «- **Спринт:** `N`».
SPRINT_LINE_RE = re.compile(r"^([-*\s]*\*\*Спринт:\*\*\s*`?)(\d+)")
DEFAULT_COMMIT_TYPES = ["feat", "fix", "docs", "test", "refactor", "perf", "build", "ci", "chore"]
COMMAND_TIMEOUT = 900
# Копія валідатора в репозиторії проєкту (для CI) і приховані holdouts.
VENDOR_DIR = ".agentic/bundle"
HOLDOUTS_DIR = ".agentic/holdouts"
MAX_SCAN_BYTES = 5 * 1024 * 1024

IGNORED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "bower_components", "vendor", "dist", "build", "out", "target",
    "coverage", "htmlcov", ".nyc_output", ".vite", ".turbo", ".next", ".nuxt", ".svelte-kit", ".astro",
    ".parcel-cache", ".angular", ".expo", ".dart_tool", ".gradle", "obj", "Pods", "DerivedData",
    "playwright-report", "test-results", ".features-gen", "__pycache__", ".venv", "venv", ".tox", ".nox",
    ".mypy_cache", ".pytest_cache", ".ruff_cache", ".cache", ".terraform", ".serverless",
}
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".tif", ".tiff", ".ico", ".icns", ".svg",
    ".pdf", ".zip", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".7z", ".rar", ".jar", ".war", ".class", ".wasm",
    ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".mov",
    ".pyc", ".pyo", ".whl", ".egg", ".dll", ".exe", ".so", ".dylib", ".o", ".a", ".lib", ".node", ".bin",
    ".db", ".sqlite", ".sqlite3", ".psd", ".fig", ".sketch", ".docx", ".xlsx", ".pptx", ".apk", ".ipa",
    ".dmg", ".iso",
}

# Інструменти Claude Code для frontmatter субагентів.
KNOWN_TOOLS = {
    "Agent", "Task", "Bash", "PowerShell", "Glob", "Grep", "Read", "Edit", "Write", "MultiEdit",
    "NotebookEdit", "NotebookRead", "WebFetch", "WebSearch", "TodoWrite", "Skill", "LSP",
    "BashOutput", "KillShell", "Monitor", "AskUserQuestion", "ExitPlanMode",
    "ListMcpResourcesTool", "ReadMcpResourceTool",
}
WRITE_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
REQUIRED_DISALLOWED = {"Edit", "Write", "NotebookEdit"}

# Структура скіла етапу: заголовки (рівень 2–3, будь-яка нумерація) у цьому порядку.
HEADING_PREFIX = r"^#{2,3}[ \t]+(?:[\d.]+[ \t]+)?"
STAGE_SKILL_HEADINGS = [
    ("Контекст етапу", r"Контекст етапу"),
    ("Фаза 1: Pre-Flight Check", r"Фаза\s*1\b[^\n]*Pre-Flight"),
    ("Фаза 2: Best Practices Discovery", r"Фаза\s*2\b[^\n]*Best Practice"),
    ("Фаза 3: Кероване виконання (Explore → Plan → Execute → Verify)", r"Фаза\s*3\b[^\n]*(?:Кероване виконання|Explore)"),
    ("Фаза 4: Звіт + Human Approval Gate + Git Checkpoint", r"Фаза\s*4\b[^\n]*(?:Звіт|Human Approval Gate)"),
    ("Межі етапу", r"Межі етапу"),
]


def phase_markers(reviewer: str) -> list[tuple[str, list[str]]]:
    """Ключові слова 4 фаз, які має містити SKILL.md кожного скіла етапу (regex, без урахування регістру)."""
    return [
        ("Фаза 1: Pre-Flight і згода", [r"pre-flight", r"згод|consent"]),
        ("Фаза 2: Best Practices", [r"best practice", r"найпростіш"]),
        ("Фаза 3: виконання і незалежне рев'ю", [re.escape(reviewer), r"explore", r"verify"]),
        ("Фаза 4: звіт і гейт", [r"stage-report\.template\.md", r"закоміть", r"human approval gate"]),
    ]


# Маркери шаблону звіту (skills/sdd-delivery/assets/stage-report.template.md), які не можуть лишатися у звіті.
TEMPLATE_PLACEHOLDERS = [
    "[Номер та назва етапу]",
    "[наприклад:",
    "[РРРР-ММ-ДД ГГ:ХХ]",
    "[ PASS / BLOCKERS FOUND ]",
    "[Вставте",
    "шлях/до/файлу",
    "[US-1 / AC-1.1]",
    "[Опис вимоги]",
    "[шлях до файлу]",
    "[назва тесту або перевірки]",
    "[Ризик / Борг / Питання]",
    "[Низький / Середній / Високий]",
    "[Дія або етап, де це буде закрито]",
    "[Власник продукту / Скіл етапу N]",
    "[посилання на офіційну документацію]",
    "<цільові_файли_етапу>",
    "<звіт_етапу>",
    "[тип](stage-[N]):",
    "[короткий опис змін]",
    "[Зауваження власника",
]
GENERIC_PLACEHOLDER_RE = re.compile(r"`\[(?!PASS\]|x\]| \])[^\]`\n]{3,}\]`")

# Рівні моделей: псевдоніми Claude Code самі ведуть на актуальну рекомендовану модель сімейства.
MODEL_ALIASES = {"haiku", "sonnet", "opus", "fable", "inherit"}
BUNDLE_EFFORTS = ("low", "medium", "high", "xhigh")

REPORT_SECTIONS = {
    1: ("Pre-Flight Summary", re.compile(r"Pre-Flight|передумов", re.IGNORECASE)),
    2: ("Best Practices vs найпростіший підхід", re.compile(r"Best Practice", re.IGNORECASE)),
    3: ("Deliverables", re.compile(r"Deliverables|обсяг робіт", re.IGNORECASE)),
    4: ("Verification Evidence", re.compile(r"Verification|Докази", re.IGNORECASE)),
    5: ("Матриця трасування вимог", re.compile(r"трасуван|Traceability", re.IGNORECASE)),
    6: ("Ризики, борг, відкриті питання", re.compile(r"Ризик|Risk", re.IGNORECASE)),
    7: ("Git Commit Checkpoint", re.compile(r"Git|фіксації", re.IGNORECASE)),
}
MASS_ADD_ARGS = {".", "./", "-A", "--all"}

# Виміряний борг (.agentic/project.json → debt_commands, розділ 13.3 контракту sdd-delivery):
# кожен аспект — команди з порогом або {"not_applicable": "<фактична причина>"}.
DEBT_ASPECTS = {
    "complexity": "складність і дублювання",
    "dead_code": "мертвий код і зайві залежності",
    "boundaries": "межі модулів",
    "vulnerabilities": "вразливості залежностей",
    "sbom": "SBOM",
    "accessibility": "доступність (WCAG 2.2 AA)",
    "web_vitals": "Core Web Vitals",
}
# Розмір чи навчальна мета продукту не є фактом, що знімає перевірку.
NON_FACT_REASON_RE = re.compile(
    r"(?i)навчальн|учбов|прототип|невелик|\bмал(ий|ого|ому|е|а)\b|\bдемо\b|learning|prototype|\bsmall\b|\btoy\b|\bdemo\b"
)
# Звіт Red-Team: рядок таблиці «Знахідки» починається з ID і рівня; P2 має ID реєстру боргу.
FINDING_ROW_RE = re.compile(r"^\|\s*`?((?:RT|TD)-\d+)`?\s*\|\s*\**`?(P[0-2])`?\**\s*\|", re.MULTILINE)
SCORE_RE = re.compile(r"(?im)^[\s>#*-]*Enterprise Readiness Score\**\s*:\s*\**`?([A-F])\b")
VERDICT_RE = re.compile(r"(?im)^[\s>#*-]*VERDICT\**\s*:\s*\**`?(PASS|FAIL)\b")
DEBT_ID_RE = re.compile(r"^TD-\d+$")
NEGATION_BEFORE_RE = re.compile(
    r"(?i)(?:^|[^\w])(?:без|не|ніколи|замість|заборонен\w*|never|not|no|avoid|don't)[\s`'\"«(:]*$"
)

# Секрети: (назва, regex, номер групи зі значенням)
KIND_PRIVATE_KEY = "блок приватного ключа"
KIND_URL_PASSWORD = "пароль у URL / connection string"
SECRET_PATTERNS = [
    ("AWS Access Key ID", re.compile(r"\b((?:AKIA|ASIA)[0-9A-Z]{16})\b"), 1),
    (KIND_PRIVATE_KEY, re.compile(r"(-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----)"), 1),
    ("GitHub token", re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b"), 1),
    ("GitLab token", re.compile(r"\b(glpat-[A-Za-z0-9_\-]{20,})"), 1),
    ("npm token", re.compile(r"\b(npm_[A-Za-z0-9]{36})\b"), 1),
    ("Stripe live key", re.compile(r"\b((?:sk|rk)_live_[A-Za-z0-9]{16,})\b"), 1),
    ("Slack token", re.compile(r"\b(xox[abposr]-[A-Za-z0-9-]{10,})\b"), 1),
    ("Google API key", re.compile(r"\b(AIza[0-9A-Za-z_\-]{35})\b"), 1),
    ("Hugging Face token", re.compile(r"\b(hf_[A-Za-z0-9]{34,})\b"), 1),
    ("ключ LLM API", re.compile(r"\b(sk-ant-[A-Za-z0-9_\-]{20,}|sk-(?:proj-)?[A-Za-z0-9_\-]{32,})\b"), 1),
    (KIND_URL_PASSWORD, re.compile(r"\b[a-z][a-z0-9+.\-]{1,20}://[^:\s/@'\"]+:([^@\s'\"/]+)@"), 1),
    (
        "секрет у присвоєнні",
        re.compile(
            r"""(?i)(?:secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|password|passwd)['"]?\s*[:=]\s*['"]([A-Za-z0-9/+=_\-]{20,})['"]"""
        ),
        1,
    ),
]
SECRET_ALLOWED_VALUES = {
    "AKIAIOSFODNN7EXAMPLE",
    "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
}
PLACEHOLDER_PASSWORDS = {"postgres", "password", "pass", "changeme", "example", "secret", "test", "dev", "local", "app", "root", "admin", "guest"}
PLACEHOLDER_MARKERS = (
    "${", "$(", "{", "%(", "%s", "<", "example", "changeme", "placeholder", "your-", "your_", "xxx", "***",
    "dummy", "redacted",
)

# Позначки придушення: потрібна причина після тире або двокрапки.
SECRET_ALLOW_RE = re.compile(r"gate-check:\s*allow[- ]secret(?![\w])(?P<tail>.*)$", re.IGNORECASE)
REASON_RE = re.compile(r"^\s*[—–:\-]+\s*(\S.*)$")
COMMENT_CLOSERS_RE = re.compile(r"\s*(?:\*/|-->|#\}|%>|\*\))\s*$")

# Префікси однорядкових коментарів за типом файлу (для skip_comments у правилах якості).
C_COMMENTS = ("//", "/*", "*")
HASH_COMMENTS = ("#",)
XML_COMMENTS = ("<!--",)
COMMENT_STYLES: dict[str, tuple[str, ...]] = {}
for _ext in ("js jsx ts tsx mjs cjs mts cts java kt kts scala groovy gradle go rs c h cc cpp cxx hpp hh cs fs "
             "swift dart css scss sass less proto zig sol").split():
    COMMENT_STYLES["." + _ext] = C_COMMENTS
for _ext in "py pyi rb sh bash zsh fish ps1 psm1 psd1 pl pm r jl ex exs nim cr yml yaml toml ini cfg conf tf tfvars hcl mk cmake".split():
    COMMENT_STYLES["." + _ext] = HASH_COMMENTS
COMMENT_STYLES.update({
    ".php": C_COMMENTS + HASH_COMMENTS,
    ".sql": ("--",) + C_COMMENTS,
    ".lua": ("--",), ".hs": ("--",), ".elm": ("--",),
    ".html": XML_COMMENTS, ".htm": XML_COMMENTS, ".xml": XML_COMMENTS,
    ".vue": C_COMMENTS + XML_COMMENTS, ".svelte": C_COMMENTS + XML_COMMENTS, ".astro": C_COMMENTS + XML_COMMENTS,
})
HASH_FILE_NAMES = ("dockerfile", "containerfile", "makefile", "gemfile", "rakefile", "procfile", ".env")
DEFAULT_COMMENTS = C_COMMENTS + HASH_COMMENTS

# Локальні абсолютні шляхи, яких не має бути в Markdown бандла.
ABS_PATH_RE = re.compile(
    r"(?<![\w/\\])[A-Za-z]:[\\/](?=[\w.$%~-])"  # диск Windows
    r"|file:///"
    r"|(?<![\w.~])/(?:home|Users)/[\w.-]+"  # домашні каталоги Linux / macOS
)

SAMPLE_REPORT = """# Фінальний звіт етапу: Stage @@ID@@

- **Етап:** `Stage @@ID@@`
- **Статус аудиту @@REVIEWER@@:** `PASS`

## 1. Перевірені передумови (Pre-Flight Summary)

| Інструмент | Версія | Стан |
| :--- | :--- | :--- |
| Python | >= 3.10 | 3.12 |

## 2. Застосовані Best Practices vs найпростіший підхід

| Аспект | Найпростіший підхід | Best Practice | Що обрано |
| :--- | :--- | :--- | :--- |
| Секрети | у коді | змінні середовища | Best Practice |

## 3. Виконаний обсяг робіт (Deliverables)

- `docs/brief.md` — бриф.

## 4. Докази працездатності (Verification Evidence)

### 4.0. Валюта довіри (Trust Receipt)

| Перевірка | Команда | Код виходу | Лічильники | Повторив рев'юер | Примітка |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Валідатор етапу | verify-gate.py --stage @@ID@@ | 0 | 0 помилок | так | — |
| Тести | npm test | не застосовно | — | ні | документний етап |

### 4.1. Вивід

```text
verify-gate.py --stage @@ID@@ -> EXIT CODE 0
```

## 5. Матриця трасування вимог (Requirements Traceability)

| ID | Вимога | Де | Чим перевірено | Статус |
| :--- | :--- | :--- | :--- | :--- |
| US-1 | Вхід | docs/brief.md | рев'ю | OK |

## 6. Ризики, технічний борг і відкриті питання

Ризиків не виявлено.
@@LEARNING@@
## 7. Точка фіксації в Git (Recommended Git Commit Checkpoint)

Індексація лише явним списком, без `git add .`.

```bash
git add docs/brief.md @@REPORT@@ @@STATE@@
git commit -m "docs(stage-@@ID@@): перевірка валідатора"
```

### Рішення власника продукту (Human Approval Gate)

- [ ] **Approve & закоміть**
"""
SAMPLE_LEARNING_MAP = """
### 6.1. Карта технологій

| Технологія | Рівень | Концепції | Джерело |
| :--- | :--- | :--- | :--- |
| Git | **Знати** | коміти | https://git-scm.com/doc |
| ADR | **Розуміти** | рішення | https://adr.github.io |
| pytest | **Вміти** | фікстури | https://docs.pytest.org |
"""


# ---------- допоміжні функції ----------
def mask_secret(secret: str) -> str:
    """Маскує секрет, залишаючи лише перші 4 та останні 4 символи."""
    if len(secret) <= 8:
        return "************"
    return secret[:4] + "************" + secret[-4:]


def is_placeholder_secret(kind: str, value: str) -> bool:
    if value in SECRET_ALLOWED_VALUES:
        return True
    lower = value.lower()
    if kind == KIND_URL_PASSWORD and (lower in PLACEHOLDER_PASSWORDS or value.isdigit()):
        return True
    return any(marker in lower for marker in PLACEHOLDER_MARKERS)


def readiness_score(p0: int, p1: int, p2: int) -> str:
    """Enterprise Readiness Score за кількістю відкритих знахідок — формула розділу 13.2 контракту sdd-delivery."""
    if p0:
        return "F"
    if p1 or p2 >= 10:
        return "D"
    if p2 >= 4:
        return "C"
    return "B" if p2 else "A"


def is_filled(value) -> bool:
    """Значення заповнене: не null, не порожній рядок, не порожній список чи об'єкт (false і 0 — валідні)."""
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def suppression_state(marker_rx: re.Pattern, lines: list[str]) -> str | None:
    """'ok' — є позначка з причиною; 'no-reason' — позначка без причини; None — позначки немає."""
    state = None
    for line in lines:
        for m in marker_rx.finditer(line):
            tail = COMMENT_CLOSERS_RE.sub("", m.group("tail"))
            reason = REASON_RE.match(tail)
            if reason and len(reason.group(1).strip()) >= 3:
                return "ok"
            state = "no-reason"
    return state


def rule_allow_re(rule_id: str) -> re.Pattern:
    return re.compile(rf"gate-check:\s*allow\s+{re.escape(rule_id)}(?![\w.\-])(?P<tail>.*)$", re.IGNORECASE)


def comment_prefixes(path: Path) -> tuple[str, ...]:
    name = path.name.lower()
    if name.startswith(HASH_FILE_NAMES):
        return HASH_COMMENTS
    return COMMENT_STYLES.get(path.suffix.lower(), DEFAULT_COMMENTS)


def expand_braces(pattern: str) -> list[str]:
    """Розгортає фігурні дужки: a/*.{ts,tsx} -> [a/*.ts, a/*.tsx]."""
    m = re.search(r"\{([^{}]+)\}", pattern)
    if not m:
        return [pattern]
    head, tail = pattern[: m.start()], pattern[m.end():]
    result = []
    for option in m.group(1).split(","):
        result.extend(expand_braces(head + option + tail))
    return result


def glob_to_regex(pattern: str) -> re.Pattern:
    """Перетворює glob із підтримкою ** на regex для відносних posix-шляхів."""
    i, out = 0, []
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
    return re.compile("^" + "".join(out) + "$")


def compile_globs(patterns: list[str]) -> list[re.Pattern]:
    return [glob_to_regex(p) for pat in patterns for p in expand_braces(pat)]


def matches_any(rel_path: str, compiled: list[re.Pattern]) -> bool:
    return any(rx.match(rel_path) for rx in compiled)


def glob_base(pattern: str) -> str:
    """Найглибший каталог glob-шаблону без масок: '.agentic/specs/adr/*.md' -> '.agentic/specs/adr'."""
    prefix = re.split(r"[*?{\[]", pattern, maxsplit=1)[0]
    return prefix.rsplit("/", 1)[0] if "/" in prefix else ""


def iter_files(base: Path):
    """Обходить файли, пропускаючи службові каталоги (.git, node_modules, target, .venv тощо)."""
    if base.is_file():
        yield base
        return
    for root, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d not in IGNORED_DIRS)
        for name in sorted(files):
            yield Path(root) / name


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
        return value[1:-1]
    return value


def parse_frontmatter(text: str) -> dict | None:
    """Мінімальний розбір YAML frontmatter: key: value, блоки | і >, списки '- item'."""
    m = re.match(r"^\ufeff?---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", text, re.DOTALL)
    if not m:
        return None
    data: dict = {}
    lines = m.group(1).splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        i += 1
        if not line.strip() or line.startswith((" ", "\t", "-", "#")) or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key, value = key.strip(), value.strip()
        if value and not re.match(r"^[|>][+-]?\d*$", value):
            data[key] = strip_quotes(value)
            continue
        block = []
        while i < len(lines) and (not lines[i].strip() or lines[i].startswith((" ", "\t", "-"))):
            if lines[i].strip():
                block.append(lines[i].strip())
            i += 1
        if block and all(b.startswith("-") for b in block):
            data[key] = [strip_quotes(b[1:]) for b in block]
        else:
            data[key] = " ".join(block)
    return data


def frontmatter_yaml_problems(text: str) -> list[str]:
    """Значення без лапок, які справжній YAML-парсер Claude Code не прочитає: «: » або « #» усередині."""
    m = re.match(r"^﻿?---\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", text, re.DOTALL)
    if not m:
        return []
    problems = []
    for line in m.group(1).splitlines():
        if not line.strip() or line.startswith((" ", "\t", "-", "#")) or ":" not in line:
            continue
        key, _, value = line.partition(":")
        value = value.strip()
        if not value or value[0] in "'\"|>[{":
            continue
        if ": " in value or value.endswith(":") or " #" in value:
            problems.append(f"поле «{key.strip()}»: значення без лапок містить «: » або « #», YAML його не прочитає — візьми в лапки або перенеси в блок «>-»")
    return problems


def frontmatter_list(value) -> list[str]:
    if value is None:
        return []
    items = value if isinstance(value, list) else str(value).strip().strip("[]").split(",")
    return [strip_quotes(str(item)) for item in items if str(item).strip()]


def tool_name(entry: str) -> str:
    """'Bash(git status:*)' -> 'Bash'."""
    return entry.split("(", 1)[0].strip()


def split_sections(content: str) -> dict[int, tuple[str, str]]:
    """Ділить звіт на секції '## N. Назва' -> {N: (назва, тіло)}."""
    sections = {}
    matches = list(re.finditer(r"^##\s+(\d+)\.\s*(.*)$", content, re.MULTILINE))
    for idx, m in enumerate(matches):
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(content)
        sections.setdefault(int(m.group(1)), (m.group(2).strip(), content[m.end():end]))
    return sections


def table_data_rows(text: str) -> list[str]:
    rows = [ln for ln in text.splitlines() if ln.strip().startswith("|")]
    data = [r for r in rows if not re.match(r"^\s*\|[\s:|-]+\|\s*$", r)]
    return data[1:] if data else []


def git_add_commands(text: str) -> list[list[str]]:
    """Аргументи кожної команди `git add` у тексті, крім заперечень у прозі («без `git add .`»)."""
    commands = []
    for line in text.splitlines():
        for m in re.finditer(r"git\s+add\s+([^\n`;&|]*)", line):
            if NEGATION_BEFORE_RE.search(line[: m.start()]):
                continue
            commands.append(m.group(1).split())
    return commands


def parse_state_statuses(text: str, normalize) -> dict[str, str]:
    """Статуси етапів із таблиці трекера: колонка «Статус» за заголовком таблиці (запасний варіант — 5-та)."""
    statuses: dict[str, str] = {}
    status_col: int | None = None
    in_table = False
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            in_table, status_col = False, None
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if not in_table:
            in_table = True
            names = [c.strip("*` ").lower() for c in cells]
            status_col = next((i for i, n in enumerate(names) if n in ("статус", "status")), None)
            continue
        if status_col is None:
            continue
        m = re.match(r"^\*\*([0-9A-Za-z.]+)\*\*$", cells[0])
        if not m or status_col >= len(cells):
            continue
        stage_id = normalize(m.group(1))
        value = re.match(r"^[`*\s]*([A-Z][A-Z_]+)\b", cells[status_col])
        if stage_id and value:
            statuses.setdefault(stage_id, value.group(1))
    return statuses


def parse_sprint(text: str) -> int:
    """Номер поточного спринту з трекера; без рядка «**Спринт:**» — перший спринт."""
    for line in text.splitlines():
        m = SPRINT_LINE_RE.match(line.strip())
        if m:
            return int(m.group(2))
    return 1


def reset_sprint_state(text: str, stage_ids: set[str], normalize, sprint: int, active: str) -> str:
    """Трекер нового спринту: етапи спринту — `PENDING` без коміту, номер спринту й активний етап оновлено."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.splitlines()
    status_col = commit_col = None
    in_table = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith("|"):
            in_table, status_col, commit_col = False, None, None
            continue
        cells = stripped.strip("|").split("|")
        if not in_table:
            in_table = True
            names = [c.strip().strip("*` ").lower() for c in cells]
            status_col = next((j for j, n in enumerate(names) if n in ("статус", "status")), None)
            commit_col = next((j for j, n in enumerate(names) if n in ("коміт", "commit")), None)
            continue
        m = re.match(r"^\*\*([0-9A-Za-z.]+)\*\*$", cells[0].strip())
        if status_col is None or not m or normalize(m.group(1)) not in stage_ids or status_col >= len(cells):
            continue
        cells[status_col] = " `PENDING` "
        if commit_col is not None and commit_col < len(cells):
            cells[commit_col] = " — "
        lines[i] = line[: len(line) - len(line.lstrip())] + "|" + "|".join(cells) + "|"
    sprint_line = f"- **Спринт:** `{sprint}`"
    found = False
    for i, line in enumerate(lines):
        m = SPRINT_LINE_RE.match(line.strip())
        if m:
            lines[i] = line[: len(line) - len(line.lstrip())] + m.group(1) + str(sprint) + line.strip()[m.end():]
            found = True
            break
    for i, line in enumerate(lines):
        if "**Поточний активний етап:**" in line:
            lines[i] = re.sub(r"`[^`]*`", f"`{active}`", line, count=1)
            if not found:
                lines.insert(i + 1, sprint_line)
                found = True
            break
    if not found:
        lines += ["", sprint_line]
    return nl.join(lines) + (nl if text.endswith(("\n", "\r\n")) else "")


def decode_output(data: bytes) -> str:
    """Вивід команд: UTF-8, інакше OEM-/ANSI-кодування Windows або локалі."""
    if not data:
        return ""
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        pass
    encodings = []
    if os.name == "nt":
        try:
            import ctypes

            encodings.append(f"cp{ctypes.windll.kernel32.GetOEMCP()}")
        except Exception:
            pass
    encodings.append(locale.getpreferredencoding(False))
    for enc in encodings:
        try:
            return data.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return data.decode("utf-8", errors="replace")


UTF8_LAUNCHER = (
    "import ctypes, subprocess, sys; k = ctypes.windll.kernel32; k.SetConsoleOutputCP(65001); k.SetConsoleCP(65001); "
    "sys.exit(subprocess.call(sys.argv[1], shell=True))"
)


class Utf8Console:
    """UTF-8 вивід команд у Windows: cmd.exe перекодовує вивід вбудованих команд у кодову сторінку консолі,
    яку запам'ятовує під час старту (тому `chcp 65001` у тому самому рядку не допомагає).

    Є консоль — на час команд вона перемикається на UTF-8 (65001), а потім стара сторінка відновлюється.
    Консолі немає — команда запускається через короткий Python-лаунчер у власній прихованій консолі,
    який спершу вмикає 65001, а потім передає рядок команди оболонці без змін. В інших ОС нічого не змінюється.
    """

    def __init__(self):
        self.saved: tuple[int, int] | None = None
        self.private = False

    def __enter__(self) -> "Utf8Console":
        if os.name != "nt":
            return self
        try:
            import ctypes

            kernel32 = ctypes.windll.kernel32
            out_cp, in_cp = kernel32.GetConsoleOutputCP(), kernel32.GetConsoleCP()
            if out_cp and kernel32.SetConsoleOutputCP(65001):
                kernel32.SetConsoleCP(65001)
                self.saved = (out_cp, in_cp)
            else:
                self.private = True
        except Exception:
            self.private = True
        return self

    def __exit__(self, *exc) -> None:
        if self.saved:
            try:
                import ctypes

                ctypes.windll.kernel32.SetConsoleOutputCP(self.saved[0])
                ctypes.windll.kernel32.SetConsoleCP(self.saved[1])
            except Exception:
                pass

    def wrap(self, cmd: str) -> tuple[str | list[str], bool, int]:
        """Повертає (аргументи, shell, creationflags) для subprocess.run."""
        if self.private:
            return [sys.executable, "-I", "-c", UTF8_LAUNCHER, cmd], False, getattr(subprocess, "CREATE_NO_WINDOW", 0)
        return cmd, True, 0


def find_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    """Повертає цикл у графі залежностей етапів або None."""
    color = {node: 0 for node in graph}
    stack: list[str] = []

    def visit(node: str) -> list[str] | None:
        color[node] = 1
        stack.append(node)
        for dep in graph.get(node, []):
            if color.get(dep) == 1:
                return stack[stack.index(dep):] + [dep]
            if color.get(dep) == 0:
                found = visit(dep)
                if found:
                    return found
        stack.pop()
        color[node] = 2
        return None

    for node in graph:
        if color[node] == 0:
            found = visit(node)
            if found:
                return found
    return None


def artifact_spec_problems(stage_id: str, index: int, spec) -> list[str]:
    label = f"pipeline.json: етап {stage_id}, артефакт {index}"
    if not isinstance(spec, dict):
        return [f"{label}: має бути об'єктом"]
    problems = []
    if ("path" in spec) == ("glob" in spec):
        problems.append(f"{label}: потрібен рівно один із ключів 'path' або 'glob'")
    if "min" in spec and (not isinstance(spec["min"], int) or isinstance(spec["min"], bool) or spec["min"] < 1):
        problems.append(f"{label}: 'min' має бути цілим ≥ 1")
    for rx in spec.get("must_match", []):
        try:
            re.compile(rx)
        except (re.error, TypeError) as e:
            problems.append(f"{label}: невалідний regex у must_match '{rx}': {e}")
    keys = spec.get("json_keys", [])
    if not isinstance(keys, list) or not all(isinstance(k, str) and k for k in keys):
        problems.append(f"{label}: 'json_keys' має бути списком назв ключів")
    if "when" in spec and (not isinstance(spec["when"], str) or not spec["when"]):
        problems.append(f"{label}: 'when' має бути назвою ключа .agentic/project.json")
    unknown = sorted(set(spec) - {"path", "glob", "min", "must_match", "json_keys", "when"})
    if unknown:
        problems.append(f"{label}: невідомі ключі {', '.join(unknown)}")
    return problems


def pipeline_problems(pipeline: dict) -> list[str]:
    """Цілісність pipeline.json: ключі, унікальні ID і звіти, відомі й ациклічні залежності, артефакти."""
    stages = pipeline.get("stages")
    if not isinstance(stages, list) or not stages:
        return ["pipeline.json: немає непорожнього списку 'stages'"]
    problems = []
    for key in ("orchestrator", "reviewer", "paths", "statuses", "commit_types"):
        if not pipeline.get(key):
            problems.append(f"pipeline.json: немає ключа '{key}'")
    paths = pipeline.get("paths") or {}
    for key in DEFAULT_PATHS:
        if not paths.get(key):
            problems.append(f"pipeline.json → paths: немає '{key}'")
    statuses = pipeline.get("statuses") or {}
    approved, blocking = set(statuses.get("approved", [])), set(statuses.get("blocking", []))
    if not approved or not blocking:
        problems.append("pipeline.json → statuses: потрібні непорожні списки 'approved' і 'blocking'")
    if approved & blocking:
        problems.append(f"pipeline.json → statuses: статуси одночасно схвалені й блокувальні: {', '.join(sorted(approved & blocking))}")
    if not all(isinstance(t, str) and re.match(r"^[a-z]+$", t) for t in pipeline.get("commit_types", []) or []):
        problems.append("pipeline.json → commit_types: очікуються типи Conventional Commits у нижньому регістрі")

    ids = [str(s.get("id")) if isinstance(s, dict) else "?" for s in stages]
    duplicates = sorted({i for i in ids if ids.count(i) > 1})
    if duplicates:
        problems.append(f"pipeline.json: ідентифікатори етапів повторюються: {', '.join(duplicates)}")
    reports = [s.get("report") for s in stages if isinstance(s, dict)]
    dup_reports = sorted({r for r in reports if r and reports.count(r) > 1})
    if dup_reports:
        problems.append(f"pipeline.json: шляхи звітів повторюються: {', '.join(dup_reports)}")
    reports_dir = str(paths.get("reports_dir") or DEFAULT_PATHS["reports_dir"]).rstrip("/") + "/"
    known = set(ids)
    sprint = pipeline.get("sprint")
    if not isinstance(sprint, dict) or not isinstance(sprint.get("stages"), list) or not sprint["stages"]:
        problems.append("pipeline.json → sprint: потрібен непорожній список 'stages' (етапи, що повторюються щоспринту)")
    else:
        unknown = [str(s) for s in sprint["stages"] if str(s) not in known]
        if unknown:
            problems.append(f"pipeline.json → sprint.stages: невідомі етапи {', '.join(unknown)}")
        if not all(isinstance(p, str) and p.strip() for p in sprint.get("archive", []) or []):
            problems.append("pipeline.json → sprint.archive: очікується список шляхів")
    graph: dict[str, list[str]] = {}
    for stage in stages:
        if not isinstance(stage, dict):
            problems.append("pipeline.json: кожен етап має бути об'єктом")
            continue
        sid = str(stage.get("id"))
        for key in ("id", "title", "skill", "requires", "report", "artifacts"):
            if key not in stage:
                problems.append(f"pipeline.json: етап {sid} не має ключа '{key}'")
        deps = list(stage.get("requires", []) or []) + list(stage.get("gate_requires", []) or [])
        for dep in deps:
            if dep not in known:
                problems.append(f"pipeline.json: етап {sid} залежить від невідомого етапу {dep}")
        graph[sid] = [d for d in deps if d in known]
        if not str(stage.get("report", "")).startswith(reports_dir):
            problems.append(f"pipeline.json: звіт етапу {sid} має лежати в {reports_dir}")
        for flag in ("skippable", "run_required", "debt_checks"):
            if flag in stage and not isinstance(stage[flag], bool):
                problems.append(f"pipeline.json: етап {sid}: '{flag}' має бути true або false")
        if "red_team_report" in stage and not is_filled(stage["red_team_report"]):
            problems.append(f"pipeline.json: етап {sid}: 'red_team_report' має бути шляхом до звіту Red-Team")
        for idx, spec in enumerate(stage.get("artifacts", []) or [], start=1):
            problems.extend(artifact_spec_problems(sid, idx, spec))
    cycle = find_cycle(graph)
    if cycle:
        problems.append(f"pipeline.json: цикл залежностей {' → '.join(cycle)}")
    return problems


def stage_skill_problems(skill: str, text: str, stages: list[dict], reviewer: str) -> list[str]:
    """Структура SKILL.md скіла етапу: frontmatter, 6 заголовків у порядку, маркери 4 фаз, звіти й ID етапів."""
    problems = []
    fm = parse_frontmatter(text)
    if fm is None:
        problems.append("немає YAML frontmatter")
    else:
        if fm.get("name") != skill:
            problems.append(f"name у frontmatter ('{fm.get('name')}') не збігається з назвою папки")
        if not is_filled(fm.get("description")):
            problems.append("порожній description")
        problems.extend(frontmatter_yaml_problems(text))
    pos = 0
    for title, rx in STAGE_SKILL_HEADINGS:
        heading = re.compile(HEADING_PREFIX + rx, re.MULTILINE | re.IGNORECASE)
        m = heading.search(text, pos)
        if m:
            pos = m.end()
        elif heading.search(text):
            problems.append(f"заголовок «{title}» стоїть не на своєму місці")
        else:
            problems.append(f"немає заголовка «{title}»")
    for phase, regexes in phase_markers(reviewer):
        missing = [rx for rx in regexes if not re.search(rx, text, re.IGNORECASE)]
        if missing:
            problems.append(f"немає маркерів «{phase}»: {', '.join(missing)}")
    for stage in stages:
        if str(stage.get("report")) not in text:
            problems.append(f"не згадує звіт свого етапу {stage.get('report')}")
        sid = re.escape(str(stage.get("id")))
        if not re.search(rf"(?:stage|етап)\w*[\s:*`\-–—]*{sid}(?!\w|\.\w)", text, re.IGNORECASE):
            problems.append(f"не згадує етап {stage.get('id')} («Stage {stage.get('id')}» або «Етап {stage.get('id')}»)")
    return problems


def agent_problems(name: str, text: str) -> tuple[list[str], list[str]]:
    """Frontmatter субагента-рев'юера: name, description, інструменти лише для читання."""
    fm = parse_frontmatter(text)
    if fm is None:
        return ["немає YAML frontmatter"], []
    errors, warnings = [], []
    if fm.get("name") != name:
        errors.append(f"name у frontmatter ('{fm.get('name')}') не збігається з назвою файлу")
    if not is_filled(fm.get("description")):
        errors.append("порожній description")
    errors.extend(frontmatter_yaml_problems(text))
    tools = [tool_name(t) for t in frontmatter_list(fm.get("tools"))]
    disallowed = {tool_name(t) for t in frontmatter_list(fm.get("disallowedTools"))}
    if tools:
        writes = sorted(set(tools) & WRITE_TOOLS)
        if writes:
            errors.append(f"рев'юер не повинен мати інструментів запису: {', '.join(writes)}")
        unknown = sorted(t for t in set(tools) if t not in KNOWN_TOOLS and not t.startswith("mcp__"))
        if unknown:
            warnings.append(f"невідомі інструменти Claude Code: {', '.join(unknown)}")
    else:
        missing = sorted(REQUIRED_DISALLOWED - disallowed)
        if missing:
            errors.append(
                "немає поля tools: субагент успадкує всі інструменти, включно із записом "
                f"({', '.join(missing)}); задайте tools лише для читання"
            )
    return errors, warnings


# ---------- бандл ----------
class Bundle:
    """Бандл: pipeline.json, скіли, субагент-рев'юер, шаблони."""

    def __init__(self, root: Path):
        self.root = root
        self.skills_dir = root / "skills"
        self.agents_dir = root / "agents"
        self.rules_dir = root / "rules"
        self.pipeline_path = self.skills_dir / "gate-check" / "pipeline.json"
        self.load_error = None
        try:
            data = json.loads(self.pipeline_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise ValueError("очікується JSON-об'єкт")
        except Exception as e:
            data = {}
            self.load_error = f"Не вдалося прочитати {self.pipeline_path}: {e}"
        self.pipeline = data
        raw_stages = data.get("stages") if isinstance(data.get("stages"), list) else []
        self.stage_list = [s for s in raw_stages if isinstance(s, dict) and "id" in s]
        self.stages = {str(s["id"]): s for s in self.stage_list}
        statuses = data.get("statuses") or {}
        self.approved = set(statuses.get("approved", []))
        self.blocking = set(statuses.get("blocking", []))
        self.paths = {**DEFAULT_PATHS, **(data.get("paths") or {})}
        self.reviewer = data.get("reviewer") or "independent-reviewer"
        self.orchestrator = data.get("orchestrator") or ""
        self.commit_types = data.get("commit_types") or DEFAULT_COMMIT_TYPES

    def normalize_stage(self, raw) -> str | None:
        s = str(raw).strip().lower()
        s = re.sub(r"^stage[-_ ]?", "", s)
        s = re.sub(r"^0+(\d)", r"\1", s)
        m = re.match(r"^(\d+)([a-z])$", s)
        if m:
            s = f"{m.group(1)}.{m.group(2)}"
        return s if s in self.stages else None

    def stage_skills(self) -> dict[str, list[dict]]:
        result: dict[str, list[dict]] = {}
        for stage in self.stage_list:
            result.setdefault(str(stage.get("skill")), []).append(stage)
        return result

    def report_template(self) -> Path:
        return self.root / self.paths["report_template"]

    def template(self, name: str) -> Path:
        return self.report_template().parent / name

    def bundle_skill_names(self) -> tuple[list[str], str]:
        """Скіли бандла: з pipeline.json (helper_skills, якщо задано) або всі папки skills/*/SKILL.md."""
        core = {self.orchestrator, "gate-check", *(str(s.get("skill")) for s in self.stage_list)} - {"", "None"}
        helpers = self.pipeline.get("helper_skills")
        if isinstance(helpers, list):
            return sorted(core | {str(h) for h in helpers}), "pipeline.json → helper_skills"
        found = {p.parent.name for p in self.skills_dir.glob("*/SKILL.md") if not p.parent.name.startswith(".")}
        return sorted(core | found), "усі папки skills/*/SKILL.md"


# ---------- перевірки ----------
class GateVerifier:
    def __init__(self, project_root: Path, bundle: Bundle, silent: bool = False):
        self.root = project_root.resolve()
        self.bundle = bundle
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.silent = silent
        self._project: dict | None = None
        self._settings: dict | None = None
        self._ignored: tuple[set[str], tuple[str, ...]] | None = None

    # ---------- логування ----------
    def log_error(self, message: str):
        self.errors.append(message)
        if not self.silent:
            print(c_fail(message))

    def log_warning(self, message: str):
        self.warnings.append(message)
        if not self.silent:
            print(c_warn(message))

    def log_success(self, message: str):
        if not self.silent:
            print(c_pass(message))

    def log_info(self, message: str):
        if not self.silent:
            print(c_info(message))

    def log_header(self, message: str):
        if not self.silent:
            print(c_header(message))

    def rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    # ---------- файли проєкту ----------
    def project_path(self) -> Path:
        return self.root / self.bundle.paths["project"]

    def state_path(self) -> Path:
        return self.root / self.bundle.paths["state"]

    def git_ignored(self) -> tuple[set[str], tuple[str, ...]]:
        """Файли й каталоги, які Git ігнорує (.gitignore): їх не буде в коміті, тож сканер їх пропускає."""
        if self._ignored is None:
            files: set[str] = set()
            dirs: list[str] = []
            try:
                proc = subprocess.run(
                    ["git", "ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"],
                    cwd=self.root, capture_output=True, stdin=subprocess.DEVNULL, timeout=60,
                )
                if proc.returncode == 0:
                    for entry in proc.stdout.decode("utf-8", errors="replace").split("\0"):
                        if entry in ("", "./"):
                            continue
                        if entry.endswith("/"):
                            dirs.append(entry)
                        else:
                            files.add(entry)
            except (OSError, subprocess.SubprocessError):
                pass
            self._ignored = (files, tuple(dirs))
        return self._ignored

    def project_files(self, base: Path):
        """Файли для сканування: без службових каталогів і без того, що ігнорує Git. Явний файл — завжди."""
        if base.is_file():
            yield base
            return
        files, dirs = self.git_ignored()
        for path in iter_files(base):
            rel = self.rel(path)
            if rel.startswith(VENDOR_DIR + "/"):
                continue  # копія самого валідатора містить зразки секретів для самотестів
            if (files or dirs) and (rel in files or rel.startswith(dirs)):
                continue
            yield path

    def load_project(self) -> dict:
        if self._project is None:
            self._project = {}
            path = self.project_path()
            if path.exists():
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                except Exception as e:
                    self.log_error(f"{self.bundle.paths['project']} не є валідним JSON: {e}")
                else:
                    if isinstance(data, dict):
                        self._project = data
                    else:
                        self.log_error(f"{self.bundle.paths['project']} має бути JSON-об'єктом")
        return self._project

    def project_settings(self) -> dict:
        """verify_commands, debt_commands, quality_rules, disabled_rules з project.json — перевіряються один раз."""
        if self._settings is not None:
            return self._settings
        settings: dict = {"commands": {}, "rules": [], "disabled": {}, "debt": {}, "debt_na": {}, "debt_keys": set()}
        self._settings = settings
        name = self.bundle.paths["project"]
        project = self.load_project()
        if not self.project_path().exists():
            self.log_info(f"{name} не знайдено: команди перевірки й правила якості не задані")
            return settings

        commands = project.get("verify_commands")
        if commands is None:
            commands = {}
        if not isinstance(commands, dict):
            self.log_error(f"{name} → verify_commands має бути об'єктом «ID етапу → список команд»")
            commands = {}
        for key, value in commands.items():
            stage_id = self.bundle.normalize_stage(key)
            if not stage_id:
                self.log_warning(f"{name} → verify_commands: невідомий етап '{key}' (допустимі: {', '.join(self.bundle.stages)})")
                continue
            if not isinstance(value, list) or not all(isinstance(c, str) and c.strip() for c in value):
                self.log_error(f"{name} → verify_commands['{key}'] має бути списком непорожніх рядків-команд")
                continue
            settings["commands"].setdefault(stage_id, []).extend(value)

        debt = project.get("debt_commands")
        if debt is None:
            debt = {}
        if not isinstance(debt, dict):
            self.log_error(f"{name} → debt_commands має бути об'єктом «аспект → список команд або {{\"not_applicable\": \"<причина>\"}}»")
            debt = {}
        settings["debt_keys"] = set(debt)
        for aspect, value in debt.items():
            label = f"{name} → debt_commands['{aspect}']"
            if aspect not in DEBT_ASPECTS:
                self.log_warning(f"{label}: невідомий аспект (допустимі: {', '.join(DEBT_ASPECTS)})")
            if isinstance(value, dict) and set(value) == {"not_applicable"}:
                reason = value["not_applicable"]
                if not isinstance(reason, str) or not reason.strip():
                    self.log_error(f"{label}: «не застосовно» без причини — потрібен факт про продукт")
                elif NON_FACT_REASON_RE.search(reason):
                    self.log_error(f"{label}: причина «{reason}» не є фактом про продукт — розмір чи навчальна мета перевірку не знімають (розділ 13 контракту sdd-delivery)")
                else:
                    settings["debt_na"][aspect] = reason
            elif isinstance(value, list) and value and all(isinstance(c, str) and c.strip() for c in value):
                settings["debt"][aspect] = value
            else:
                self.log_error(f"{label} має бути непорожнім списком команд або {{\"not_applicable\": \"<причина>\"}}")

        rules = project.get("quality_rules")
        if rules is None:
            rules = []
        if not isinstance(rules, list):
            self.log_error(f"{name} → quality_rules має бути списком правил")
            rules = []
        seen: set[str] = set()
        for idx, rule in enumerate(rules, start=1):
            label = f"{name} → quality_rules[{idx}]"
            if not isinstance(rule, dict):
                self.log_error(f"{label}: правило має бути об'єктом")
                continue
            missing = [k for k in ("id", "severity", "globs", "pattern", "message") if not is_filled(rule.get(k))]
            if missing:
                self.log_error(f"{label} ({rule.get('id', 'без id')}): немає ключів {', '.join(missing)}")
                continue
            rule_id = str(rule["id"])
            if rule_id in seen:
                self.log_error(f"{label}: правило {rule_id} повторюється")
                continue
            seen.add(rule_id)
            if rule["severity"] not in ("error", "warning"):
                self.log_error(f"{label} ({rule_id}): severity має бути 'error' або 'warning'")
                continue
            globs, exclude = rule["globs"], rule.get("exclude", [])
            if not isinstance(globs, list) or not isinstance(exclude, list):
                self.log_error(f"{label} ({rule_id}): globs і exclude мають бути списками шаблонів")
                continue
            try:
                rx = re.compile(rule["pattern"])
            except re.error as e:
                self.log_error(f"{label} ({rule_id}): невалідний regex: {e}")
                continue
            settings["rules"].append({
                "id": rule_id, "severity": rule["severity"], "message": str(rule["message"]), "rx": rx,
                "globs": compile_globs(globs), "exclude": compile_globs(exclude),
                "skip_comments": rule.get("skip_comments", True) is not False, "allow": rule_allow_re(rule_id),
            })

        disabled = project.get("disabled_rules")
        if disabled is None:
            disabled = []
        if not isinstance(disabled, list):
            self.log_error(f"{name} → disabled_rules має бути списком об'єктів {{\"id\", \"reason\"}}")
            disabled = []
        for item in disabled:
            if not isinstance(item, dict) or not is_filled(item.get("id")):
                self.log_error(
                    f"{name} → disabled_rules: запис {json.dumps(item, ensure_ascii=False)} має бути об'єктом {{\"id\", \"reason\"}}"
                )
                continue
            if not is_filled(item.get("reason")):
                self.log_error(f"{name} → disabled_rules: правило {item['id']} вимкнено без причини ('reason')")
                continue
            settings["disabled"][str(item["id"])] = str(item["reason"])
            if str(item["id"]) not in seen:
                self.log_warning(f"{name} → disabled_rules: правила {item['id']} немає серед quality_rules")
        return settings

    def get_pipeline_statuses(self) -> dict[str, str]:
        path = self.state_path()
        if not path.exists():
            return {}
        return parse_state_statuses(path.read_text(encoding="utf-8", errors="replace"), self.bundle.normalize_stage)

    # ---------- артефакти ----------
    def check_artifact(self, spec: dict, project: dict) -> None:
        label = spec.get("path") or spec.get("glob")
        when = spec.get("when")
        if when:
            value = project.get(when)
            if not value:
                if value is None:
                    self.log_warning(f"Ключ '{when}' у {self.bundle.paths['project']} не заповнено: артефакт {label} вважається незастосовним")
                self.log_info(f"Артефакт {label}: не застосовно ({when} = {json.dumps(value)})")
                return

        if "glob" in spec:
            compiled = compile_globs([spec["glob"]])
            base = self.root / glob_base(spec["glob"])
            count = sum(1 for f in iter_files(base) if matches_any(self.rel(f), compiled)) if base.exists() else 0
            minimum = int(spec.get("min", 1))
            if count < minimum:
                self.log_error(f"Артефакт '{spec['glob']}': знайдено {count} файлів, потрібно щонайменше {minimum}")
            else:
                self.log_success(f"Артефакт '{spec['glob']}': {count} файлів")
            return

        path = self.root / spec["path"]
        if not path.is_file():
            self.log_error(f"Обов'язковий артефакт не знайдено: {spec['path']}")
            return
        text = path.read_text(encoding="utf-8", errors="replace")
        problems = [rx for rx in spec.get("must_match", []) if not re.search(rx, text)]
        for rx in problems:
            self.log_error(f"Артефакт {spec['path']} не містить обов'язкового фрагмента (regex: {rx})")
        if spec.get("json_keys"):
            try:
                data = json.loads(text)
            except Exception as e:
                self.log_error(f"Артефакт {spec['path']} не є валідним JSON: {e}")
                return
            if not isinstance(data, dict):
                self.log_error(f"Артефакт {spec['path']} має бути JSON-об'єктом")
                return
            for key in spec["json_keys"]:
                if not is_filled(data.get(key)):
                    shown = "немає" if key not in data else json.dumps(data[key], ensure_ascii=False)
                    self.log_error(f"У {spec['path']} не заповнено ключ '{key}' (значення: {shown})")
                    problems.append(key)
        if not problems:
            self.log_success(f"Артефакт {spec['path']} знайдено")

    # ---------- звіт ----------
    def stage_for_report(self, report_path: Path) -> str | None:
        rel = self.rel(report_path)
        for sid, stage in self.bundle.stages.items():
            if rel == stage.get("report") or report_path.name == Path(str(stage.get("report"))).name:
                return sid
        return None

    def receipt_rows_required(self, stage_id: str | None) -> list[str]:
        """Рядки 4.0, без яких звіт не приймається: на етапі запуску оракула — «Оракул», а з holdouts_command — ще «Holdouts»."""
        if not stage_id or self.bundle.stages.get(stage_id, {}).get("oracle") != "run":
            return []
        oracle = self.load_project().get("oracle")
        if not isinstance(oracle, dict) or not oracle:
            return []
        return ["Оракул", "Holdouts"] if oracle.get("holdouts_command") else ["Оракул"]

    def check_trust_receipt(self, section4: str, name: str, required: list[str] | None = None) -> None:
        """Розділ 4.0 «Валюта довіри»: кожна перевірка з кодом виходу, невиконана — з причиною, хоча б одна повторена рев'юером."""
        receipt = re.search(r"^###\s*4\.0\.?[^\n]*\n(.*?)(?=^#{2,3}\s|\Z)", section4, re.MULTILINE | re.DOTALL)
        if not receipt:
            self.log_error(f"У звіті {name} немає розділу «### 4.0. Валюта довіри» з квитанцією перевірок")
            return
        rows = [[c.strip().strip("`").strip() for c in r.strip().strip("|").split("|")] for r in table_data_rows(receipt.group(1))]
        if not rows:
            self.log_error(f"Розділ 4.0 «Валюта довіри» у {name} порожній")
            return
        repeated = False
        for cells in rows:
            if len(cells) < 6:
                self.log_error(f"Рядок «Валюти довіри» у {name} має {len(cells)} колонок замість 6: {' | '.join(cells)}")
                continue
            check, code, note, again = cells[0], cells[2], cells[5], cells[4]
            if re.fullmatch(r"\d+", code):
                if code != "0":
                    self.log_error(f"Перевірка «{check}» у «Валюті довіри» {name} має код виходу {code}: гейт неможливий")
            elif re.match(r"(?i)не запускалось|не застосовно", code):
                if not note or note in {"—", "-"}:
                    self.log_error(f"Перевірка «{check}» у {name} позначена «{code}» без причини в примітці")
            else:
                self.log_error(f"Перевірка «{check}» у «Валюті довіри» {name}: код виходу «{code}» — потрібне число або «не запускалось» / «не застосовно» з причиною")
            repeated = repeated or again.lower().startswith("так")
        for label in required or []:
            if not any(label.lower() in cells[0].lower() for cells in rows):
                self.log_error(f"У «Валюті довіри» {name} немає обов'язкового рядка «{label}»")
        if not repeated:
            self.log_error(f"У «Валюті довіри» {name} жодну перевірку не повторив рев'юер (колонка «Повторив рев'юер»)")
        else:
            self.log_success(f"«Валюта довіри»: {len(rows)} перевірок із кодами виходу")

    def validate_report_file(self, report_path: Path, stage_id: str | None = None, learning_mode: bool | None = None) -> bool:
        """Перевіряє 7 секцій звіту, заповненість, вердикт рев'юера та Git checkpoint."""
        if not report_path.is_file():
            self.log_error(f"Файл звіту не знайдено: {self.rel(report_path)}")
            return False
        content = report_path.read_text(encoding="utf-8", errors="replace")
        initial = len(self.errors)
        name = self.rel(report_path)
        reviewer = self.bundle.reviewer
        state_rel = self.bundle.paths["state"]
        self.log_info(f"Перевірка звіту: {name}")
        if learning_mode is None:
            learning_mode = self.load_project().get("learning_mode") is True
        if stage_id is None:
            stage_id = self.stage_for_report(report_path)

        sections = split_sections(content)
        for num, (title, rx) in REPORT_SECTIONS.items():
            if num not in sections or not rx.search(sections[num][0]):
                self.log_error(f"У звіті {name} немає секції '## {num}. …' ({title})")
        body = {num: sections.get(num, ("", ""))[1] for num in REPORT_SECTIONS}

        found = [marker for marker in TEMPLATE_PLACEHOLDERS if marker in content]
        for marker in found:
            self.log_error(f"У звіті {name} лишився незаповнений маркер шаблону: '{marker}'")
        for m in GENERIC_PLACEHOLDER_RE.finditer(content):
            if not any(marker in m.group(0) for marker in found):
                self.log_error(f"У звіті {name} лишився незаповнений маркер: {m.group(0)}")

        first_section = re.search(r"^##\s", content, re.MULTILINE)
        header = content[: first_section.start()] if first_section else content
        status = re.search(rf"Статус аудиту[^\n]*{re.escape(reviewer)}[^\n]*?:([^\n]*)", header, re.IGNORECASE)
        if not status:
            self.log_error(f"У шапці звіту {name} немає рядка 'Статус аудиту {reviewer}: PASS'")
        elif "BLOCKERS" in status.group(1).upper() or not re.match(r"[\s*`\[]*PASS\b", status.group(1)):
            self.log_error(f"Статус аудиту {reviewer} у {name} не PASS: '{status.group(1).strip()}'")
        else:
            self.log_success(f"Статус аудиту {reviewer}: PASS")

        if not re.search(r"^\s*(?:[-*]|\d+\.)\s+\S", body[3], re.MULTILINE) and not table_data_rows(body[3]):
            self.log_error(f"Секція 3 звіту {name} не містить переліку файлів")
        code_blocks = [b for b in re.findall(r"```[^\n]*\n(.*?)```", body[4], re.DOTALL) if b.strip()]
        if not code_blocks:
            self.log_error(f"Секція 4 звіту {name} не містить жодного блоку з виводом перевірок")
        self.check_trust_receipt(body[4], name, self.receipt_rows_required(stage_id))
        if not table_data_rows(body[5]):
            self.log_error(f"Матриця трасування (секція 5) у {name} порожня")
        risks = body[6].split("### 6.1", 1)[0]
        if not table_data_rows(risks) and not re.search(r"не виявлено", risks, re.IGNORECASE):
            self.log_error(f"Секція 6 звіту {name} порожня (опишіть ризики або явно вкажіть «Ризиків не виявлено»)")
        if learning_mode:
            levels = re.findall(r"^\|[^\n]*\|\s*\*\*(Знати|Розуміти|Вміти)\*\*\s*\|", body[6], re.MULTILINE)
            if len(levels) < 3:
                self.log_error(
                    f"Навчальний режим увімкнено, але в карті технологій {name} лише {len(levels)} рядків «Знати / Розуміти / Вміти» (потрібно ≥ 3)"
                )
            else:
                self.log_success(f"Карта технологій заповнена ({len(levels)} рядків)")

        git = body[7]
        if not re.search(r"Approve & закоміть|Human Approval Gate", content, re.IGNORECASE):
            self.log_error(f"У звіті {name} немає блоку Human Approval Gate")
        for args in git_add_commands(content):
            if MASS_ADD_ARGS & set(args):
                self.log_error(f"У звіті {name} є заборонена масова індексація: git add {' '.join(args)} (лише явний список файлів)")
                break
        add_args = [a for args in git_add_commands(git) for a in args]
        report_ref = self.rel(report_path)
        if not add_args:
            self.log_error(f"У секції 7 звіту {name} немає команди git add з явним списком файлів")
        else:
            if not any(a.strip("'\"") == state_rel or a.strip("'\"").endswith("/" + state_rel) for a in add_args):
                self.log_error(f"У секції 7 звіту {name} команда git add не індексує {state_rel}")
            if not any(a.strip("'\"") == report_ref or Path(a.strip("'\"")).name == report_path.name for a in add_args):
                self.log_error(f"У секції 7 звіту {name} команда git add не індексує сам звіт {report_path.name}")
        types = "|".join(re.escape(t) for t in self.bundle.commit_types)
        commit = re.search(rf"git\s+commit\s+(?:-[\w-]+\s+)*?-m\s+[\"']({types})\(stage-([0-9a-zA-Z.]+)\)!?:\s*\S[^\n]*", git)
        if not commit:
            self.log_error(
                f"У секції 7 звіту {name} немає валідного Conventional Commit: git commit -m \"<type>(stage-<ID>): <опис>\" "
                f"(type: {', '.join(self.bundle.commit_types)})"
            )
        elif stage_id and self.bundle.normalize_stage(commit.group(2)) != stage_id:
            self.log_error(f"Scope коміту stage-{commit.group(2)} у {name} не відповідає етапу stage-{stage_id}")
        else:
            self.log_success("Conventional Commit у секції 7 валідний")

        return len(self.errors) == initial

    # ---------- секрети ----------
    def scan_secrets(self, scan_path: Path) -> bool:
        if not scan_path.exists():
            self.log_error(f"Шлях для сканування секретів не знайдено: {scan_path}")
            return False
        self.log_header(f"Сканування секретів: {self.rel(scan_path)}")
        initial, scanned, suppressed = len(self.errors), 0, 0
        for path in self.project_files(scan_path):
            if path.suffix.lower() in BINARY_EXTENSIONS or path.name == SCRIPT_PATH.name:
                continue
            try:
                if path.stat().st_size > MAX_SCAN_BYTES:
                    self.log_info(f"Пропущено файл понад {MAX_SCAN_BYTES // (1024 * 1024)} МБ: {self.rel(path)}")
                    continue
                raw = path.read_bytes()
            except OSError:
                continue
            if b"\0" in raw[:8192]:
                continue
            scanned += 1
            lines = raw.decode("utf-8", errors="ignore").splitlines()
            for num, line in enumerate(lines, start=1):
                findings: dict[str, str] = {}
                for kind, rx, group in SECRET_PATTERNS:
                    for m in rx.finditer(line):
                        value = m.group(group)
                        if kind != KIND_PRIVATE_KEY and is_placeholder_secret(kind, value):
                            continue
                        findings.setdefault(value, kind)
                if not findings:
                    continue
                mark = suppression_state(SECRET_ALLOW_RE, [line] + ([lines[num - 2]] if num > 1 else []))
                if mark == "ok":
                    suppressed += 1
                    continue
                hint = " (позначка allow-secret без причини не діє)" if mark == "no-reason" else ""
                for value, kind in findings.items():
                    self.log_error(f"Можливий витік ({kind}) '{mask_secret(value)}' у {self.rel(path)}:{num}{hint}")
        if scan_path.resolve() == self.root:
            self.check_tracked_env_files()
        self.log_info(f"Проскановано файлів: {scanned}")
        if suppressed:
            self.log_info(f"Придушено позначками gate-check: allow-secret — {suppressed}")
        if len(self.errors) == initial:
            self.log_success("Відкритих секретів не виявлено")
            return True
        return False

    def check_tracked_env_files(self) -> None:
        try:
            proc = subprocess.run(
                ["git", "ls-files", "-z", "--", ".env", ".env.*", "*/.env", "*/.env.*"],
                cwd=self.root, capture_output=True, stdin=subprocess.DEVNULL, timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            return
        if proc.returncode != 0:
            return
        for tracked in proc.stdout.decode("utf-8", errors="replace").split("\0"):
            if tracked and not tracked.endswith((".example", ".sample", ".template", ".dist")):
                self.log_error(f"Файл зі змінними середовища відстежується Git: {tracked} (додайте в .gitignore і приберіть з індексу)")

    # ---------- якість коду ----------
    def check_code_quality(self, target: Path, explicit: bool = False) -> bool:
        settings = self.project_settings()
        name = self.bundle.paths["project"]
        if not target.exists():
            self.log_warning(f"Шлях для перевірки якості коду не знайдено: {self.rel(target)}")
            return True
        self.log_header(f"Правила якості коду: {self.rel(target)}")
        if not settings["rules"]:
            (self.log_warning if explicit else self.log_info)(f"У {name} немає quality_rules: правила якості не застосовуються")
            return True
        initial, checked, suppressed = len(self.errors), 0, 0
        active = []
        for rule in settings["rules"]:
            if rule["id"] in settings["disabled"]:
                self.log_info(f"Правило {rule['id']} вимкнено в {name}: {settings['disabled'][rule['id']]}")
            else:
                active.append(rule)
        for path in self.project_files(target):
            rel = self.rel(path)
            applicable = [r for r in active if matches_any(rel, r["globs"]) and not matches_any(rel, r["exclude"])]
            if not applicable:
                continue
            checked += 1
            try:
                lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
            except OSError:
                continue
            prefixes = comment_prefixes(path)
            for num, line in enumerate(lines, start=1):
                stripped = line.strip()
                is_comment = stripped.startswith(prefixes)
                for rule in applicable:
                    if is_comment and rule["skip_comments"]:
                        continue
                    if not rule["rx"].search(line):
                        continue
                    mark = suppression_state(rule["allow"], [line] + ([lines[num - 2]] if num > 1 else []))
                    if mark == "ok":
                        suppressed += 1
                        continue
                    hint = " (позначка gate-check: allow без причини не діє)" if mark == "no-reason" else ""
                    message = f"[{rule['id']}] {rule['message']} — {rel}:{num}{hint}\n  -> {stripped[:200]}"
                    if rule["severity"] == "warning":
                        self.log_warning(message)
                    else:
                        self.log_error(message)
        if suppressed:
            self.log_info(f"Придушено позначками gate-check: allow — {suppressed} (кожна з причиною в коді)")
        if len(self.errors) == initial:
            self.log_success(f"Перевірено файлів: {checked}, порушень-помилок немає")
            return True
        return False

    # ---------- команди ----------
    def run_commands(self, commands: list[str]) -> bool:
        """Виконує команди через системну оболонку (cmd.exe у Windows, /bin/sh деінде) у корені проєкту."""
        initial = len(self.errors)
        env = os.environ.copy()
        env.setdefault("PYTHONIOENCODING", "utf-8")
        with Utf8Console() as console:
            for cmd in commands:
                self.log_info(f"$ {cmd}")
                self._run_one(cmd, env, console)
        return len(self.errors) == initial

    def _run_one(self, cmd: str, env: dict, console: "Utf8Console") -> None:
        args, shell, flags = console.wrap(cmd)
        try:
            proc = subprocess.run(
                args, shell=shell, cwd=self.root, capture_output=True, stdin=subprocess.DEVNULL,
                timeout=COMMAND_TIMEOUT, env=env, creationflags=flags,
            )
        except subprocess.TimeoutExpired:
            self.log_error(f"Команда перевищила ліміт {COMMAND_TIMEOUT // 60} хв: {cmd}")
            return
        except OSError as e:
            self.log_error(f"Команду не вдалося запустити: {cmd}: {e}")
            return
        if proc.returncode != 0:
            output = (decode_output(proc.stdout) + "\n" + decode_output(proc.stderr)).strip()
            tail = "\n".join(output.splitlines()[-20:])
            self.log_error(f"Команда завершилась з кодом {proc.returncode}: {cmd}" + (f"\n{tail}" if tail else ""))
        else:
            self.log_success(f"Команда успішна: {cmd}")

    def check_stage_commands(self, stage_id: str, stage: dict, run: bool) -> None:
        commands = self.project_settings()["commands"].get(stage_id, [])
        key = f"{self.bundle.paths['project']} → verify_commands['{stage_id}']"
        if run:
            self.log_header(f"Команди перевірки етапу {stage_id}")
            if commands:
                self.run_commands(commands)
            elif stage.get("run_required"):
                self.log_error(f"Етап {stage_id} вимагає команд перевірки, але {key} не задано")
            else:
                self.log_info(f"Для етапу {stage_id} команд перевірки немає ({key})")
        elif commands:
            self.log_info(f"Команди перевірки етапу {stage_id} ({len(commands)}) не запускались: додайте --run")
        elif stage.get("run_required"):
            self.log_warning(f"Етап {stage_id} вимагає команд перевірки, але {key} не задано (з --run це помилка)")

    # ---------- виміряний борг і Red-Team ----------
    def check_debt(self, run: bool) -> None:
        """debt_commands: кожен аспект — команди з порогом або «не застосовно» з причиною; з run — запуск кожної команди один раз."""
        settings = self.project_settings()
        name = f"{self.bundle.paths['project']} → debt_commands"
        self.log_header("Виміряний технічний борг (debt_commands)")
        initial = len(self.errors)
        for aspect, title in DEBT_ASPECTS.items():
            if aspect not in settings["debt_keys"]:
                self.log_error(f"{name}: немає аспекту «{aspect}» ({title}) — команда з порогом або {{\"not_applicable\": \"<фактична причина>\"}}")
        for aspect, reason in settings["debt_na"].items():
            self.log_info(f"Аспект {aspect}: не застосовно — {reason}")
        commands = list(dict.fromkeys(c for cmds in settings["debt"].values() for c in cmds))
        if run:
            self.run_commands(commands)
        elif commands:
            self.log_info(f"Команди виміру боргу ({len(commands)}) не запускались: додайте --run")
        if len(self.errors) == initial:
            self.log_success(f"debt_commands: {len(DEBT_ASPECTS)} аспектів задано")

    def check_red_team_report(self, rel_path: str) -> None:
        """Звіт Red-Team: оцінка A–F за формулою, без відкритих P0/P1, кожна знахідка P2 — у реєстрі боргу."""
        path = self.root / rel_path
        if not path.is_file():
            return  # відсутній звіт уже показала перевірка артефактів
        self.log_header("Red-Team: оцінка A–F і реєстр боргу")
        text = path.read_text(encoding="utf-8", errors="replace")
        findings = dict(FINDING_ROW_RE.findall(text))
        counts = {level: sum(1 for lvl in findings.values() if lvl == level) for level in ("P0", "P1", "P2")}
        shown = ", ".join(f"{k} = {v}" for k, v in counts.items())
        expected = readiness_score(counts["P0"], counts["P1"], counts["P2"])
        score = SCORE_RE.search(text)
        if not score:
            self.log_error(f"У {rel_path} немає рядка «Enterprise Readiness Score: <A–F>»")
        elif score.group(1) != expected:
            self.log_error(f"Enterprise Readiness Score {score.group(1)} у {rel_path} не відповідає знахідкам ({shown}): за формулою розділу 13.2 контракту — {expected}")
        else:
            self.log_success(f"Enterprise Readiness Score {expected} відповідає знахідкам ({shown})")
        verdict = VERDICT_RE.search(text)
        if not verdict:
            self.log_error(f"У {rel_path} немає рядка «VERDICT: PASS» або «VERDICT: FAIL»")
        if counts["P0"] or counts["P1"]:
            self.log_error(f"У {rel_path} відкриті P0/P1 ({shown}): гейт неможливий — ремедіація й повторний аудит")
        elif verdict and verdict.group(1) == "FAIL":
            self.log_error(f"У {rel_path} VERDICT: FAIL, але в таблиці «Знахідки» немає P0/P1 — звіт суперечливий")
        debt_ids = sorted(fid for fid, lvl in findings.items() if lvl == "P2")
        for fid in (f for f in debt_ids if not DEBT_ID_RE.match(f)):
            self.log_error(f"Знахідка P2 {fid} у {rel_path} має мати ID реєстру боргу TD-NNN")
        debt_ids = [f for f in debt_ids if DEBT_ID_RE.match(f)]
        if not debt_ids:
            return
        registry_rel = self.bundle.paths["tech_debt"]
        registry = self.root / registry_rel
        if not registry.is_file():
            self.log_error(f"Знахідок P2 у {rel_path}: {len(debt_ids)}, але реєстру боргу {registry_rel} немає (шаблон {DEBT_TEMPLATE})")
            return
        rows = table_data_rows(registry.read_text(encoding="utf-8", errors="replace"))
        known = {r.strip().strip("|").split("|")[0].strip().strip("`*").strip() for r in rows}
        missing = [f for f in debt_ids if f not in known]
        if missing:
            self.log_error(f"Знахідки P2 з {rel_path} без запису в реєстрі боргу {registry_rel}: {', '.join(missing)}")
        else:
            self.log_success(f"Реєстр боргу {registry_rel}: усі знахідки P2 ({len(debt_ids)}) на місці")

    # ---------- оракул і holdouts ----------
    def git(self, *args: str) -> subprocess.CompletedProcess | None:
        try:
            return subprocess.run(["git", *args], cwd=self.root, capture_output=True, stdin=subprocess.DEVNULL, timeout=60)
        except (OSError, subprocess.SubprocessError):
            return None

    def oracle_settings(self) -> dict | None:
        """oracle з project.json: paths (glob-и приймальних тестів), command, необов'язково holdouts_command."""
        oracle = self.load_project().get("oracle")
        if oracle is None:
            return None
        name = f"{self.bundle.paths['project']} → oracle"
        if not isinstance(oracle, dict):
            self.log_error(f"{name} має бути об'єктом {{\"paths\", \"command\", \"holdouts_command\"}}")
            return None
        ok = True
        paths = oracle.get("paths")
        if not isinstance(paths, list) or not paths or not all(isinstance(p, str) and p.strip() for p in paths):
            self.log_error(f"{name}.paths має бути непорожнім списком glob-шаблонів приймальних тестів")
            ok = False
        if not isinstance(oracle.get("command"), str) or not oracle["command"].strip():
            self.log_error(f"{name}.command — команда запуску приймальних тестів — не задана")
            ok = False
        hold = oracle.get("holdouts_command")
        if hold is not None and (not isinstance(hold, str) or not hold.strip()):
            self.log_error(f"{name}.holdouts_command має бути непорожнім рядком або відсутнім")
            ok = False
        return oracle if ok else None

    def define_stage(self) -> str | None:
        return next((sid for sid, s in self.bundle.stages.items() if s.get("oracle") == "define"), None)

    def oracle_baseline(self) -> str | None:
        sid = self.define_stage()
        proc = self.git("log", "--fixed-strings", f"--grep=(stage-{sid})", "--format=%H", "-1") if sid else None
        if proc is None or proc.returncode != 0:
            return None
        return proc.stdout.decode("utf-8", errors="replace").strip() or None

    def holdout_files(self) -> list[Path]:
        folder = self.root / HOLDOUTS_DIR
        return [p for p in folder.rglob("*") if p.is_file()] if folder.is_dir() else []

    def check_holdouts(self, oracle: dict) -> bool:
        """Holdouts лежать лише в робочому дереві: у Git їх видно в історії, тож вони вже не приховані."""
        tracked = self.git("ls-files", "--", HOLDOUTS_DIR)
        if tracked is not None and tracked.returncode == 0 and tracked.stdout.strip():
            self.log_error(f"{HOLDOUTS_DIR}/ відстежується Git: holdouts видно в історії. Додайте його в .gitignore і приберіть з індексу (git rm -r --cached {HOLDOUTS_DIR})")
        files = self.holdout_files()
        if not files:
            self.log_warning(f"Holdouts не задано ({HOLDOUTS_DIR}/ порожній): рекомендовано кілька прихованих сценаріїв")
            return False
        if not oracle.get("holdouts_command"):
            self.log_error(f"У {HOLDOUTS_DIR}/ є файли, але oracle.holdouts_command не задано")
            return False
        self.log_success(f"Holdouts: {len(files)} файлів (вміст не показується)")
        return True

    def run_holdouts(self, oracle: dict) -> None:
        """Запускає holdouts і показує лише код виходу: вивід міг би розкрити приховані сценарії."""
        if not self.check_holdouts(oracle):
            return
        cmd = oracle["holdouts_command"]
        env = os.environ.copy()
        env.setdefault("PYTHONIOENCODING", "utf-8")
        with Utf8Console() as console:
            args, shell, flags = console.wrap(cmd)
            try:
                proc = subprocess.run(args, shell=shell, cwd=self.root, capture_output=True, stdin=subprocess.DEVNULL,
                                      timeout=COMMAND_TIMEOUT, env=env, creationflags=flags)
            except (OSError, subprocess.SubprocessError) as e:
                self.log_error(f"Holdouts не вдалося запустити: {e}")
                return
        if proc.returncode != 0:
            self.log_error(f"Holdouts: код виходу {proc.returncode} (вивід приховано; деталі — у власника)")
        else:
            self.log_success("Holdouts: код виходу 0")

    def check_oracle(self, stage_id: str, mode: str, run: bool) -> None:
        """define — оракул задано й тести існують; protect — тести не змінено від коміту етапу define; run — ще й запуск."""
        self.log_header(f"Оракул (приймальні тести) — режим {mode}")
        oracle = self.oracle_settings()
        if oracle is None:
            if "oracle" not in self.load_project():
                if mode == "define":
                    self.log_error(f"У {self.bundle.paths['project']} немає oracle: приймальні тести мають бути написані до коду (paths, command)")
                else:
                    self.log_error(f"У {self.bundle.paths['project']} немає oracle: етап {self.define_stage()} мав визначити приймальні тести")
            return
        compiled = compile_globs(oracle["paths"])
        files = [self.rel(p) for p in iter_files(self.root) if matches_any(self.rel(p), compiled)]
        if mode == "define":
            if files:
                self.log_success(f"Оракул: {len(files)} файлів приймальних тестів за {', '.join(oracle['paths'])}")
            else:
                self.log_error(f"Оракул: за шаблонами {', '.join(oracle['paths'])} не знайдено жодного файла тестів")
            self.check_holdouts(oracle)
            return
        base = self.oracle_baseline()
        if not base:
            shallow = self.git("rev-parse", "--is-shallow-repository")
            hint = (" Репозиторій склоновано без повної історії: у CI потрібна вся історія git (для GitHub Actions — fetch-depth: 0)."
                    if shallow is not None and shallow.stdout.strip() == b"true" else "")
            self.log_error(f"Оракул: немає коміту з «(stage-{self.define_stage()})» — базу для перевірки цілісності не зафіксовано.{hint}")
        else:
            specs = [f":(glob){p}" for p in oracle["paths"]]
            changed: set[str] = set()
            for args in (("diff", "--name-only", base, "--", *specs), ("ls-files", "--others", "--exclude-standard", "--", *specs)):
                proc = self.git(*args)
                if proc is not None and proc.returncode == 0:
                    changed |= {line for line in proc.stdout.decode("utf-8", errors="replace").splitlines() if line}
            if changed:
                self.log_error(
                    f"Оракул змінено після коміту етапу {self.define_stage()} ({base[:8]}): {', '.join(sorted(changed))}. "
                    f"Змінити приймальні тести можна лише через «Revise» етапу {self.define_stage()} і новий коміт"
                )
            else:
                self.log_success(f"Оракул незмінний від коміту етапу {self.define_stage()} ({base[:8]})")
        if mode == "run":
            if run:
                self.run_commands([oracle["command"]])
                self.run_holdouts(oracle)
            else:
                self.log_info("Приймальні тести й holdouts не запускались: додайте --run")

    # ---------- етап ----------
    def check_prerequisites(self, stage: dict, statuses: dict[str, str]) -> None:
        required = list(stage.get("requires", [])) + list(stage.get("gate_requires", []))
        initial = len(self.errors)
        for prereq in required:
            status = statuses.get(prereq, "NOT_FOUND")
            if status not in self.bundle.approved:
                self.log_error(
                    f"Передумова Stage {prereq} не схвалена (потрібно {' / '.join(sorted(self.bundle.approved))}, фактично: {status})"
                )
            elif status == "SKIPPED_APPROVED" and not self.bundle.stages.get(prereq, {}).get("skippable"):
                self.log_error(f"Stage {prereq} має SKIPPED_APPROVED, але цей етап не можна пропускати")
        if required and len(self.errors) == initial:
            self.log_success(f"Передумови схвалено: {', '.join(required)}")

    def verify_stage(self, raw_stage: str, run: bool = False, scan: bool = True) -> bool:
        self.log_header(f"Перевірка етапу: Stage {raw_stage}")
        initial = len(self.errors)
        stage_id = self.bundle.normalize_stage(raw_stage)
        if not stage_id:
            self.log_error(f"Невідомий етап '{raw_stage}'. Допустимі: {', '.join(self.bundle.stages)}")
            return False
        stage = self.bundle.stages[stage_id]
        self.log_info(f"{stage.get('title')} — скіл {stage.get('skill')}")

        if not self.state_path().exists():
            self.log_error(f"Трекер {self.bundle.paths['state']} не знайдено: конвеєр не ініціалізовано (скіл {self.bundle.orchestrator})")
        else:
            self.check_prerequisites(stage, self.get_pipeline_statuses())

        self.validate_report_file(self.root / stage["report"], stage_id=stage_id)

        project = self.load_project()
        for artifact in stage.get("artifacts", []):
            self.check_artifact(artifact, project)
        if stage.get("oracle") in ("define", "protect", "run"):
            self.check_oracle(stage_id, stage["oracle"], run)
        if stage.get("red_team_report"):
            self.check_red_team_report(str(stage["red_team_report"]))

        self.project_settings()
        if scan:
            self.check_code_quality(self.root)
            self.scan_secrets(self.root)
        self.check_stage_commands(stage_id, stage, run)
        if stage.get("debt_checks"):
            self.check_debt(run)
        return len(self.errors) == initial

    def next_stages(self) -> None:
        self.log_header("Стан конвеєра та наступні кроки")
        statuses = self.get_pipeline_statuses()
        if not statuses:
            self.log_warning(f"{self.bundle.paths['state']} не знайдено або таблиця порожня — почніть зі скіла {self.bundle.orchestrator}")
        else:
            self.log_info(f"Спринт {parse_sprint(self.state_path().read_text(encoding='utf-8', errors='replace'))}")
        for stage_id, stage in self.bundle.stages.items():
            status = statuses.get(stage_id, "PENDING")
            title = f"Stage {stage_id} ({stage.get('title')})"
            missing = [p for p in stage.get("requires", []) if statuses.get(p) not in self.bundle.approved]
            gate_missing = [p for p in stage.get("gate_requires", []) if statuses.get(p) not in self.bundle.approved]
            if status in self.bundle.approved:
                self.log_success(f"{title}: {status}")
            elif missing:
                self.log_info(f"{title}: {status}, чекає на {', '.join(missing)}")
            else:
                notes = []
                if gate_missing:
                    notes.append(f"гейт чекає на {', '.join(gate_missing)}")
                if stage.get("skippable"):
                    notes.append("можна пропустити за рішенням власника")
                suffix = f" ({'; '.join(notes)})" if notes else ""
                self.log_warning(f"{title}: {status} — можна працювати: скіл /{stage.get('skill')}{suffix}")

    # ---------- спринти ----------
    def new_sprint(self) -> bool:
        """Відкриває наступний спринт: докази етапів спринту — в архів <sprints>/S<N>/, етапам спринту — PENDING, N → N + 1."""
        self.log_header("Наступний спринт")
        initial = len(self.errors)
        cfg = self.bundle.pipeline.get("sprint") or {}
        stage_ids = [str(s) for s in cfg.get("stages", []) if str(s) in self.bundle.stages]
        state = self.state_path()
        if not stage_ids:
            self.log_error("pipeline.json → sprint.stages не задано")
        if not state.is_file():
            self.log_error(f"Трекер {self.bundle.paths['state']} не знайдено")
        if not (self.root / self.bundle.paths["backlog"]).is_file():
            self.log_error(f"Беклогу {self.bundle.paths['backlog']} немає: наступний спринт нема з чого планувати (етап 2, шаблон {BACKLOG_TEMPLATE})")
        if len(self.errors) > initial:
            return False
        text = state.read_text(encoding="utf-8")
        statuses = parse_state_statuses(text, self.bundle.normalize_stage)
        unfinished = [f"{sid}: {statuses.get(sid, 'NOT_FOUND')}" for sid in stage_ids if statuses.get(sid) not in self.bundle.approved]
        if unfinished:
            self.log_error(f"Спринт не завершено, етапи без рішення власника: {', '.join(unfinished)}")
            return False
        number = parse_sprint(text)
        archive_rel = f"{self.bundle.paths['sprints'].rstrip('/')}/S{number}"
        if (self.root / archive_rel).exists():
            self.log_error(f"Архів {archive_rel} уже існує: номер спринту в трекері не збільшено вручну?")
            return False
        sources = [str(self.bundle.stages[sid]["report"]) for sid in stage_ids] + [str(p) for p in cfg.get("archive", [])]
        moved = []
        for rel in dict.fromkeys(sources):
            src = self.root / rel
            if not src.exists():
                continue
            inner = Path(rel)
            if inner.parts and inner.parts[0] == ".agentic":
                inner = Path(*inner.parts[1:])
            dest = self.root / archive_rel / inner
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))
            moved.append(rel)
            self.log_success(f"В архів: {rel} → {archive_rel}/{inner.as_posix()}")
        first = self.bundle.stages[stage_ids[0]]
        state.write_text(
            reset_sprint_state(text, set(stage_ids), self.bundle.normalize_stage, number + 1, f"Stage {first['id']}: {first.get('title')}"),
            encoding="utf-8", newline="",
        )
        self.log_success(f"Спринт {number} закрито, відкрито спринт {number + 1}: етапи {', '.join(stage_ids)} мають PENDING")
        paths = " ".join([self.bundle.paths["state"], archive_rel, *moved])
        self.log_info(f"Коміт за згодою власника: git add {paths} && git commit -m \"chore(sprint-{number + 1}): open sprint {number + 1}\"")
        return True

    # ---------- самоперевірка бандла ----------
    def self_test(self) -> bool:
        self.log_header("Самоперевірка SDD-бандла")
        initial = len(self.errors)
        b = self.bundle
        self.log_info(f"Бандл: {b.root}")
        if b.load_error:
            self.log_error(b.load_error)
            return False

        self.log_info("1. Обов'язкові файли бандла")
        required = [
            "skills/gate-check/SKILL.md", "skills/gate-check/pipeline.json", "skills/gate-check/verify-gate.py",
            b.paths["report_template"],
            (Path(b.paths["report_template"]).parent / STATE_TEMPLATE).as_posix(),
            (Path(b.paths["report_template"]).parent / PROJECT_TEMPLATE).as_posix(),
            (Path(b.paths["report_template"]).parent / DEBT_TEMPLATE).as_posix(),
            (Path(b.paths["report_template"]).parent / BACKLOG_TEMPLATE).as_posix(),
            f"agents/{b.reviewer}.md",
        ]
        for rel in required:
            if (b.root / rel).is_file():
                self.log_success(f"Знайдено: {rel}")
            else:
                self.log_error(f"Відсутній файл бандла: {rel}")
        rules_file = f"rules/{b.pipeline.get('bundle', 'sdd-delivery')}.md"
        if not (b.root / rules_file).is_file():
            self.log_warning(f"Не знайдено правил бандла: {rules_file}")

        self.log_info("2. Цілісність pipeline.json")
        problems = pipeline_problems(b.pipeline)
        for problem in problems:
            self.log_error(problem)
        if not problems:
            self.log_success(f"pipeline.json: {len(b.stages)} етапів, залежності відомі й ациклічні")

        self.log_info("3. Скіли етапів: frontmatter, 6 заголовків, маркери 4 фаз, звіти")
        if not (b.skills_dir / b.orchestrator / "SKILL.md").is_file():
            self.log_error(f"Відсутній скіл-оркестратор: skills/{b.orchestrator}/SKILL.md")
        else:
            self.log_success(f"Оркестратор: skills/{b.orchestrator}/SKILL.md")
        for skill, stages in sorted(b.stage_skills().items()):
            path = b.skills_dir / skill / "SKILL.md"
            ids = ", ".join(str(s.get("id")) for s in stages)
            if not path.is_file():
                self.log_error(f"Відсутній скіл етапу {ids}: skills/{skill}/SKILL.md")
                continue
            problems = stage_skill_problems(skill, path.read_text(encoding="utf-8", errors="replace"), stages, b.reviewer)
            for problem in problems:
                self.log_error(f"Скіл {skill}: {problem}")
            if not problems:
                self.log_success(f"Скіл {skill} (етап {ids}): структура й маркери на місці")

        self.log_info("4. Субагент-рев'юер")
        agent_path = b.agents_dir / f"{b.reviewer}.md"
        model_files = sorted(b.agents_dir.glob("*.md")) if b.agents_dir.is_dir() else []
        model_files += [b.skills_dir / s / "SKILL.md" for s in b.bundle_skill_names()[0] if (b.skills_dir / s / "SKILL.md").is_file()]
        for path in model_files:
            fm = parse_frontmatter(path.read_text(encoding="utf-8", errors="replace")) or {}
            label = path.stem if path.parent == b.agents_dir else path.parent.name
            model = str(fm.get("model", "")).strip()
            if model and model not in MODEL_ALIASES:
                self.log_error(f"{label}: model «{model}» — у бандлі лише рівні-псевдоніми ({', '.join(sorted(MODEL_ALIASES))}), без назв конкретних моделей")
            effort = str(fm.get("effort", "")).strip()
            if effort and effort not in BUNDLE_EFFORTS:
                self.log_error(f"{label}: effort «{effort}» — у бандлі дозволено {', '.join(BUNDLE_EFFORTS)} (max витрачає ліміти в рази швидше)")
        hook_script = b.skills_dir / "gate-check" / "hooks" / "readonly_bash.py"
        for hook_name in ("readonly_bash.py", "protect_paths.py", "holdout_guard.py"):
            if not (b.skills_dir / "gate-check" / "hooks" / hook_name).is_file():
                self.log_error(f"Відсутній хук: skills/gate-check/hooks/{hook_name}")
        for writer in sorted(b.agents_dir.glob("*.md")) if b.agents_dir.is_dir() else []:
            writer_text = writer.read_text(encoding="utf-8", errors="replace")
            tools = {tool_name(t) for t in frontmatter_list((parse_frontmatter(writer_text) or {}).get("tools"))}
            if tools & WRITE_TOOLS:
                if "gate-check/hooks/protect_paths.py" in writer_text:
                    self.log_success(f"Субагент {writer.stem}: хук protect_paths захищає оракул і файли конвеєра")
                else:
                    self.log_error(f"Субагент {writer.stem} має інструменти запису, але без хука gate-check/hooks/protect_paths.py")
        for read_only_agent in sorted(b.agents_dir.glob("*.md")) if b.agents_dir.is_dir() else []:
            agent_text = read_only_agent.read_text(encoding="utf-8", errors="replace")
            if read_only_agent.stem == b.reviewer or "лише читає" in agent_text or "Лише читання" in agent_text:
                if "gate-check/hooks/readonly_bash.py" not in agent_text:
                    self.log_error(f"Субагент {read_only_agent.stem}: немає хука PreToolUse з gate-check/hooks/readonly_bash.py (технічний захист «лише читання»)")
                else:
                    self.log_success(f"Субагент {read_only_agent.stem}: хук read-only підключено")
        if agent_path.is_file():
            errors, warnings = agent_problems(b.reviewer, agent_path.read_text(encoding="utf-8", errors="replace"))
            for e in errors:
                self.log_error(f"Рев'юер {b.reviewer}: {e}")
            for w in warnings:
                self.log_warning(f"Рев'юер {b.reviewer}: {w}")
            if not errors:
                self.log_success(f"Рев'юер {b.reviewer}: frontmatter валідний, інструментів запису немає")
        else:
            self.log_error(f"Відсутній субагент-рев'юер: agents/{b.reviewer}.md")

        self.log_info("5. Frontmatter усіх скілів бандла")
        names, source = b.bundle_skill_names()
        self.log_info(f"Склад бандла: {source} ({len(names)})")
        stage_skill_names = set(b.stage_skills())
        for skill in names:
            if skill in stage_skill_names:
                continue  # перевірено в пункті 3
            path = b.skills_dir / skill / "SKILL.md"
            if not path.is_file():
                if skill not in (b.orchestrator, "gate-check"):
                    self.log_error(f"Відсутній скіл бандла: skills/{skill}/SKILL.md")
                continue
            skill_text = path.read_text(encoding="utf-8", errors="replace")
            fm = parse_frontmatter(skill_text)
            for problem in frontmatter_yaml_problems(skill_text):
                self.log_error(f"Скіл {skill}: {problem}")
            if fm is None:
                self.log_error(f"Скіл {skill}: немає YAML frontmatter")
            elif fm.get("name") != skill:
                self.log_error(f"Скіл {skill}: name у frontmatter ('{fm.get('name')}') не збігається з назвою папки")
            elif not is_filled(fm.get("description")):
                self.log_error(f"Скіл {skill}: порожній description")
        foreign = sorted(
            p.name for p in b.skills_dir.iterdir() if p.is_dir() and p.name not in names
        ) if b.skills_dir.is_dir() else []
        if foreign:
            self.log_info(f"Папки поза бандлом (не перевіряються): {', '.join(foreign)}")

        self.log_info("6. Шаблони")
        self.check_templates()

        self.log_info("7. Посилання й переносимість документації")
        md_files = [p for skill in names for p in sorted((b.skills_dir / skill).rglob("*.md"))]
        md_files += [p for p in (agent_path, b.root / rules_file) if p.is_file()]
        declared = {str(s.get("report")) for s in b.stage_list}
        report_ref_re = re.compile(re.escape(b.paths["reports_dir"].rstrip("/")) + r"/[\w.\-]+\.md")
        doc_problems = 0
        for md in md_files:
            text = md.read_text(encoding="utf-8", errors="ignore")
            shown = md.relative_to(b.root).as_posix()
            for ref in sorted(set(report_ref_re.findall(text)) - declared):
                self.log_error(f"{shown}: посилання на неоголошений звіт {ref}")
                doc_problems += 1
            for m in ABS_PATH_RE.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                self.log_error(f"{shown}:{line}: локальний абсолютний шлях '{m.group(0)}…'")
                doc_problems += 1
                break
        for skill in names:
            for path in (b.skills_dir / skill).rglob("*"):
                if path.suffix in (".pyc", ".pyo") or path.name == "__pycache__":
                    self.log_error(f"Байткод Python у бандлі: {path.relative_to(b.root).as_posix()}")
                    doc_problems += 1
        if not doc_problems:
            self.log_success(f"Markdown бандла ({len(md_files)} файлів): звіти оголошені, локальних абсолютних шляхів немає")

        self.log_info("8. Негативні самотести валідатора")
        self.run_negative_tests()

        self.log_header("Результат самоперевірки")
        failed = len(self.errors) - initial
        if failed == 0:
            self.log_success("Самоперевірку пройдено")
            return True
        if not self.silent:
            print(c_fail(f"Помилок цілісності: {failed}"))
        return False

    def check_templates(self) -> None:
        b = self.bundle
        template = b.report_template()
        if template.is_file():
            text = template.read_text(encoding="utf-8", errors="replace")
            sections = split_sections(text)
            missing = [str(n) for n, (_, rx) in REPORT_SECTIONS.items() if n not in sections or not rx.search(sections[n][0])]
            if missing:
                self.log_error(f"Шаблон звіту: немає секцій {', '.join(missing)}")
            if not re.search(rf"Статус аудиту[^\n]*{re.escape(b.reviewer)}", text):
                self.log_error(f"Шаблон звіту: немає рядка «Статус аудиту {b.reviewer}»")
            if not missing:
                self.log_success("Шаблон звіту: 7 секцій і рядок статусу аудиту")
        state = b.template(STATE_TEMPLATE)
        if state.is_file():
            text = state.read_text(encoding="utf-8", errors="replace")
            statuses = parse_state_statuses(text, b.normalize_stage)
            absent = [sid for sid in b.stages if sid not in statuses]
            wrong = [s.get("report") for s in b.stage_list if str(s.get("report")) not in text]
            if absent:
                self.log_error(f"Шаблон трекера: немає рядків етапів {', '.join(absent)}")
            if wrong:
                self.log_error(f"Шаблон трекера: немає шляхів звітів {', '.join(map(str, wrong))}")
            unknown = sorted({v for v in statuses.values() if v not in b.approved | b.blocking})
            if unknown:
                self.log_error(f"Шаблон трекера: невідомі статуси {', '.join(unknown)}")
            if not (absent or wrong or unknown):
                self.log_success(f"Шаблон трекера: {len(statuses)} етапів зі статусами й звітами")
        debt = b.template(DEBT_TEMPLATE)
        if debt.is_file():
            if re.search(r"^\|\s*ID\s*\|\s*Рівень\s*\|", debt.read_text(encoding="utf-8", errors="replace"), re.MULTILINE):
                self.log_success(f"Шаблон {DEBT_TEMPLATE}: таблиця «ID | Рівень | …»")
            else:
                self.log_error(f"Шаблон {DEBT_TEMPLATE}: таблиця реєстру має починатися з колонок «ID | Рівень»")
        project = b.template(PROJECT_TEMPLATE)
        if project.is_file():
            try:
                data = json.loads(project.read_text(encoding="utf-8"))
            except Exception as e:
                self.log_error(f"Шаблон {PROJECT_TEMPLATE} не є валідним JSON: {e}")
                return
            if not isinstance(data, dict):
                self.log_error(f"Шаблон {PROJECT_TEMPLATE} має бути JSON-об'єктом")
                return
            keys = {"learning_mode", "verify_commands", "quality_rules", "disabled_rules"}
            for spec in (a for s in b.stage_list for a in s.get("artifacts", []) if isinstance(a, dict)):
                if spec.get("path") == b.paths["project"]:
                    keys |= set(spec.get("json_keys", []))
                if spec.get("when"):
                    keys.add(spec["when"])
            absent = sorted(keys - set(data))
            if absent:
                self.log_error(f"Шаблон {PROJECT_TEMPLATE}: немає ключів {', '.join(absent)}")
            types_ok = (isinstance(data.get("verify_commands", {}), dict)
                        and isinstance(data.get("debt_commands", {}), dict)
                        and isinstance(data.get("quality_rules", []), list)
                        and isinstance(data.get("disabled_rules", []), list))
            if not types_ok:
                self.log_error(f"Шаблон {PROJECT_TEMPLATE}: verify_commands і debt_commands — об'єкти, quality_rules і disabled_rules — списки")
            if not absent and types_ok:
                self.log_success(f"Шаблон {PROJECT_TEMPLATE}: усі ключі pipeline.json на місці")

    def run_negative_tests(self) -> None:
        b = self.bundle
        results: dict[str, bool] = {}
        first = b.stage_list[0] if b.stage_list else {"id": "1", "report": ".agentic/reports/x.md"}
        sid = str(first["id"])

        def make_report(root: Path, learning: str = "", replace: tuple[str, str] | None = None) -> Path:
            text = (SAMPLE_REPORT.replace("@@ID@@", sid).replace("@@REVIEWER@@", b.reviewer)
                    .replace("@@REPORT@@", str(first["report"])).replace("@@STATE@@", b.paths["state"])
                    .replace("@@LEARNING@@", learning))
            if replace:
                text = text.replace(*replace)
            path = root / str(first["report"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            return path

        def fresh(root: Path) -> GateVerifier:
            return GateVerifier(root, b, silent=True)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            template = b.report_template()
            results["А: шаблон звіту відхиляється"] = template.is_file() and fresh(root).validate_report_file(template) is False
            good = make_report(root)
            results["А1: заповнений звіт приймається (позитивний контроль)"] = fresh(root).validate_report_file(good, sid, False)
            bad = make_report(root, replace=("git add docs/brief.md", "git add . docs/brief.md"))
            results["А2: git add . у секції 7 відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            bad = make_report(root, replace=("`PASS`", "`BLOCKERS FOUND`"))
            results["А3: вердикт BLOCKERS FOUND відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            bad = make_report(root, replace=("docs(stage-", "wip(stage-"))
            results["А4: невідомий тип коміту відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            bad = make_report(root, replace=("| 0 | 0 помилок | так |", "| ок | 0 помилок | так |"))
            results["А6: «Валюта довіри» без коду виходу відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            bad = make_report(root, replace=("| не застосовно | — | ні | документний етап |", "| не запускалось | — | ні | — |"))
            results["А7: невиконана перевірка без причини відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            bad = make_report(root, replace=("| 0 | 0 помилок | так |", "| 0 | 0 помилок | ні |"))
            results["А8: «Валюта довіри» без повтору рев'юером відхиляється"] = fresh(root).validate_report_file(bad, sid, False) is False
            receipt = make_report(root).read_text(encoding="utf-8")
            no_oracle, with_oracle = fresh(root), fresh(root)
            no_oracle.check_trust_receipt(receipt, "x", ["Оракул"])
            with_oracle.check_trust_receipt(receipt.replace("| Тести |", "| Оракул (приймальні тести) |"), "x", ["Оракул"])
            results["А9: без рядка «Оракул» у 4.0 етап запуску оракула відхиляється"] = bool(no_oracle.errors) and not with_oracle.errors
            no_map_rejected = fresh(root).validate_report_file(make_report(root), sid, True) is False
            with_map = make_report(root, learning=SAMPLE_LEARNING_MAP)
            results["А5: карта «Знати / Розуміти / Вміти» обов'язкова лише в learning_mode"] = (
                no_map_rejected and fresh(root).validate_report_file(with_map, sid, True) is True
            )

        results["Б: невідомий етап 99 відхиляється"] = GateVerifier(Path(tempfile.gettempdir()), b, silent=True).verify_stage("99") is False

        samples_bad = [
            "AWS_KEY=AKIA1234567890ABCDEF",
            "token: ghp_" + "a1B2" * 9,
            "DATABASE_URL=postgres://app:S3cr3tProdPass@db.internal:5432/app",
            'const apiKey = "' + "Zx9" * 8 + '"',
            '"client_secret": "' + "Qw7" * 8 + '"',
        ]
        samples_ok = [
            "DATABASE_URL=postgres://app:postgres@localhost:5432/app",
            "DATABASE_URL=postgres://app:${DB_PASSWORD}@db:5432/app",
            'dsn = f"postgresql://{user}:{password}@{host}/db"',
            "AWS_KEY=AKIAIOSFODNN7EXAMPLE",
            'apiKey = "replace-with-your-key-example"',
            "registry = https://registry.example.org:443/@scope/pkg",
            "# gate-check: allow-secret — тестовий ключ із документації постачальника",
            "STRIPE=sk_live_" + "0" * 24,
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "bad.env").write_text("\n".join(samples_bad + ["# gate-check: allow-secret", "AWS=AKIA1234567890ABCDEG"]), encoding="utf-8")
            (root / "ok.env").write_text("\n".join(samples_ok), encoding="utf-8")
            v = fresh(root)
            v.scan_secrets(root)
            flagged_bad = sum(1 for e in v.errors if "bad.env" in e)
            flagged_ok = sum(1 for e in v.errors if "ok.env" in e)
            results["В: секрети виявляються, плейсхолдери й allow-secret з причиною пропускаються"] = (
                flagged_bad == len(samples_bad) + 1 and flagged_ok == 0
            )
            results["Г: маскування секрету"] = mask_secret("AKIA1234567890ABCDEF") == "AKIA************CDEF"

            rule = {"id": "no-debug-print", "severity": "error", "globs": ["src/**/*.{py,ts}"],
                    "pattern": r"\bprint\(|console\.log\(", "message": "налагоджувальний вивід"}
            (root / ".agentic").mkdir()
            (root / ".agentic" / "project.json").write_text(json.dumps({"quality_rules": [rule]}), encoding="utf-8")
            (root / "src" / "a").mkdir(parents=True)
            (root / "src" / "a" / "bad.py").write_text("print('x')\n# print('коментар')\n", encoding="utf-8")
            (root / "src" / "ok.ts").write_text(
                "// gate-check: allow no-debug-print — CLI виводить результат користувачу\nconsole.log(result);\n", encoding="utf-8"
            )
            (root / "src" / "noreason.ts").write_text("console.log(x); // gate-check: allow no-debug-print\n", encoding="utf-8")
            v = fresh(root)
            v.check_code_quality(root)
            results["Д: правило якості спрацьовує, коментарі пропускаються, allow лише з причиною"] = (
                len(v.errors) == 2 and any("bad.py:1" in e for e in v.errors) and any("noreason.ts:1" in e for e in v.errors)
            )

            (root / ".agentic" / "project.json").write_text(
                json.dumps({"quality_rules": [rule], "disabled_rules": [{"id": "no-debug-print"}]}), encoding="utf-8"
            )
            v = fresh(root)
            v.project_settings()
            results["Е: disabled_rules без причини — помилка"] = len(v.errors) == 1 and "reason" in v.errors[0]

            target = next((s for s in b.stage_list if s.get("requires")), None)
            if target:
                dep = str(target["requires"][0])
                rows = "".join(
                    f"| **{s['id']}** | t | s | — | `{'WAITING_FOR_APPROVAL' if str(s['id']) == dep else 'APPROVED_AND_COMMITTED'}` | r | — |\n"
                    for s in b.stage_list
                )
                state = root / b.paths["state"]
                state.write_text("| ID | Етап | Скіл | Передумови | Статус | Звіт | Коміт |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
                                 + rows + "\n| Етап | Дата | Хеш | Повідомлення | Хто |\n| :--- | :--- | :--- | :--- | :--- |\n"
                                 + f"| **{dep}** | 2026-01-01 | abc | docs | Власник |\n", encoding="utf-8")
                v = fresh(root)
                v.check_prerequisites(target, v.get_pipeline_statuses())
                results["Є: несхвалена передумова блокує етап"] = len(v.errors) == 1 and f"Stage {dep}" in v.errors[0]

            (root / ".agentic" / "project.json").write_text(json.dumps(
                {"f": False, "z": 0, "s": "x", "n": None, "e": "", "l": [], "o": {}, "api": False}
            ), encoding="utf-8")
            v = fresh(root)
            project = v.load_project()
            v.check_artifact({"path": b.paths["project"], "json_keys": ["f", "z", "s"]}, project)
            ok_keys = not v.errors
            v.check_artifact({"path": b.paths["project"], "json_keys": ["n", "e", "l", "o", "missing"]}, project)
            results["Ж: json_keys — false і 0 валідні, null / \"\" / [] / {} / відсутній — ні"] = ok_keys and len(v.errors) == 5

            v = fresh(root)
            v.check_artifact({"path": "contract/api.yaml", "when": "api"}, {"api": False})
            skipped = not v.errors
            v.check_artifact({"path": "contract/api.yaml", "when": "api"}, {"api": True})
            results["З: артефакт із when обов'язковий лише за істинного ключа"] = skipped and len(v.errors) == 1

            stage = {"id": sid, "run_required": True}
            (root / ".agentic" / "project.json").write_text(json.dumps({"verify_commands": {}}), encoding="utf-8")
            v = fresh(root)
            v.check_stage_commands(sid, stage, run=False)
            warn_only = not v.errors and len(v.warnings) == 1
            v.check_stage_commands(sid, stage, run=True)
            results["И: run_required без команд — попередження без --run, помилка з --run"] = warn_only and len(v.errors) == 1
            v = fresh(root)
            results["І: код виходу команди: 0 — успіх, інший — помилка"] = (
                v.run_commands(["exit 0"]) is True and v.run_commands(["exit 3"]) is False
            )

        rx = compile_globs(["frontend/src/**/*.{ts,tsx}"])
        results["Ї: glob з ** і {}"] = (
            matches_any("frontend/src/a/b/C.tsx", rx) and matches_any("frontend/src/C.ts", rx)
            and not matches_any("frontend/C.tsx", rx) and not matches_any("backend/src/C.ts", rx)
        )

        cyclic = {"orchestrator": "o", "reviewer": "r", "paths": DEFAULT_PATHS, "commit_types": ["feat"],
                  "statuses": {"approved": ["A"], "blocking": ["P"]},
                  "stages": [{"id": "1", "title": "t", "skill": "s", "requires": ["2"], "report": ".agentic/reports/1.md", "artifacts": []},
                             {"id": "2", "title": "t", "skill": "s", "requires": ["1"], "report": ".agentic/reports/2.md", "artifacts": []}]}
        results["Й: цикл у pipeline.json виявляється"] = any("цикл" in p for p in pipeline_problems(cyclic))

        demo_stage = {"id": "1", "report": ".agentic/reports/01-demo-report.md"}
        good_skill = (
            "---\nname: demo\ndescription: >-\n  Демо-скіл етапу.\n---\n\n## 1. Контекст етапу\nStage 1, звіт .agentic/reports/01-demo-report.md\n"
            "## 2. Фаза 1: Pre-Flight Check\npre-flight, згода власника\n## 3. Фаза 2: Best Practices Discovery\nнайпростіший підхід\n"
            "## 4. Фаза 3: Кероване виконання (Explore → Plan → Execute → Verify)\n" + b.reviewer + "\n"
            "## 5. Фаза 4: Звіт + Human Approval Gate + Git Checkpoint\nstage-report.template.md, «Approve & закоміть»\n## 6. Межі етапу\n"
        )
        broken_skill = good_skill.replace("## 2. Фаза 1: Pre-Flight Check\npre-flight, згода власника\n", "").replace(".agentic/reports/01-demo-report.md", "")
        results["К: структура скіла етапу — повний приймається, неповний відхиляється"] = (
            not stage_skill_problems("demo", good_skill, [demo_stage], b.reviewer)
            and len(stage_skill_problems("demo", broken_skill, [demo_stage], b.reviewer)) >= 3
        )
        reviewer_ok = agent_problems("r", "---\nname: r\ndescription: d\ntools: Read, Grep, Glob, Bash\n---\n")[0]
        reviewer_write = agent_problems("r", "---\nname: r\ndescription: d\ntools:\n  - Read\n  - Write\n---\n")[0]
        reviewer_all = agent_problems("r", "---\nname: r\ndescription: d\n---\n")[0]
        results["Л: рев'юер без інструментів запису"] = not reviewer_ok and bool(reviewer_write) and bool(reviewer_all)

        abs_bad = ["C:" + "\\Users\\me\\x", "D:" + "\\_courses\\kit", "/" + "home/user/x", "/" + "Users/me/x", "file" + ":///c:/x"]
        abs_ok = ["~/.claude/skills", "${CLAUDE_SKILL_DIR}/../gate-check", "https://example.com/Users/x", "$HOME\\.claude"]
        results["М: локальні абсолютні шляхи виявляються"] = (
            all(ABS_PATH_RE.search(s) for s in abs_bad) and not any(ABS_PATH_RE.search(s) for s in abs_ok)
        )
        results["Н: зміна оракула після коміту етапу 6 виявляється"] = self._oracle_tamper_test(b)

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            red = ".agentic/evidence/red-team-report.md"
            report = root / red
            report.parent.mkdir(parents=True)
            findings = ("| ID | Рівень | Місце | Проблема |\n| :--- | :--- | :--- | :--- |\n"
                        "| TD-001 | P2 | src/a.ts:10 | дублювання |\n| TD-002 | P2 | src/b.ts:20 | мертвий експорт |\n")
            report.write_text("VERDICT: PASS\nEnterprise Readiness Score: B\n\n## 4. Знахідки\n\n" + findings, encoding="utf-8")
            registry = root / b.paths["tech_debt"]
            head = "| ID | Рівень | Опис |\n| :--- | :--- | :--- |\n| `TD-001` | P2 | дублювання |\n"
            registry.write_text(head, encoding="utf-8")
            partial = fresh(root)
            partial.check_red_team_report(red)
            registry.write_text(head + "| `TD-002` | P2 | мертвий експорт |\n", encoding="utf-8")
            full = fresh(root)
            full.check_red_team_report(red)
            results["О: знахідка P2 зі звіту Red-Team без запису в реєстрі боргу відхиляється"] = (
                len(partial.errors) == 1 and "TD-002" in partial.errors[0] and not full.errors
            )

            cases = [(0, 0, 0), (0, 0, 3), (0, 0, 4), (0, 0, 9), (0, 0, 10), (0, 1, 0), (1, 0, 0)]
            formula_ok = "".join(readiness_score(*c) for c in cases) == "ABCCDDF"
            report.write_text(report.read_text(encoding="utf-8").replace("Score: B", "Score: A"), encoding="utf-8")
            wrong = fresh(root)
            wrong.check_red_team_report(red)
            report.write_text(report.read_text(encoding="utf-8").replace("Score: A", "Score: F") + "| RT-1 | P0 | src/c.ts:3 | ін'єкція |\n",
                              encoding="utf-8")
            blocked = fresh(root)
            blocked.check_red_team_report(red)
            results["П: оцінка A–F не за формулою й відкриті P0/P1 у звіті Red-Team відхиляються"] = (
                formula_ok and len(wrong.errors) == 1 and "формулою" in wrong.errors[0]
                and len(blocked.errors) == 1 and "P0/P1" in blocked.errors[0]
            )

            (root / ".agentic" / "project.json").write_text(json.dumps({"debt_commands": {
                **{a: ["exit 0"] for a in ("complexity", "dead_code", "boundaries", "vulnerabilities", "sbom")},
                "accessibility": {"not_applicable": "немає графічного інтерфейсу: продукт — CLI"},
                "web_vitals": {"not_applicable": "немає графічного інтерфейсу: продукт — CLI"},
            }}), encoding="utf-8")
            good = fresh(root)
            good.check_debt(run=True)
            (root / ".agentic" / "project.json").write_text(json.dumps({"debt_commands": {
                "complexity": ["exit 0"], "dead_code": ["exit 0"], "vulnerabilities": ["exit 3"],
                "sbom": {"not_applicable": "навчальний проєкт"}, "accessibility": {"not_applicable": " "},
                "web_vitals": {"not_applicable": "немає графічного інтерфейсу: продукт — CLI"},
            }}), encoding="utf-8")
            bad = fresh(root)
            bad.check_debt(run=True)
            results["Р: debt_commands — пропущений аспект, «не застосовно» без факту й поріг з кодом ≠ 0 відхиляються"] = (
                not good.errors and len(bad.errors) == 4
            )

        state_template = b.template(STATE_TEMPLATE)
        sprint_cfg = b.pipeline.get("sprint") or {}
        if state_template.is_file() and sprint_cfg.get("stages"):
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                done = state_template.read_text(encoding="utf-8").replace("`PENDING` |", "`APPROVED_AND_COMMITTED` |")
                state = root / b.paths["state"]
                state.parent.mkdir(parents=True)
                (root / b.paths["backlog"]).write_text("| Порядок | Історія |\n| :--- | :--- |\n| 1 | US-1 |\n", encoding="utf-8")
                evidence = [str(b.stages[str(s)]["report"]) for s in sprint_cfg["stages"]] + [
                    f"{p}/x.md" if not Path(p).suffix else p for p in sprint_cfg.get("archive", [])]
                for rel in evidence:
                    (root / rel).parent.mkdir(parents=True, exist_ok=True)
                    (root / rel).write_text("доказ", encoding="utf-8")
                last = str(sprint_cfg["stages"][-1])
                state.write_text(done.replace(f"`APPROVED_AND_COMMITTED` | `{b.stages[last]['report']}`",
                                              f"`IN_PROGRESS` | `{b.stages[last]['report']}`"), encoding="utf-8")
                refused = fresh(root)
                refused_ok = refused.new_sprint() is False and all((root / rel).exists() for rel in evidence)
                state.write_text(done, encoding="utf-8")
                opened = fresh(root)
                opened_ok = opened.new_sprint() is True
                after = state.read_text(encoding="utf-8")
                statuses = parse_state_statuses(after, b.normalize_stage)
                sprint_stages = {str(s) for s in sprint_cfg["stages"]}
                archived = root / b.paths["sprints"] / "S1"
                results["С: --new-sprint архівує докази етапів спринту й повертає їм PENDING лише після рішень власника"] = (
                    refused_ok and opened_ok and parse_sprint(after) == 2
                    and all(statuses.get(s) == "PENDING" for s in sprint_stages)
                    and all(statuses.get(s) in b.approved for s in b.stages if s not in sprint_stages)
                    and not any((root / rel).exists() for rel in evidence)
                    and sum(1 for f in archived.rglob("*") if f.is_file()) == len(evidence)
                    and fresh(root).new_sprint() is False
                )

        for name, ok in results.items():
            if ok:
                self.log_success(f"Тест {name}")
            else:
                self.log_error(f"Негативний самотест не пройдено: {name}")

    @staticmethod
    def _oracle_tamper_test(b: "Bundle") -> bool:
        """Тимчасовий git-репозиторій: незмінний оракул проходить, змінений і доданий тест — помилка."""
        sid = next((s for s, st in b.stages.items() if st.get("oracle") == "define"), None)
        if not sid:
            return True  # бандл без оракула — перевіряти нічого
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".agentic").mkdir()
            (root / "acceptance").mkdir()
            (root / ".agentic" / "project.json").write_text(
                json.dumps({"oracle": {"paths": ["acceptance/**"], "command": "exit 0"}}), encoding="utf-8")
            test_file = root / "acceptance" / "ac.test.ts"
            test_file.write_text("expect(1).toBe(1)\n", encoding="utf-8")

            def git(*args: str) -> int:
                return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *args], cwd=root,
                                      capture_output=True, stdin=subprocess.DEVNULL, timeout=60).returncode
            if git("init", "-q") or git("add", "-A") or git("commit", "-q", "-m", f"test(stage-{sid}): oracle"):
                return False
            clean = GateVerifier(root, b, silent=True)
            clean.check_oracle("7", "protect", False)
            test_file.write_text("expect(1).toBe(2)\n", encoding="utf-8")
            (root / "acceptance" / "extra.test.ts").write_text("x\n", encoding="utf-8")
            tampered = GateVerifier(root, b, silent=True)
            tampered.check_oracle("7", "protect", False)
            return not clean.errors and any("ac.test.ts" in e and "extra.test.ts" in e for e in tampered.errors)

    def verify_all(self, run: bool = False) -> None:
        self.self_test()
        statuses = self.get_pipeline_statuses()
        if not statuses:
            self.log_error(f"Трекер {self.bundle.paths['state']} не знайдено або порожній")
        unfinished = [f"Stage {sid}: {statuses.get(sid, 'NOT_FOUND')}" for sid in self.bundle.stages
                      if statuses.get(sid) not in self.bundle.approved]
        if unfinished:
            self.log_error(f"Незавершені етапи: {', '.join(unfinished)}")
        for sid, stage in self.bundle.stages.items():
            if statuses.get(sid) == "SKIPPED_APPROVED":
                if stage.get("skippable"):
                    self.log_info(f"Stage {sid} пропущено за рішенням власника")
                else:
                    self.log_error(f"Stage {sid} має SKIPPED_APPROVED, але цей етап не можна пропускати")
                continue
            self.verify_stage(sid, run=run, scan=False)
        self.log_header("Проєкт цілком: правила якості й секрети")
        self.check_code_quality(self.root)
        self.scan_secrets(self.root)

    def verify_ci(self) -> None:
        """Для CI: кожен схвалений етап (звіт, артефакти, цілісність оракула), правила якості й секрети."""
        self.log_header("CI: схвалені етапи, оракул, секрети")
        statuses = self.get_pipeline_statuses()
        if not statuses:
            self.log_error(f"Трекер {self.bundle.paths['state']} не знайдено або порожній")
        approved = [sid for sid in self.bundle.stages if statuses.get(sid) in self.bundle.approved and statuses.get(sid) != "SKIPPED_APPROVED"]
        if not approved:
            self.log_info("Схвалених етапів ще немає")
        for sid in approved:
            self.verify_stage(sid, run=False, scan=False)
        self.log_header("Проєкт цілком: правила якості й секрети")
        self.check_code_quality(self.root)
        self.scan_secrets(self.root)


def vendor_bundle(target: Path) -> list[Path]:
    """Копіює валідатор, pipeline.json, хуки й шаблон звіту в репозиторій проєкту, зберігаючи структуру бандла."""
    bundle = Bundle(BUNDLE_ROOT)
    sources = [SCRIPT_PATH, bundle.pipeline_path, *sorted((SCRIPT_PATH.parent / "hooks").glob("*.py")), bundle.report_template()]
    copied = []
    for src in sources:
        dest = target / src.relative_to(BUNDLE_ROOT)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        copied.append(dest)
    return copied


def main():
    parser = argparse.ArgumentParser(description="Детермінована перевірка гейтів SDD-конвеєра (скіл gate-check).")
    parser.add_argument("--self-test", action="store_true", help="Перевірити цілісність бандла: pipeline.json, скіли етапів, рев'юер, шаблони, негативні тести.")
    parser.add_argument("--stage", type=str, help="ID етапу для перевірки перед гейтом (1, 2, 3, 4, 5, 6, 7, 8.a, 8.b, 9).")
    parser.add_argument("--run", action="store_true", help="Разом із --stage / --all виконати verify_commands етапу з .agentic/project.json.")
    parser.add_argument("--next", action="store_true", help="Показати стан етапів і які з них можна запускати зараз.")
    parser.add_argument("--report", type=str, help="Перевірити окремий Markdown-звіт етапу.")
    parser.add_argument("--scan-secrets", type=str, metavar="PATH", help="Просканувати файл або каталог на витік секретів.")
    parser.add_argument("--check-code", type=str, metavar="PATH", help="Застосувати quality_rules з .agentic/project.json до файлу або каталогу.")
    parser.add_argument("--all", action="store_true", help="Фінальне приймання проєкту: бандл, трекер, усі етапи, секрети, правила якості.")
    parser.add_argument("--ci", action="store_true", help="Для CI: кожен схвалений етап (звіт, артефакти, цілісність оракула), правила якості й секрети.")
    parser.add_argument("--debt", action="store_true", help="Виміряти технічний борг: запустити debt_commands з .agentic/project.json (локально на етапі 7 і в CI).")
    parser.add_argument("--new-sprint", action="store_true", help="Відкрити наступний спринт: перенести докази етапів спринту в .agentic/sprints/S<N>/ і повернути їм PENDING (лише після рішень власника на всіх етапах спринту).")
    parser.add_argument("--vendor", nargs="?", const=VENDOR_DIR, metavar="DIR", help=f"Скопіювати валідатор, pipeline.json, хуки й шаблон звіту в репозиторій проєкту (за замовчуванням {VENDOR_DIR}).")
    parser.add_argument("--root", type=str, help="Корінь проєкту (за замовчуванням — поточний каталог).")
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else Path.cwd().resolve()
    if not root.is_dir():
        print(c_fail(f"Корінь проєкту не знайдено: {root}"))
        sys.exit(1)
    verifier = GateVerifier(root, Bundle(BUNDLE_ROOT))

    def resolve(p: str) -> Path:
        path = Path(p)
        return path if path.is_absolute() else root / path

    executed = False
    if args.self_test:
        executed = True
        verifier.self_test()
    if args.next:
        executed = True
        verifier.next_stages()
    if args.report:
        executed = True
        verifier.validate_report_file(resolve(args.report))
    if args.stage:
        executed = True
        verifier.verify_stage(args.stage, run=args.run)
    if args.scan_secrets:
        executed = True
        verifier.scan_secrets(resolve(args.scan_secrets))
    if args.check_code:
        executed = True
        verifier.check_code_quality(resolve(args.check_code), explicit=True)
    if args.all:
        executed = True
        verifier.verify_all(run=args.run)
    if args.ci:
        executed = True
        verifier.verify_ci()
    if args.debt:
        executed = True
        verifier.check_debt(run=True)
    if args.new_sprint:
        executed = True
        verifier.new_sprint()
    if args.vendor:
        executed = True
        for dest in vendor_bundle(resolve(args.vendor)):
            verifier.log_success(f"Скопійовано: {verifier.rel(dest)}")

    if not executed:
        parser.print_help()
        sys.exit(0)

    if verifier.errors:
        print("\n" + colorize(f"ЗНАЙДЕНО ПОМИЛОК: {len(verifier.errors)}", "31;1"))
        for err in verifier.errors:
            print(f"  • {err.splitlines()[0]}")
        sys.exit(1)
    suffix = f" (попереджень: {len(verifier.warnings)})" if verifier.warnings else ""
    print("\n" + colorize(f"УСІ ПЕРЕВІРКИ ПРОЙДЕНО (EXIT CODE 0){suffix}", "32;1"))
    sys.exit(0)


if __name__ == "__main__":
    main()
