from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT.parent / "panel-twin-public"

SKIP_DIRS = {
    ".git",
    ".github",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".tmp_runtime",
    ".tmp_runtime_runs",
    "outputs",
    "pytest-cache-files-92pc2pab",
    "pytest-cache-files-fs845dnw",
    "pytest-cache-files-ma423o5g",
}

TEXT_EXT = {".py", ".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".csv", ".ini"}

REPLACEMENTS = {
    "NSF-sponsored national survey program": "NSF-sponsored national survey program",
    "https://www.nsf.gov/statistics/srvygss/": "https://www.nsf.gov/statistics/srvygss/",
    "project stakeholder's": "project stakeholder's",
    "project stakeholder": "project stakeholder",
    "stakeholder": "stakeholder",
}


def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def sanitize_text(text: str) -> str:
    out = text
    for src, dst in REPLACEMENTS.items():
        out = out.replace(src, dst)
    return out


def main() -> None:
    if TARGET.exists():
        shutil.rmtree(TARGET)
    TARGET.mkdir(parents=True, exist_ok=True)

    for src in ROOT.rglob("*"):
        rel = src.relative_to(ROOT)
        if should_skip(rel):
            continue
        dst = TARGET / rel
        if src.is_dir():
            dst.mkdir(parents=True, exist_ok=True)
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix.lower() in TEXT_EXT:
            txt = src.read_text(encoding="utf-8")
            dst.write_text(sanitize_text(txt), encoding="utf-8")
        else:
            shutil.copy2(src, dst)

    # Quick guardrail: fail fast if explicit token still appears.
    leaks = []
    for path in TARGET.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXT:
            txt = path.read_text(encoding="utf-8", errors="ignore")
            if "project stakeholder" in txt or "stakeholder" in txt:
                leaks.append(str(path))
    if leaks:
        raise RuntimeError(f"Public export still contains forbidden tokens in {len(leaks)} file(s): {leaks[:10]}")

    print(f"Public repo prepared at: {TARGET}")


if __name__ == "__main__":
    main()
