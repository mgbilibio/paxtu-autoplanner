"""Gera arquivos granulares de progressao para Lobinho e Escoteiro."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "src" / "data" / "catalog"


def slugify(text: str) -> str:
    """Cria um slug simples para nomes de arquivo."""
    replacements = {
        "á": "a", "à": "a", "ã": "a", "â": "a",
        "é": "e", "ê": "e",
        "í": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u",
        "ç": "c",
    }
    text = text.lower()
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = "".join(ch if ch.isalnum() or ch in {" ", "-"} else " " for ch in text)
    return "-".join(part for part in text.split() if part)


def write_text(path: Path, text: str) -> None:
    """Escreve um arquivo mantendo o texto curto e direto."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def load_json(path: Path) -> list[dict]:
    """Carrega um JSON de catalogo."""
    return json.loads(path.read_text(encoding="utf-8"))


def emit_stage_file(target_dir: Path, source: str, version: str, stage: dict, item_blocks: list[dict]) -> None:
    """Escreve um arquivo de etapa com o resumo e os itens."""
    stage_slug = slugify(stage["name"])
    lines = [
        f"# {stage['name']}",
        "",
        f"Fonte: `{source}`",
        f"Versao: `{version}`",
        f"Subtotal: {len(item_blocks)} itens",
        "",
        "## Itens",
        "",
    ]
    for item in item_blocks:
        lines.append(f"- `{item['code']}` - {item['description']} :: {item.get('guidance', '')}")
    write_text(target_dir / f"{stage_slug}.md", "\n".join(lines).strip() + "\n")


def emit_item_file(target_dir: Path, source: str, version: str, stage: dict, item: dict, index: int) -> None:
    """Escreve um arquivo por item quando o bloco e pequeno o suficiente."""
    item_slug = slugify(item["description"])
    text = "\n".join([
        f"# {item['description']}",
        "",
        f"Codigo: `{item['code']}`",
        f"Fonte: `{source}`",
        f"Versao: `{version}`",
        f"Etapa: `{stage['name']}`",
        f"Posicao: `{index}`",
        "",
        "## Diretriz",
        "",
        item.get("guidance", "").strip() or "Sem diretriz informada.",
    ]) + "\n"
    write_text(target_dir / f"{item_slug}.md", text)


def build_branch(branch_name: str, version: str, source_file: str) -> None:
    """Gera a base granular de um ramo."""
    data = load_json(SRC / source_file)
    branch_root = ROOT / "por" / version / branch_name
    stages_dir = branch_root / "etapas"
    items_dir = branch_root / "itens"
    write_text(branch_root / "index.md", f"# POR {version} - {branch_name.capitalize()}\n")
    for stage in data:
        items = stage.get("items", [])
        emit_stage_file(stages_dir, source_file, version, stage, items)
        for idx, item in enumerate(items, start=1):
            emit_item_file(items_dir, source_file, version, stage, item, idx)


def main() -> None:
    """Gera os arquivos granulares iniciais."""
    build_branch("lobinho", "2020", "lobinho_2020.json")
    build_branch("escoteiro", "2020", "escoteiro_2020.json")
    build_branch("lobinho", "2025", "lobinho_2025.json")
    build_branch("escoteiro", "2025", "escoteiro_2025.json")


if __name__ == "__main__":
    main()
