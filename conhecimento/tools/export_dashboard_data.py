"""Exporta um JSON resumido para o dashboard de evolucao."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "bd" / "conhecimento_db_v19.sqlite"
OUT_PATH = ROOT / "bd" / "dashboard_progressao.json"
SNAPSHOT_JS_PATH = ROOT.parent / "AutoPaxtu042026" / "docs" / "dashboard_progressao_data.js"
OFFICIAL_ROOT = ROOT.parent / "docs" / "biblioteca" / "libpaxtubasico"
PAGE_INDEX_CACHE: dict[str, list[dict[str, object]]] = {}
MANUAL_HINTS: dict[tuple[str, str, str], str] = {
    ("2025", "escoteiro", "Imobilização e Bandagens."): "2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR / page-103",
    ("2025", "lobinho", "Kit Reutilizável."): "2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR / page-395",
    ("2025", "lobinho", "Jogo sem Perdedores."): "2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR / page-246",
}


def fetch_rows(cur: sqlite3.Cursor, sql: str) -> list[dict[str, object]]:
    """Executa uma consulta e retorna lista de dicionarios."""
    cur.execute(sql)
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, row, strict=False)) for row in cur.fetchall()]


def normalize_text(value: str) -> str:
    """Normaliza texto para busca simples."""
    text = value.lower()
    text = re.sub(r"[^a-z0-9áàâãéêíóôõúç ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def page_index_for_folder(folder: Path) -> list[dict[str, object]]:
    """Indexa paginas OCR do conjunto oficial."""
    cache_key = str(folder)
    if cache_key in PAGE_INDEX_CACHE:
        return PAGE_INDEX_CACHE[cache_key]
    pages = []
    if not folder.exists():
        PAGE_INDEX_CACHE[cache_key] = pages
        return pages
    for page_dir in sorted(folder.glob("pages/page-*")):
        page_md = page_dir / "markdown.md"
        if not page_md.exists():
            continue
        content = page_md.read_text(encoding="utf-8", errors="ignore")
        pages.append(
            {
                "page": page_dir.name.replace("page-", ""),
                "text": normalize_text(content),
            }
        )
    combined = folder / "markdown.md"
    if combined.exists():
        content = combined.read_text(encoding="utf-8", errors="ignore")
        pages.append(
            {
                "page": "combined",
                "text": normalize_text(content),
            }
        )
    PAGE_INDEX_CACHE[cache_key] = pages
    return pages


def guess_pdf_page(item_title: str, branch: str, version: str) -> str:
    """Aproxima uma pagina oficial a partir do titulo do item."""
    manual = MANUAL_HINTS.get((version, branch, item_title))
    if manual:
        return manual
    candidates = []
    if version == "2025" and branch == "lobinho":
        candidates.append(OFFICIAL_ROOT / "2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR")
    if version == "2025" and branch == "escoteiro":
        candidates.append(OFFICIAL_ROOT / "2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR")
    if version == "2025":
        candidates.append(OFFICIAL_ROOT / "2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR")
    candidates.append(OFFICIAL_ROOT / "POR 2026.02")

    query = normalize_text(item_title)
    if not query:
        return ""
    terms = [term for term in query.split(" ") if len(term) > 3]
    for folder in candidates:
        best_page = ""
        best_score = 0
        for page in page_index_for_folder(folder):
            text = page["text"]
            score = sum(1 for term in terms if term in text)
            if score > best_score:
                best_score = score
                best_page = f"{folder.name} / page-{page['page']}"
            if score >= max(2, min(4, len(terms))):
                return f"{folder.name} / page-{page['page']}"
        if best_score >= 2:
            return best_page
    return ""


def classify_page_hint(hint: str) -> str:
    """Classifica a confianca do hint de pagina."""
    if not hint:
        return "missing"
    if "page-combined" in hint:
        return "probable"
    return "exact"


def parse_specialty_file(path: Path) -> dict[str, object]:
    """Extrai metadados basicos de uma especialidade."""
    content = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    title = path.stem.replace("-", " ").title()
    ramo = ""
    source = ""
    subtotal = 0
    requirements: list[str] = []
    in_requirements = False
    for line in content:
      line = line.strip()
      if line.startswith("# "):
          title = line[2:].strip()
      elif line.startswith("Ramo de conhecimento:"):
          ramo = line.split("`", 2)[1] if "`" in line else line.split(":", 1)[1].strip()
      elif line.startswith("Fonte:"):
          source = line.split("`", 2)[1] if "`" in line else line.split(":", 1)[1].strip()
      elif line.startswith("Subtotal:"):
          match = re.search(r"(\d+)", line)
          subtotal = int(match.group(1)) if match else 0
      elif line.startswith("## Requisitos"):
          in_requirements = True
      elif in_requirements and line.startswith("- "):
          requirements.append(line[2:].strip())
    return {
        "title": title,
        "path": str(path.relative_to(ROOT)),
        "ramo": ramo,
        "source": source,
        "subtotal": subtotal,
        "requirements": requirements,
        "requirements_count": len(requirements),
    }


def guess_specialty_page(title: str, ramo: str) -> str:
    """Aproxima a pagina oficial de uma especialidade."""
    folder = OFFICIAL_ROOT / "2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR"
    if not folder.exists():
        return ""
    query = normalize_text(f"{ramo} {title}")
    terms = [term for term in query.split(" ") if len(term) > 3]
    best_page = ""
    best_score = 0
    for page in page_index_for_folder(folder):
        score = sum(1 for term in terms if term in page["text"])
        if score > best_score:
            best_score = score
            best_page = f"{folder.name} / page-{page['page']}"
        if score >= max(2, min(4, len(terms))):
            return f"{folder.name} / page-{page['page']}"
    return best_page if best_score >= 2 else ""


def fetch_specialty_sheets(cur: sqlite3.Cursor) -> list[dict[str, object]]:
    """Carrega as fichas canônicas de especialidades."""
    return fetch_rows(
        cur,
        """
        select
            s.slug, s.title, s.branch, s.knowledge_area, s.version_code, s.source_path,
            source_kind, source_page_hint, source_page_kind, short_description,
            full_description, requirements_total, status,
            coalesce(steps.total_steps, 0) as total_steps,
            coalesce(obs.total_observations, 0) as total_observations,
            coalesce(rev.total_reviews, 0) as total_reviews
        from specialty_sheets s
        left join (
            select sheet_id, count(*) as total_steps
            from specialty_sheet_steps
            group by sheet_id
        ) steps on steps.sheet_id = s.id
        left join (
            select step.sheet_id as sheet_id, count(*) as total_observations
            from specialty_sheet_observations obs
            join specialty_sheet_steps step on step.id = obs.step_id
            group by step.sheet_id
        ) obs on obs.sheet_id = s.id
        left join (
            select sheet_id, count(*) as total_reviews
            from specialty_sheet_reviews
            group by sheet_id
        ) rev on rev.sheet_id = s.id
        order by s.title
        """,
    )


def fetch_specialty_sheet_steps(cur: sqlite3.Cursor) -> list[dict[str, object]]:
    """Carrega os passos das fichas canônicas."""
    return fetch_rows(
        cur,
        """
        select
            s.slug as sheet_slug,
            s.title as sheet_title,
            step.position,
            step.title,
            coalesce(step.description,'') as description,
            coalesce(step.guidance,'') as guidance,
            coalesce(step.source_ref,'') as source_ref,
            coalesce(step.status,'') as status
        from specialty_sheet_steps step
        join specialty_sheets s on s.id = step.sheet_id
        order by s.title, step.position
        """,
    )


def fetch_specialty_sheet_observations(cur: sqlite3.Cursor) -> list[dict[str, object]]:
    """Carrega observacoes das fichas canônicas."""
    return fetch_rows(
        cur,
        """
        select
            s.slug as sheet_slug,
            s.title as sheet_title,
            step.position as step_position,
            obs.position,
            obs.note,
            coalesce(obs.evidence,'') as evidence,
            coalesce(obs.status,'') as status
        from specialty_sheet_observations obs
        join specialty_sheet_steps step on step.id = obs.step_id
        join specialty_sheets s on s.id = step.sheet_id
        order by s.title, step.position, obs.position
        """,
    )


def fetch_specialty_sheet_reviews(cur: sqlite3.Cursor) -> list[dict[str, object]]:
    """Carrega as revisoes das fichas canônicas."""
    return fetch_rows(
        cur,
        """
        select
            s.slug as sheet_slug,
            s.title as sheet_title,
            coalesce(rev.reviewer,'') as reviewer,
            coalesce(rev.review_date,'') as review_date,
            coalesce(rev.result,'') as result,
            coalesce(rev.notes,'') as notes
        from specialty_sheet_reviews rev
        join specialty_sheets s on s.id = rev.sheet_id
        order by s.title, rev.id
        """,
    )


def main() -> None:
    """Exporta resumo de progressao para visualizacao."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    data = {
        "summary": fetch_rows(
            cur,
            """
            select
                v.code as version,
                b.code as branch,
                count(distinct s.id) as stages,
                count(distinct i.id) as items,
                count(distinct r.id) as requirements
            from versions v
            join stages s on s.version_id = v.id
            join branches b on b.id = s.branch_id
            left join items i on i.stage_id = s.id
            left join requirements r on r.item_id = i.id
            group by v.code, b.code
            order by v.code, b.code
            """,
        ),
        "stages": fetch_rows(
            cur,
            """
            select
                v.code as version,
                b.code as branch,
                s.code as stage_code,
                s.label as stage_label,
                count(distinct i.id) as items,
                count(distinct r.id) as requirements
            from stages s
            join versions v on v.id = s.version_id
            join branches b on b.id = s.branch_id
            left join items i on i.stage_id = s.id
            left join requirements r on r.item_id = i.id
            group by v.code, b.code, s.code, s.label
            order by v.code, b.code, s.position
            """,
        ),
        "sources": fetch_rows(
            cur,
            """
            select s.kind, s.family, s.path, s.label, coalesce(v.code,'') as version, coalesce(b.code,'') as branch
            from sources s
            left join versions v on v.id = s.version_id
            left join branches b on b.id = s.branch_id
            order by family, kind, path
            """,
        ),
        "source_links": fetch_rows(
            cur,
            """
            select
                src.path as source_path,
                sl.related_path,
                sl.relation
            from source_links sl
            join sources src on src.id = sl.source_id
            order by src.path, sl.related_path
            """,
        ),
        "items": fetch_rows(
            cur,
            """
            select
                v.code as version,
                b.code as branch,
                s.code as stage_code,
                s.label as stage_label,
                i.code as item_code,
                i.title as item_title,
                coalesce(i.description,'') as item_description,
                coalesce(i.category,'') as category,
                coalesce(i.subcategory,'') as subcategory,
                i.is_fixed as is_fixed,
                count(distinct r.id) as requirements,
                group_concat(distinct r.source_ref) as source_refs,
                group_concat(distinct src.path) as origin_paths,
                group_concat(distinct src.family) as origin_families
            from items i
            join stages s on s.id = i.stage_id
            join versions v on v.id = s.version_id
            join branches b on b.id = s.branch_id
            left join requirements r on r.item_id = i.id
            left join sources src on src.path = r.source_ref
            group by v.code, b.code, s.code, s.label, i.code, i.title, i.description, i.category, i.subcategory, i.is_fixed
            order by v.code, b.code, s.position, i.title
            """,
        ),
        "specialty_sheets": fetch_specialty_sheets(cur),
        "specialty_sheet_steps": fetch_specialty_sheet_steps(cur),
        "specialty_sheet_observations": fetch_specialty_sheet_observations(cur),
        "specialty_sheet_reviews": fetch_specialty_sheet_reviews(cur),
    }

    for item in data["items"]:
        hint = guess_pdf_page(
            str(item.get("item_title", "")),
            str(item.get("branch", "")),
            str(item.get("version", "")),
        )
        item["official_page_hint"] = hint
        if str(item.get("version", "")) == "2020":
            item["official_page_hint_kind"] = "legacy"
        else:
            item["official_page_hint_kind"] = classify_page_hint(hint)

    specialties = []
    specialty_root = ROOT / "especialidades" / "2025" / "ramos"
    for md_path in sorted(specialty_root.rglob("*.md")):
        if md_path.name == "index.md":
            continue
        info = parse_specialty_file(md_path)
        page_hint = guess_specialty_page(str(info["title"]), str(info["ramo"]))
        hint_kind = "missing"
        if page_hint:
            hint_kind = "probable" if "page-combined" in page_hint else "exact"
        specialties.append(
            {
                **info,
                "official_page_hint": page_hint,
                "official_page_hint_kind": hint_kind,
            }
        )
    data["specialties"] = specialties

    payload = json.dumps(data, ensure_ascii=False, indent=2)
    OUT_PATH.write_text(payload, encoding="utf-8")
    SNAPSHOT_JS_PATH.write_text(
        f"window.__DASHBOARD_DATA__ = {payload};\n",
        encoding="utf-8",
    )
    conn.close()


if __name__ == "__main__":
    main()
