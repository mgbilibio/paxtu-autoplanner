"""Cria indice FTS5 dos livros oficiais convertidos para Markdown."""

from __future__ import annotations

import hashlib
import re
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB_DIRS = [
    ROOT / "docs" / "biblioteca" / "libpaxtubasico",
    ROOT / "docs" / "biblioteca" / "libpaxtubasico2",
    ROOT / "conhecimento" / "biblioteca_md",
]
OUT_DB = ROOT / "conhecimento" / "bd" / "biblioteca_fts.sqlite"
OUT_SQL = ROOT / "conhecimento" / "docs" / "biblioteca_fts_dump.sql"
OUT_DOC = ROOT / "conhecimento" / "docs" / "biblioteca_fts_status.md"
MAX_BLOCK = 2400
PDF_DIRS = [
    ROOT / "docs" / "biblioteca" / "manuais_essenciais",
    ROOT / "docs" / "biblioteca",
]

PDF_ALIASES = {
    "CadernoDeJornadaEscoteira": "CadernoDeJornadaEscoteira (1).pdf",
    "examinador_especialidades": "examinador_especialidades (1).pdf",
}


def natural_page(path: Path) -> int:
    match = re.search(r"page-(\d+)$", path.parent.name)
    return int(match.group(1)) if match else 0


def find_pdf(book_dir: Path) -> str | None:
    alias = PDF_ALIASES.get(book_dir.name)
    candidates = []
    for pdf_dir in PDF_DIRS:
        if alias:
            candidates.append(pdf_dir / alias)
        candidates.append(pdf_dir / f"{book_dir.name}.pdf")
    for candidate in candidates:
        if candidate.exists():
            return rel(candidate)
    return None


def iter_markdown() -> list[tuple[Path, int | None, str | None]]:
    """Lista (path, pdf_page, pdf_path).

    Quando ha pasta pages/, indexa o markdown.md (corpo) de CADA pagina — cobertura
    completa do livro com pdf_page por pagina. NAO indexa header.md/footer.md (sao
    mobilia de pagina: numero/titulo corrente repetido = ruido OCR), NEM o markdown.md
    consolidado do livro (duplicaria o conteudo ja coberto pelas paginas). Isso evita
    hits duplicados e degradacao de relevancia na busca FTS5.
    """
    files: list[tuple[Path, int | None, str | None]] = []
    for folder in LIB_DIRS:
        if not folder.exists():
            continue
        for book_dir in sorted([p for p in folder.iterdir() if p.is_dir()]):
            pdf_path = find_pdf(book_dir)
            pages_dir = book_dir / "pages"
            if pages_dir.exists():
                page_files = sorted(
                    pages_dir.glob("page-*/markdown.md"),
                    key=natural_page,
                )
                for candidate in page_files:
                    if candidate.stat().st_size > 0:
                        files.append((candidate, natural_page(candidate), pdf_path))
                continue
            # Livro sem pages/: indexa todos os .md do nivel raiz.
            files.extend((p, None, pdf_path) for p in sorted(book_dir.glob("*.md")))
    return files


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def split_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    current: list[str] = []
    current_len = 0
    for raw in text.splitlines():
        line = raw.strip()
        is_heading = line.startswith("#")
        should_flush = is_heading and current
        should_flush = should_flush or (not line and current_len >= MAX_BLOCK)
        if should_flush:
            blocks.append("\n".join(current).strip())
            current = []
            current_len = 0
        if line:
            current.append(raw)
            current_len += len(raw) + 1
        if current_len >= MAX_BLOCK:
            blocks.append("\n".join(current).strip())
            current = []
            current_len = 0
    if current:
        blocks.append("\n".join(current).strip())
    return [block for block in blocks if block]


def infer_title(path: Path, block: str) -> str:
    for line in block.splitlines():
        clean = line.strip()
        if clean.startswith("#"):
            return clean.lstrip("#").strip() or path.stem
    for line in block.splitlines():
        clean = line.strip()
        if clean and not clean.startswith("!"):
            return clean[:80]
    return path.stem


def source_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS markdown_blocks;
        DROP TABLE IF EXISTS markdown_blocks_fts;

        CREATE TABLE markdown_blocks (
            id INTEGER PRIMARY KEY,
            source_path TEXT NOT NULL,
            block_index INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            source_hash TEXT NOT NULL,
            pdf_page INTEGER,
            pdf_path TEXT
        );

        CREATE VIRTUAL TABLE markdown_blocks_fts USING fts5(
            title,
            body,
            content='markdown_blocks',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
        );
        """
    )


def populate(
    conn: sqlite3.Connection,
    files: list[tuple[Path, int | None, str | None]],
) -> tuple[int, int, int, int]:
    total_blocks = 0
    page_files = 0
    pdf_links = 0
    for path, pdf_page, pdf_path in files:
        if pdf_page:
            page_files += 1
        if pdf_path:
            pdf_links += 1
        text = path.read_text(encoding="utf-8", errors="replace")
        blocks = split_blocks(text)
        for idx, block in enumerate(blocks, start=1):
            conn.execute(
                """
                INSERT INTO markdown_blocks
                    (source_path, block_index, title, body, source_hash, pdf_page, pdf_path)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rel(path),
                    idx,
                    infer_title(path, block),
                    block,
                    source_hash(block),
                    pdf_page,
                    pdf_path,
                ),
            )
            total_blocks += 1
    conn.execute(
        """
        INSERT INTO markdown_blocks_fts(rowid, title, body)
        SELECT id, title, body FROM markdown_blocks
        """
    )
    return len(files), total_blocks, page_files, pdf_links


def write_status(
    artifact_path: Path,
    files_count: int,
    blocks_count: int,
    page_files: int,
    pdf_links: int,
) -> None:
    is_sqlite = artifact_path.suffix == ".sqlite"
    lines = [
        "# Status do indice FTS5 da biblioteca Markdown",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        "",
        f"- Artefato: `{rel(artifact_path)}`",
        f"- Arquivos Markdown indexados: {files_count}",
        f"- Arquivos de pagina indexados: {page_files}",
        f"- Blocos textuais indexados: {blocks_count}",
        f"- Arquivos com PDF associado: {pdf_links}",
        "",
        "## Observacoes",
        "",
        "- O indice complementa a busca MiniSearch do app; MiniSearch continua responsavel pelos dados operacionais.",
        "- O indexador prefere `pages/page-N/markdown.md` quando disponivel para preservar `pdf_page`.",
        "- `pdf_path` aponta para o PDF local correspondente quando o arquivo existe em `docs/biblioteca`.",
        "- `src/components/GlobalSearch.tsx` consulta a biblioteca local pelo IPC Electron `library:search`.",
        "- `electron/main.ts` procura `biblioteca_fts.sqlite` em desenvolvimento e no app empacotado.",
        "- `package.json` inclui o banco em `extraResources` para release.",
        "- Quando o artefato for `.sqlite`, ele ja esta pronto para consulta FTS5.",
        "- Quando o artefato for `.sql`, ele reconstrói o indice FTS5 quando importado em SQLite.",
        "- O botao de PDF na busca aparece apenas quando `pdf_page` e `pdf_path` estiverem preenchidos.",
        "",
    ]
    if not is_sqlite:
        lines.insert(-1, "- A materializacao `.sqlite` falhou nesta execucao; foi preservado dump SQL portavel.")
    OUT_DOC.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    files = iter_markdown()
    OUT_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    files_count, blocks_count, page_files, pdf_links = populate(conn, files)
    conn.commit()
    artifact = OUT_DB
    try:
        if OUT_DB.exists():
            OUT_DB.unlink()
        target = sqlite3.connect(OUT_DB)
        conn.backup(target)
        target.close()
    except OSError:
        artifact = OUT_SQL
        OUT_SQL.write_text("\n".join(conn.iterdump()), encoding="utf-8")
    except sqlite3.Error:
        artifact = OUT_SQL
        OUT_SQL.write_text("\n".join(conn.iterdump()), encoding="utf-8")
    conn.close()
    write_status(artifact, files_count, blocks_count, page_files, pdf_links)
    print(f"[OK] {files_count} markdowns, {blocks_count} blocos -> {artifact}")


if __name__ == "__main__":
    main()
