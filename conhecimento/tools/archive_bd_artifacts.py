#!/usr/bin/env python3
"""Classifica bancos e move artefatos nao operacionais para arquivo local."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BD_DIR = ROOT / "bd"
ARCHIVE_DIR = ROOT / "archive" / "bd_legacy_2026-04-29"
DOC_OUT = ROOT / "docs" / "manifest_bancos_operacionais_2026-04-29.md"
JSON_OUT = ARCHIVE_DIR / "manifest.json"

ACTIVE_FILES = {
    "progressao_2025.sqlite",
    "especialidades_guia.sqlite",
    "biblioteca_fts.sqlite",
    "dashboard_progressao.json",
    "schema.sql",
    "schema_unificado.sql",
}

LEGACY_PREFIXES = (
    "conhecimento_db",
    "fichas_especialidades",
    "biblioteca_fts_",
)


def classify(path: Path) -> str:
    """Classifica arquivo em ativo, legado ou revisar."""
    if path.name in ACTIVE_FILES:
        return "operacional"
    if path.name.endswith((".sqlite", ".sqlite-journal")):
        if path.name.startswith(LEGACY_PREFIXES):
            return "arquivado"
        return "revisar"
    if path.name.endswith(".json"):
        return "operacional" if path.name in ACTIVE_FILES else "revisar"
    if path.name.endswith(".sql"):
        return "operacional" if path.name in ACTIVE_FILES else "revisar"
    return "revisar"


def move_archived(files: list[Path]) -> list[dict]:
    """Move arquivos classificados como arquivados para pasta de arquivo."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    moved = []
    for source in files:
        target = ARCHIVE_DIR / source.name
        if target.exists():
            target = ARCHIVE_DIR / f"{source.stem}_{datetime.now():%H%M%S}{source.suffix}"
        shutil.move(str(source), str(target))
        moved.append({
            "name": target.name,
            "origin": str(source),
            "target": str(target),
            "bytes": target.stat().st_size,
        })
    return moved


def write_reports(records: list[dict], moved: list[dict]) -> None:
    """Grava manifest JSON e Markdown de auditoria."""
    JSON_OUT.write_text(
        json.dumps({
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "active_files": sorted(ACTIVE_FILES),
            "records": records,
            "moved": moved,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    lines = [
        "# Manifest de bancos operacionais",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Arquivos operacionais",
        "",
    ]
    for item in records:
        if item["status"] == "operacional":
            lines.append(f"- `{item['name']}` — {item['bytes']} bytes")
    lines.extend(["", "## Arquivos arquivados", ""])
    for item in moved:
        lines.append(f"- `{item['name']}` — {item['bytes']} bytes")
    lines.extend(["", "## Arquivos para revisar", ""])
    for item in records:
        if item["status"] == "revisar":
            lines.append(f"- `{item['name']}` — {item['bytes']} bytes")
    DOC_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    """Executa classificacao e arquivamento."""
    records = []
    to_move = []
    for path in sorted(BD_DIR.iterdir(), key=lambda item: item.name):
        if not path.is_file():
            continue
        status = classify(path)
        records.append({
            "name": path.name,
            "status": status,
            "bytes": path.stat().st_size,
            "last_write": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
        })
        if status == "arquivado":
            to_move.append(path)
    moved = move_archived(to_move)
    write_reports(records, moved)
    print(f"[OK] manifest: {DOC_OUT}")
    print(f"[OK] arquivados: {len(moved)}")


if __name__ == "__main__":
    main()
