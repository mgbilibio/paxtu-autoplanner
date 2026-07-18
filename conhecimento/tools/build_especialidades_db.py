"""Parseia o Guia de Especialidades 18a Edição (markdown.md) e gera SQLite.

Estratégia:
- Extrai ramo_map E lista ordenada (ordered_toc) do índice do início do livro.
- Parseia o corpo detectando especialidades por heading `# Titulo` OU por plain-text
  seguido de itens — mesmo quando há especialidade ativa, se o nome está na fila.
- Detecta "restart": item numerado 1 após marcadores NÍVEL com requisitos já coletados
  → nova especialidade sem heading; o nome é recuperado da lista ordenada do índice.
- Matching de heading vs índice usa slugify para tolerar variações OCR (ioiô/loió, etc.).
"""

from __future__ import annotations

import difflib
import re
import sqlite3
import sys
import unicodedata
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIA_MD = (
    ROOT.parent
    / "docs"
    / "biblioteca"
    / "libpaxtubasico2"
    / "Guia de Especialidades 18a Edição - 2024-1"
    / "markdown.md"
)
DB_OUT = ROOT / "bd" / "especialidades_guia.sqlite"

SCHEMA = """
PRAGMA encoding = "UTF-8";
CREATE TABLE IF NOT EXISTS ramos (
    id   INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS especialidades (
    id              INTEGER PRIMARY KEY,
    ramo_id         INTEGER NOT NULL REFERENCES ramos(id),
    nome            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    revisada        INTEGER DEFAULT 0,
    nova            INTEGER DEFAULT 0,
    versao          TEXT DEFAULT '',
    proponentes     TEXT DEFAULT '',
    avaliadores     TEXT DEFAULT '',
    nota_tecnica    TEXT DEFAULT '',
    nivel1_itens    INTEGER DEFAULT 0,
    nivel2_itens    INTEGER DEFAULT 0,
    nivel3_itens    INTEGER DEFAULT 0,
    total_itens     INTEGER DEFAULT 0,
    fonte           TEXT DEFAULT 'Guia de Especialidades 18a Edicao 2024',
    linha_inicio    INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS requisitos (
    id               INTEGER PRIMARY KEY,
    especialidade_id INTEGER NOT NULL REFERENCES especialidades(id),
    posicao          INTEGER NOT NULL,
    texto            TEXT NOT NULL,
    opcional         INTEGER DEFAULT 0
);
"""

TOC_SECTIONS: list[str] = [
    "Ciência e Tecnologia",
    "Cultura",
    "Desportos",
    "Serviços",
    "Habilidades Escoteiras",
]

# Marcadores de seção no corpo do livro (incluindo variantes OCR)
SECTION_MARKERS: dict[str, str] = {
    "CIÊNCIA E TECNOLOGIA": "Ciência e Tecnologia",
    "CIENCIA E TECNOLOGIA": "Ciência e Tecnologia",
    "DESPORTOS": "Desportos",
    "HABILIDADES ESCOTEIRAS": "Habilidades Escoteiras",
    "SOÔNDES": "Serviços",   # OCR artifact de SERVIÇOS
    "SOÔI": "Serviços",
    "SOOI": "Serviços",
    "SERVIÇOS": "Serviços",
    "SERVICOS": "Serviços",
}

# Padrões de item: "1. texto", "O 1. texto", "☐ 1. texto" (checkbox U+2610)
RE_ITEM = re.compile(r"^(?:☐\s+)?(\d+)\.\s+(.+)")
RE_ITEM_OPT = re.compile(r"^(?:☐\s+)?O\s+(\d+)\.\s+(.+)")
RE_NIVEL = re.compile(r"-\s*NÍVEL\s+(\d+)\s*\|\s*(\d+)\s*iten?s", re.IGNORECASE)
RE_TOC_ENTRY = re.compile(r"^(.+?)\s+\.\.\.\s+(\d+)\s*$")
RE_PAGE_ENTRY = re.compile(r"^(.+?)\s+(\d+)\s*$")

# Headings que não são especialidades
SKIP_HEADING_EXACT = {"ÍNDICE", "AS ESPECIALIDADES", "ESTE GUIA PERTENCE A:"}
SKIP_HEADING_PREFIX = (
    "O que é", "As Especialidades", "Conquiste", "Quando você",
    "E se você", "Um escotista", "As Especialidades permitem",
    "Os Ramos", "Criando", "A conquista", "Como usar",
    "E agora", "ÍNDICE DAS", "ESPECIALIDADES REVISADAS",
    "NESTA EDIÇÃO", "Índice",
)
# Prefixos que encerram o TOC de especialidades
TOC_STOP_PREFIXES = (
    "# ÍNDICE DAS ESPECIALIDADES POR MODALIDADE",
    "## Modalidade",
    "# ESPECIALIDADES REVISADAS",
    "# AS ESPECIALIDADES",
    "# O que é",
)


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_str.lower()).strip("-")


def clean_name(text: str) -> str:
    """Remove anotações entre parênteses e espaços extras."""
    return re.sub(r"\s*\(.*?\)", "", text).strip()


def slug_match(a: str, b: str) -> bool:
    """Verifica se dois slugs são compatíveis, tolerando variações OCR.

    Usa SequenceMatcher para evitar falsos positivos em slugs longos que
    compartilham muitos caracteres individuais mas têm sequências diferentes
    (ex: prevencao-ao-alcoolismo vs vigilancia-epidemiologica).
    """
    if a == b:
        return True
    if abs(len(a) - len(b)) > 2:
        return False
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.75


# ---------------------------------------------------------------------------
# Parse do índice (TOC)
# ---------------------------------------------------------------------------

def parse_toc(lines: list[str]) -> tuple[dict[str, str], dict[str, list[str]]]:
    """Lê o índice e retorna:
    - ramo_map: {nome_lower: ramo} para lookup por nome
    - ordered_toc: {ramo: [nome1, nome2, ...]} em ordem do índice

    Trata entradas multi-linha do OCR: quando uma linha não tem '...' mas a
    seguinte tem '(revisada) ... NNN', as duas linhas são combinadas.
    """
    ramo_map: dict[str, str] = {}
    ordered_toc: dict[str, list[str]] = {r: [] for r in TOC_SECTIONS}
    current_ramo = ""
    in_toc = False
    prev_non_empty = ""  # guarda linha anterior para tratar entradas bi-linha

    RE_CONTINUATION = re.compile(r"^\(.*?\)\s+\.\.\.\s+\d+\s*$")

    def _add(nome_raw: str) -> None:
        nome = clean_name(nome_raw)
        if nome and len(nome) >= 2:
            ramo_map[nome.lower()] = current_ramo
            ordered_toc[current_ramo].append(nome)

    for line in lines:
        stripped = line.strip()

        # Detecta cabeçalho de seção do TOC (aparecem como "# Ciência e Tecnologia")
        for ramo in TOC_SECTIONS:
            if stripped == f"# {ramo}" or stripped == ramo:
                current_ramo = ramo
                in_toc = True
                break

        if not in_toc or not current_ramo:
            if stripped:
                prev_non_empty = stripped
            continue

        # Encerra ao sair do TOC de especialidades
        for stop in TOC_STOP_PREFIXES:
            if stripped.startswith(stop):
                return ramo_map, ordered_toc

        # Entrada de continuação: "(revisada) ... 311" — combina com linha anterior
        if RE_CONTINUATION.match(stripped) and prev_non_empty:
            _add(prev_non_empty + " " + stripped.split("...")[0].strip())
            prev_non_empty = ""
            continue

        # Entrada "Nome ... página"
        m = RE_TOC_ENTRY.match(stripped)
        if m:
            nome_raw = m.group(1)
            # Se a parte antes de '...' parece continuação, combina com prev
            if nome_raw.startswith("(") and prev_non_empty:
                nome_raw = prev_non_empty + " " + nome_raw
            _add(nome_raw)
            prev_non_empty = ""
            continue

        # Entrada "Nome página" (sem "...")
        m2 = RE_PAGE_ENTRY.match(stripped)
        if m2:
            nome = clean_name(m2.group(1))
            if nome and len(nome) >= 2 and not nome.startswith("-") and not nome.startswith("!"):
                ramo_map[nome.lower()] = current_ramo
                ordered_toc[current_ramo].append(nome)
            prev_non_empty = ""
            continue

        if stripped:
            prev_non_empty = stripped

    return ramo_map, ordered_toc


# ---------------------------------------------------------------------------
# Parser do corpo
# ---------------------------------------------------------------------------

def is_section_header(text: str) -> str | None:
    clean = text.strip().upper()
    return SECTION_MARKERS.get(clean)


def is_specialty_heading(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 2 or stripped.isdigit():
        return False
    if stripped == stripped.upper() and len(stripped) > 3 and not any(c.isdigit() for c in stripped):
        return False
    if stripped in SKIP_HEADING_EXACT:
        return False
    return not any(stripped.startswith(p) for p in SKIP_HEADING_PREFIX)


def make_spec(nome: str, ramo: str, lineno: int, revisada: bool = False, nova: bool = False) -> dict:
    return {
        "nome": nome,
        "slug": slugify(nome),
        "ramo": ramo,
        "revisada": int(revisada),
        "nova": int(nova),
        "versao": "",
        "proponentes": "",
        "avaliadores": "",
        "nota_tecnica": "",
        "nivel1": 0,
        "nivel2": 0,
        "nivel3": 0,
        "after_levels": False,   # flag interna: NÍVEL markers já foram vistos
        "requisitos": [],
        "linha_inicio": lineno,
    }


class SpecialtyParser:
    def __init__(
        self,
        lines: list[str],
        ramo_map: dict[str, str],
        ordered_toc: dict[str, list[str]],
    ) -> None:
        self.lines = lines
        self.ramo_map = ramo_map
        # Fila mutável por ramo para recuperar nomes de especialidades sem heading
        self.queue: dict[str, deque[str]] = {
            ramo: deque(names) for ramo, names in ordered_toc.items()
        }
        self.current_ramo = ""
        self.specialties: list[dict] = []

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _flush(self, spec: dict) -> None:
        if spec.get("nome") and spec.get("ramo") and spec.get("requisitos"):
            spec.pop("after_levels", None)
            self.specialties.append(spec)

    def _lookup_ramo(self, nome: str) -> str:
        key = clean_name(nome).lower()
        return self.ramo_map.get(key, self.current_ramo)

    def _advance_queue(self, ramo: str, heading_slug: str) -> None:
        """Avança a fila do ramo até consumir a entrada correspondente ao heading.

        Busca no queue inteiro para não perder especialidades que ficam à frente
        de lacunas (unnamed specialties que não geraram restart).
        """
        q = self.queue[ramo]
        items = list(q)
        for idx, name in enumerate(items):
            if slug_match(heading_slug, slugify(name)):
                # Descarta tudo até e incluindo essa posição
                for _ in range(idx + 1):
                    q.popleft()
                return
        # Não encontrado → heading com OCR muito diferente; não altera a fila

    def _next_from_queue(self, ramo: str) -> str | None:
        q = self.queue[ramo]
        if q:
            return q.popleft()
        return None

    # ------------------------------------------------------------------
    # Parser principal
    # ------------------------------------------------------------------

    def parse(self) -> list[dict]:
        current: dict = {}
        in_body = False

        for lineno, raw in enumerate(self.lines, start=1):
            line = raw.rstrip()

            # Aguarda início do corpo
            if not in_body:
                if line.strip() == "# CIÊNCIA E TECNOLOGIA":
                    in_body = True
                    self.current_ramo = "Ciência e Tecnologia"
                continue

            # ── Headings ────────────────────────────────────────────────
            if line.startswith("# "):
                titulo = line[2:].strip()

                ramo = is_section_header(titulo)
                if ramo:
                    self._flush(current)
                    current = {}
                    self.current_ramo = ramo
                    continue

                if is_specialty_heading(titulo):
                    self._flush(current)
                    nome_limpo = clean_name(titulo)
                    revisada = "(revisada)" in titulo.lower()
                    nova = "(nova)" in titulo.lower() or "(novo)" in titulo.lower()
                    ramo_esp = self._lookup_ramo(titulo) or self.current_ramo
                    current = make_spec(nome_limpo, ramo_esp, lineno, revisada, nova)
                    self._advance_queue(ramo_esp, slugify(nome_limpo))
                continue

            stripped = line.strip()

            # ── Especialidade plain-text (sem heading `# `) ───────────────
            # Detecta tanto quando current está vazio (1ª de cada seção) quanto
            # quando current está ativo mas o nome da linha está na fila do índice
            # (especialidades sem NÍVEL markers entre elas, ex: "Vendas").
            _is_name_candidate = (
                stripped
                and not stripped.startswith("!")
                and not stripped.startswith("-")
                and not stripped.startswith(".")
                and not stripped[0].isdigit()
                and len(stripped) >= 2
                and len(stripped) < 80
                and not RE_ITEM.match(stripped)
                and not RE_ITEM_OPT.match(stripped)
                and not RE_NIVEL.match(stripped)
            )
            if _is_name_candidate:
                nome_limpo = clean_name(stripped)
                ramo_esp = self._lookup_ramo(stripped) or self.current_ramo
                slug_c = slugify(nome_limpo)
                q_list = list(self.queue.get(ramo_esp, deque()))
                is_queued = any(slug_match(slug_c, slugify(n)) for n in q_list[:10])

                # Verifica se há itens nas próximas N linhas
                max_peek = 6 if (not current and is_queued) else 2
                peek = [
                    self.lines[lineno + k].strip()
                    for k in range(max_peek)
                    if lineno + k < len(self.lines)
                ]
                has_items_soon = any(RE_ITEM.match(p) or RE_ITEM_OPT.match(p) for p in peek)

                # Inicia nova especialidade se:
                # - sem current: nome queued OU itens imediatos
                # - com current: nome queued E itens imediatos (mais restrito)
                should_start = (
                    (not current and (has_items_soon or is_queued)) or
                    (current and is_queued and has_items_soon)
                )
                if should_start:
                    if current:
                        self._flush(current)
                    revisada = "(revisada)" in stripped.lower()
                    nova = "(nova)" in stripped.lower() or "(novo)" in stripped.lower()
                    current = make_spec(nome_limpo, ramo_esp, lineno, revisada, nova)
                    self._advance_queue(ramo_esp, slug_c)
                    continue

            if not current:
                continue  # nenhuma especialidade ativa; ignora linha

            # ── Itens ────────────────────────────────────────────────────
            # Item opcional (verifica antes de obrigatório)
            m = RE_ITEM_OPT.match(stripped)
            if m:
                num = int(m.group(1))
                if num == 1 and current["after_levels"] and current["requisitos"]:
                    current = self._restart(current, lineno)
                posicao = len(current["requisitos"]) + 1
                current["requisitos"].append({"posicao": posicao, "texto": m.group(2).strip(), "opcional": 1})
                current["after_levels"] = False
                continue

            m = RE_ITEM.match(stripped)
            if m:
                num = int(m.group(1))
                if num == 1 and current["after_levels"] and current["requisitos"]:
                    current = self._restart(current, lineno)
                posicao = len(current["requisitos"]) + 1
                current["requisitos"].append({"posicao": posicao, "texto": m.group(2).strip(), "opcional": 0})
                current["after_levels"] = False
                continue

            # ── Níveis ───────────────────────────────────────────────────
            m = RE_NIVEL.match(stripped)
            if m:
                nivel = int(m.group(1))
                qtd = int(m.group(2))
                if nivel == 1:
                    current["nivel1"] = qtd
                elif nivel == 2:
                    current["nivel2"] = qtd
                elif nivel == 3:
                    current["nivel3"] = qtd
                current["after_levels"] = True
                continue

            # ── Metadados ────────────────────────────────────────────────
            if stripped.startswith("Versão:") or stripped.startswith("Versao:"):
                current["versao"] = stripped.split(":", 1)[1].strip()
            elif stripped.startswith("Proponente"):
                current["proponentes"] = stripped.split(":", 1)[1].strip() if ":" in stripped else stripped
            elif stripped.startswith("Avaliador") or stripped.startswith("Revisora"):
                current["avaliadores"] = stripped.split(":", 1)[1].strip() if ":" in stripped else stripped
            elif stripped.lower().startswith("nota técnica") or stripped.lower().startswith("nota tecnica"):
                current["nota_tecnica"] = stripped.split(":", 1)[1].strip() if ":" in stripped else stripped

        self._flush(current)
        return self.specialties

    def _restart(self, current: dict, lineno: int) -> dict:
        """Flush da especialidade atual e inicia nova usando próximo nome do índice."""
        self._flush(current)
        ramo = current["ramo"]
        next_name = self._next_from_queue(ramo)
        if next_name:
            return make_spec(next_name, ramo, lineno)
        # Fallback: especialidade sem nome indexado (edge case)
        return make_spec(f"_unnamed_{lineno}", ramo, lineno)


# ---------------------------------------------------------------------------
# Gravação do banco
# ---------------------------------------------------------------------------

def build_db(specialties: list[dict]) -> None:
    text_fixes = {
        (
            "Demonstrar que sabe encontrar citações na Bíblia através "
            "designações numéricas (ex. Mt 5,1-4...)."
        ): (
            "Demonstrar que sabe encontrar citações na Bíblia através "
            "de designações numéricas (ex. Mt 5,1-4)."
        ),
        (
            "Descrever o processo de produção de um produtos derivado de "
            "um rebanho escolhido (exemplo: queijo, iogurte, couro para "
            "confecção, etc...)"
        ): (
            "Descrever o processo de produção de um produto derivado de "
            "um rebanho escolhido (exemplo: queijo, iogurte, couro para "
            "confecção, etc.)"
        ),
    }

    DB_OUT.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA)
    cur = conn.cursor()

    ramo_ids: dict[str, int] = {}
    for ramo in TOC_SECTIONS:
        cur.execute("INSERT OR IGNORE INTO ramos(nome, slug) VALUES (?, ?)", (ramo, slugify(ramo)))
        cur.execute("SELECT id FROM ramos WHERE slug = ?", (slugify(ramo),))
        ramo_ids[ramo] = cur.fetchone()[0]

    seen_slugs: set[str] = set()
    for esp in specialties:
        esp["nome"] = esp["nome"].replace("## ", "").replace("# ", "").strip()
        esp["slug"] = slugify(esp["nome"])
        ramo_id = ramo_ids.get(esp["ramo"], list(ramo_ids.values())[0])
        total = len(esp["requisitos"])

        # Garante slug único
        slug = esp["slug"]
        if slug in seen_slugs:
            slug = f"{slug}-{sum(1 for s in seen_slugs if s.startswith(slug))}"
        seen_slugs.add(slug)

        cur.execute(
            """
            INSERT INTO especialidades(
                ramo_id, nome, slug, revisada, nova,
                versao, proponentes, avaliadores, nota_tecnica,
                nivel1_itens, nivel2_itens, nivel3_itens, total_itens,
                linha_inicio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ramo_id, esp["nome"], slug, esp["revisada"], esp["nova"],
                esp["versao"], esp["proponentes"], esp["avaliadores"], esp["nota_tecnica"],
                esp["nivel1"], esp["nivel2"], esp["nivel3"], total,
                esp["linha_inicio"],
            ),
        )
        esp_id = cur.lastrowid
        for req in esp["requisitos"]:
            texto = text_fixes.get(req["texto"], req["texto"])
            cur.execute(
                "INSERT INTO requisitos(especialidade_id, posicao, texto, opcional) VALUES (?, ?, ?, ?)",
                (esp_id, req["posicao"], texto, req["opcional"]),
            )

    conn.commit()
    disk = sqlite3.connect(DB_OUT)
    conn.backup(disk)
    disk.close()
    conn.close()


# ---------------------------------------------------------------------------
# Relatório e main
# ---------------------------------------------------------------------------

def report(specialties: list[dict], ordered_toc: dict[str, list[str]]) -> None:
    from collections import Counter
    ramos = Counter(e["ramo"] for e in specialties)
    total_req = sum(len(e["requisitos"]) for e in specialties)
    print(f"[OK] {len(specialties)} especialidades | {total_req} requisitos")
    for ramo in TOC_SECTIONS:
        n_db = ramos.get(ramo, 0)
        n_toc = len(ordered_toc.get(ramo, []))
        diff = f" (índice={n_toc}, faltando={n_toc - n_db})" if n_db < n_toc else f" (índice={n_toc})"
        print(f"  {ramo}: {n_db}{diff}")

    in_db_slugs = {slugify(e["nome"]) for e in specialties}
    missing: dict[str, list[str]] = {}
    for ramo, names in ordered_toc.items():
        for nome in names:
            sl = slugify(nome)
            if not any(slug_match(sl, s) for s in in_db_slugs):
                missing.setdefault(ramo, []).append(nome)
    if missing:
        print("[FALTANDO no banco vs índice]")
        for ramo, names in missing.items():
            print(f"  {ramo}: {names}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    lines = GUIA_MD.read_text(encoding="utf-8").splitlines()
    print(f"[lendo] {GUIA_MD.name} — {len(lines)} linhas")
    ramo_map, ordered_toc = parse_toc(lines)
    toc_total = sum(len(v) for v in ordered_toc.values())
    print(f"[toc] {toc_total} especialidades no índice")
    parser = SpecialtyParser(lines, ramo_map, ordered_toc)
    specialties = parser.parse()
    report(specialties, ordered_toc)
    build_db(specialties)
    print(f"[db] {DB_OUT}")


if __name__ == "__main__":
    main()
