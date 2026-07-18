"""Monta um espelho SQLite a partir da base de conhecimento local."""

from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "bd" / "conhecimento_db_v19.sqlite"
SCHEMA_PATH = ROOT / "bd" / "schema.sql"


def read_text(path: Path) -> str:
    """Ler texto UTF-8."""
    return path.read_text(encoding="utf-8")


def slug_from_path(path: Path) -> str:
    """Extrai um slug de um arquivo markdown."""
    return path.stem


def connect_db() -> sqlite3.Connection:
    """Abre o banco e cria o schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(":memory:")
    conn.executescript(read_text(SCHEMA_PATH))
    conn.execute("PRAGMA journal_mode=OFF;")
    return conn


def insert_version(cur: sqlite3.Cursor, code: str, label: str, description: str = "") -> int:
    """Insere uma versao e retorna o id."""
    cur.execute(
        "INSERT INTO versions(code, label, description) VALUES (?, ?, ?)",
        (code, label, description),
    )
    return cur.lastrowid


def insert_branch(cur: sqlite3.Cursor, code: str, label: str) -> int:
    """Insere um ramo e retorna o id."""
    cur.execute(
        "INSERT INTO branches(code, label) VALUES (?, ?)",
        (code, label),
    )
    return cur.lastrowid


def register_source(cur: sqlite3.Cursor, kind: str, path: str, label: str = "", family: str = "", version_id: int | None = None, branch_id: int | None = None) -> int:
    """Registra a origem de um arquivo."""
    cur.execute(
        "INSERT OR REPLACE INTO sources(kind, path, label, family, version_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
        (kind, path, label, family, version_id, branch_id),
    )
    return cur.lastrowid


def register_source_link(cur: sqlite3.Cursor, source_id: int, related_path: str, relation: str) -> None:
    """Registra relacao entre fonte e documento relacionado."""
    cur.execute(
        "INSERT INTO source_links(source_id, related_path, relation) VALUES (?, ?, ?)",
        (source_id, related_path, relation),
    )


def detect_stage_label(content: str) -> str:
    """Extrai o titulo da etapa do markdown."""
    for line in content.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def parse_stage_file(path: Path) -> tuple[str, list[str]]:
    """Lê um arquivo de etapa e devolve label e linhas de item."""
    content = read_text(path)
    label = detect_stage_label(content)
    items = []
    for line in content.splitlines():
        if line.startswith("- `"):
            items.append(line)
    return label, items


def parse_item_file(path: Path) -> dict[str, str]:
    """Extrai campos mínimos de um item markdown."""
    content = read_text(path)
    data = {"title": "", "code": "", "source": "", "version": "", "stage": ""}
    for line in content.splitlines():
        if line.startswith("# ") and not data["title"]:
            data["title"] = line[2:].strip()
        elif line.startswith("Codigo: "):
            data["code"] = line.split("`", 2)[1]
        elif line.startswith("Fonte: "):
            parts = line.split("`")
            if len(parts) > 1:
                data["source"] = parts[1]
        elif line.startswith("Versao: "):
            parts = line.split("`")
            if len(parts) > 1:
                data["version"] = parts[1]
        elif line.startswith("Etapa: "):
            parts = line.split("`")
            if len(parts) > 1:
                data["stage"] = parts[1]
    return data


def parse_specialty_markdown(path: Path) -> dict[str, object]:
    """Extrai dados de uma ficha de especialidade em markdown."""
    content = read_text(path).splitlines()
    title = path.stem.replace("-", " ").title()
    branch = ""
    knowledge_area = ""
    source = ""
    subtotal = 0
    requirements: list[str] = []
    for line in content:
        stripped = line.strip()
        if stripped.startswith("# "):
            title = stripped[2:].strip()
        elif stripped.startswith("Ramo de conhecimento:"):
            branch = stripped.split("`", 2)[1] if "`" in stripped else stripped.split(":", 1)[1].strip()
        elif stripped.startswith("Fonte:"):
            source = stripped.split("`", 2)[1] if "`" in stripped else stripped.split(":", 1)[1].strip()
        elif stripped.startswith("Subtotal:"):
            digits = "".join(ch for ch in stripped if ch.isdigit())
            subtotal = int(digits) if digits else 0
        elif stripped.startswith("- Linha "):
            requirements.append(stripped)
    if branch == "Serviços":
        knowledge_area = "Serviços"
    return {
        "slug": path.stem,
        "title": title,
        "branch": branch,
        "knowledge_area": knowledge_area or "Serviços",
        "source": source,
        "subtotal": subtotal,
        "requirements": requirements,
    }


def insert_specialty_sheet(cur: sqlite3.Cursor, info: dict[str, object], source_page_hint: str = "", source_page_kind: str = "probable") -> int:
    """Insere a ficha canônica de uma especialidade."""
    title = str(info["title"])
    requirements_total = int(info["subtotal"])
    full_description = (
        f"Ficha manual de {title}. "
        f"Contem {requirements_total} requisitos numerados e trilha de acompanhamento."
    )
    cur.execute(
        """
        INSERT INTO specialty_sheets(
            slug, title, branch, knowledge_area, version_code, source_path,
            source_kind, source_page_hint, source_page_kind,
            short_description, full_description, requirements_total, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            info["slug"],
            info["title"],
            info["branch"],
            info["knowledge_area"],
            "2025",
            f"especialidades/2025/ramos/servicos/{info['slug']}.md",
            "derived",
            source_page_hint,
            source_page_kind,
            title,
            full_description,
            requirements_total,
            "draft",
        ),
    )
    return cur.lastrowid


def insert_specialty_steps(cur: sqlite3.Cursor, sheet_id: int, requirements: list[str]) -> None:
    """Insere os passos da ficha a partir dos requisitos."""
    for position, line in enumerate(requirements, start=1):
        text = line.split(": ", 1)[1] if ": " in line else line
        title = text.split(" - ", 1)[1] if " - " in text else text
        cur.execute(
            """
            INSERT INTO specialty_sheet_steps(
                sheet_id, position, title, description, guidance, source_ref, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sheet_id,
                position,
                f"Passo {position}",
                title,
                text,
                "",
                "pending",
            ),
        )


def insert_specialty_observations(cur: sqlite3.Cursor, sheet_id: int, requirements: list[str]) -> None:
    """Cria observacoes base para acompanhamento manual da ficha."""
    cur.execute(
        "SELECT id, position, title, description FROM specialty_sheet_steps WHERE sheet_id = ? ORDER BY position",
        (sheet_id,),
    )
    rows = cur.fetchall()
    for row in rows:
        step_id = row[0]
        position = row[1]
        title = str(row[2] or "")
        description = str(row[3] or "")
        note = (
            f"Registrar evidência do passo {position}. "
            f"Jovem apresenta {title.lower()} e a chefia confirma o cumprimento."
        )
        if description:
            note = f"{note} Base: {description}"
        cur.execute(
            """
            INSERT INTO specialty_sheet_observations(
                step_id, position, note, evidence, status
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                step_id,
                position,
                note,
                "",
                "pending",
            ),
        )


def insert_specialty_review(cur: sqlite3.Cursor, sheet_id: int, title: str) -> None:
    """Cria a trilha inicial de revisao da ficha."""
    cur.execute(
        """
        INSERT INTO specialty_sheet_reviews(
            sheet_id, reviewer, review_date, result, notes
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            sheet_id,
            "",
            "",
            "pending",
            f"Revisar a ficha manual de {title} antes de liberar.",
        ),
    )


def load_branch_tree(cur: sqlite3.Cursor, version_id: int, branch_id: int, branch_dir: Path, branch_code: str) -> None:
    """Importa a arvore do ramo gerado em markdown."""
    stages_dir = branch_dir / "etapas"
    items_dir = branch_dir / "itens"

    stage_files = sorted(stages_dir.glob("*.md")) if stages_dir.exists() else []
    for position, stage_file in enumerate(stage_files, start=1):
        stage_code = slug_from_path(stage_file)
        stage_label, _ = parse_stage_file(stage_file)
        cur.execute(
            "INSERT INTO stages(branch_id, version_id, code, label, position) VALUES (?, ?, ?, ?, ?)",
            (branch_id, version_id, stage_code, stage_label or stage_code, position),
        )
        stage_id = cur.lastrowid
        register_source(
            cur,
            "stage",
            str(stage_file.relative_to(ROOT)),
            stage_label,
            "derived",
            version_id,
            branch_id,
        )

        item_files = sorted(items_dir.glob("*.md")) if items_dir.exists() else []
        for item_file in item_files:
            info = parse_item_file(item_file)
            if info["stage"] != stage_label and info["stage"] != stage_code:
                continue
            cur.execute(
                "INSERT INTO items(stage_id, code, title, description, category, subcategory, is_fixed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    stage_id,
                    info["code"] or item_file.stem,
                    info["title"] or item_file.stem,
                    "",
                    "",
                    "",
                    0,
                ),
            )
            item_id = cur.lastrowid
            register_source(
                cur,
                "item",
                str(item_file.relative_to(ROOT)),
                info["title"],
                "derived",
                version_id,
                branch_id,
            )
            cur.execute(
                "INSERT INTO requirements(item_id, position, text, source_ref) VALUES (?, ?, ?, ?)",
                (item_id, 1, info["title"], str(item_file.relative_to(ROOT))),
            )


def register_tree_sources(cur: sqlite3.Cursor, root_dir: Path, kind: str, version_id: int | None = None, branch_id: int | None = None) -> None:
    """Registra recursivamente fontes markdown da base."""
    for path in sorted(root_dir.rglob("*.md")):
        register_source(
            cur,
            kind,
            str(path.relative_to(ROOT)),
            path.stem,
            "derived",
            version_id,
            branch_id,
        )


def register_official_sources(cur: sqlite3.Cursor, version_id: int, branch_ids: dict[str, int]) -> None:
    """Registra PDFs oficiais e seus grupos de suporte."""
    official = [
        ("official-pdf", "docs/biblioteca/libpaxtubasico/2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR.pdf", "Manual oficial Lobinho", "official", "docs/biblioteca/libpaxtubasico/2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR", branch_ids["lobinho"]),
        ("official-pdf", "docs/biblioteca/libpaxtubasico/2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR.pdf", "Manual oficial Escoteiro", "official", "docs/biblioteca/libpaxtubasico/2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR", branch_ids["escoteiro"]),
        ("official-pdf", "docs/biblioteca/libpaxtubasico/2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR.pdf", "Guia oficial de insignias", "official", "docs/biblioteca/libpaxtubasico/2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR", None),
        ("official-pdf", "docs/biblioteca/libpaxtubasico/POR 2026.02.pdf", "POR oficial", "official", "docs/biblioteca/libpaxtubasico/POR 2026.02", None),
        ("official-pdf", "docs/biblioteca/libpaxtubasico/2026 Distintivos e Marcas.pdf", "Distintivos e Marcas", "official", "docs/biblioteca/libpaxtubasico/2026 Distintivos e Marcas", None),
    ]
    for kind, path, label, family, related, branch_id in official:
        source_id = register_source(cur, kind, path, label, family, version_id, branch_id)
        register_source_link(cur, source_id, related, "ocr-md-folder")


def seed_specialty_sheets(cur: sqlite3.Cursor) -> None:
    """Cria fichas canônicas para especialidades de Servicos."""
    specialty_root = ROOT / "especialidades" / "2025" / "ramos" / "servicos"
    if not specialty_root.exists():
        return
    for path in sorted(specialty_root.glob("*.md")):
        if path.name == "index.md":
            continue
        info = parse_specialty_markdown(path)
        page = f"https://www.escoteiros.org.br/especialidades/{path.stem.replace('-', '/')}/"
        sheet_id = insert_specialty_sheet(cur, info, page, "exact" if page else "probable")
        insert_specialty_steps(cur, sheet_id, list(info["requirements"]))
        insert_specialty_observations(cur, sheet_id, list(info["requirements"]))
        insert_specialty_review(cur, sheet_id, str(info["title"]))


def main() -> None:
    """Gera o banco SQLite local."""
    conn = connect_db()
    cur = conn.cursor()

    v2020 = insert_version(cur, "2020", "POR 2020", "Base legada")
    v2025 = insert_version(cur, "2025", "POR 2025", "Base ativa")
    lobinho = insert_branch(cur, "lobinho", "Lobinho")
    escoteiro = insert_branch(cur, "escoteiro", "Escoteiro")

    register_source(cur, "planilha", "planilhaprogressao.xlsx", "Planilha de progressao", "derived")
    register_official_sources(cur, v2025, {"lobinho": lobinho, "escoteiro": escoteiro})
    register_tree_sources(cur, ROOT / "especialidades" / "2025", "specialty-tree", v2025, None)
    register_tree_sources(cur, ROOT / "por" / "2025", "progression-tree", v2025, None)
    seed_specialty_sheets(cur)

    load_branch_tree(cur, v2020, lobinho, ROOT / "por" / "2020" / "lobinho", "lobinho")
    load_branch_tree(cur, v2020, escoteiro, ROOT / "por" / "2020" / "escoteiro", "escoteiro")
    load_branch_tree(cur, v2025, lobinho, ROOT / "por" / "2025" / "lobinho", "lobinho")
    load_branch_tree(cur, v2025, escoteiro, ROOT / "por" / "2025" / "escoteiro", "escoteiro")

    conn.commit()
    disk_conn = sqlite3.connect(DB_PATH)
    conn.backup(disk_conn)
    disk_conn.close()
    conn.close()


if __name__ == "__main__":
    main()
