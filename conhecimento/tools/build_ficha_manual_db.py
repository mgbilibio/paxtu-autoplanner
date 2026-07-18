"""Gera um banco de fichas manuais a partir do catalogo plano de especialidades.

Fonte de entrada:
- `conhecimento/bd/especialidades_guia.sqlite`

Saida:
- `conhecimento/bd/fichas_especialidades.sqlite`

O banco resultante cria a camada de ficha manual sem alterar o catalogo mestre.
Cada especialidade do catalogo vira uma ficha com passos espelhando os requisitos.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_DB = ROOT / "bd" / "especialidades_guia.sqlite"
OUT_DB = ROOT / "bd" / "fichas_especialidades_20260427.sqlite"
SCHEMA_PATH = ROOT / "bd" / "schema.sql"


def connect_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def create_schema(conn: sqlite3.Connection) -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema)


def load_catalog() -> list[dict]:
    conn = connect_db(CATALOG_DB)
    cur = conn.cursor()
    rows = cur.execute(
        """
        select e.id, e.nome, e.slug, e.ramo_id, r.nome, e.nivel1_itens,
               e.nivel2_itens, e.nivel3_itens, e.total_itens, e.fonte, e.linha_inicio
        from especialidades e
        join ramos r on r.id = e.ramo_id
        order by e.ramo_id, e.id
        """
    ).fetchall()
    req_rows = cur.execute(
        """
        select especialidade_id, posicao, texto, opcional
        from requisitos
        order by especialidade_id, posicao
        """
    ).fetchall()
    conn.close()

    req_map: dict[int, list[tuple[int, str, int]]] = {}
    for especialidade_id, posicao, texto, opcional in req_rows:
        req_map.setdefault(int(especialidade_id), []).append((int(posicao), texto, int(opcional)))

    catalog: list[dict] = []
    for row in rows:
        catalog.append(
            {
                "id": int(row[0]),
                "nome": row[1],
                "slug": row[2],
                "ramo_id": int(row[3]),
                "ramo_nome": row[4],
                "nivel1": int(row[5] or 0),
                "nivel2": int(row[6] or 0),
                "nivel3": int(row[7] or 0),
                "total": int(row[8] or 0),
                "fonte": row[9],
                "linha_inicio": int(row[10] or 0),
                "requisitos": req_map.get(int(row[0]), []),
            }
        )
    return catalog


def build() -> None:
    mem = sqlite3.connect(":memory:")
    mem.execute("PRAGMA foreign_keys = ON;")
    create_schema(mem)
    cur = mem.cursor()
    catalog = load_catalog()

    ficha_id = 0
    passo_id = 0
    revisao_id = 0

    for item in catalog:
        ficha_id += 1
        descricao_curta = f"Ficha manual de {item['nome']}."
        descricao_longa = (
            f"Ficha manual de {item['nome']} no ramo {item['ramo_nome']}. "
            f"Contem {item['total']} requisitos numerados e trilha de acompanhamento."
        )
        cur.execute(
            """
            insert into specialty_fichas
            (id, especialidade_id, nome, ramo_id, descricao_curta, descricao_longa,
             fonte_pdf, fonte_md, fonte_pagina, status, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (
                ficha_id,
                item["id"],
                item["nome"],
                item["ramo_id"],
                descricao_curta,
                descricao_longa,
                "docs/biblioteca/Guia de Especialidades 18a Edição - 2024-1.pdf",
                "docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md",
                str(item["linha_inicio"]),
                "draft",
            ),
        )

        for posicao, texto, opcional in item["requisitos"]:
            passo_id += 1
            cur.execute(
                """
                insert into specialty_ficha_passos
                (id, ficha_id, posicao, titulo, texto, obrigatorio, status)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    passo_id,
                    ficha_id,
                    posicao,
                    f"Requisito {posicao}",
                    texto,
                    0 if opcional else 1,
                    "pending",
                ),
            )

        revisao_id += 1
        cur.execute(
            """
            insert into specialty_ficha_revisoes
            (id, ficha_id, avaliador, resultado, observacao, created_at)
            values (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                revisao_id,
                ficha_id,
                "",
                "pending",
                "",
            ),
        )

    mem.commit()
    disk = connect_db(OUT_DB)
    mem.backup(disk)
    disk.commit()
    disk.close()
    mem.close()


if __name__ == "__main__":
    build()
