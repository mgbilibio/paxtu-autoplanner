"""Audita a base operacional 2025+ e gera relatorio Markdown."""

from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB_PROGRESSAO = ROOT / "conhecimento" / "bd" / "progressao_2025.sqlite"
DB_ESPECIALIDADES = ROOT / "conhecimento" / "bd" / "especialidades_guia.sqlite"
OUT = ROOT / "conhecimento" / "docs" / "diagnostico_base_operacional.md"


def scalar(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    cur = conn.execute(sql, params)
    return int(cur.fetchone()[0])


def rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[tuple]:
    return list(conn.execute(sql, params))


def tabela_totais(conn: sqlite3.Connection, tabelas: list[str]) -> list[str]:
    linhas = ["| Tabela | Total |", "|---|---:|"]
    for tabela in tabelas:
        linhas.append(f"| `{tabela}` | {scalar(conn, f'SELECT COUNT(*) FROM {tabela}')} |")
    return linhas


def progresso_por_ramo(conn: sqlite3.Connection) -> list[str]:
    sql = """
        SELECT r.nome,
               COUNT(DISTINCT e.id) AS etapas,
               COUNT(DISTINCT b.id) AS blocos,
               COUNT(DISTINCT af.id) AS fixas,
               COUNT(DISTINCT av.id) AS variaveis
        FROM ramos r
        LEFT JOIN etapas e ON e.ramo_id = r.id
        LEFT JOIN bloco_ramo_meta m ON m.ramo_id = r.id
        LEFT JOIN blocos b ON b.id = m.bloco_id
        LEFT JOIN acoes_fixas af ON af.ramo_id = r.id
        LEFT JOIN acoes_variaveis av ON av.ramo_id = r.id
        GROUP BY r.id, r.nome
        ORDER BY r.id
    """
    linhas = ["| Ramo | Etapas | Blocos | Fixas | Variaveis |", "|---|---:|---:|---:|---:|"]
    for ramo, etapas, blocos, fixas, variaveis in rows(conn, sql):
        linhas.append(f"| {ramo} | {etapas} | {blocos} | {fixas} | {variaveis} |")
    return linhas


def progresso_por_bloco(conn: sqlite3.Connection) -> list[str]:
    sql = """
        SELECT b.ordem_global, b.nome, r.nome,
               COUNT(DISTINCT af.id) AS fixas,
               COUNT(DISTINCT av.id) AS variaveis,
               m.variaveis_minimo
        FROM blocos b
        JOIN bloco_ramo_meta m ON m.bloco_id = b.id
        JOIN ramos r ON r.id = m.ramo_id
        LEFT JOIN acoes_fixas af ON af.bloco_id = b.id AND af.ramo_id = r.id
        LEFT JOIN acoes_variaveis av ON av.bloco_id = b.id AND av.ramo_id = r.id
        GROUP BY b.id, r.id
        ORDER BY b.ordem_global, r.id
    """
    linhas = ["| Bloco | Nome | Ramo | Fixas | Variaveis | Minimo |", "|---:|---|---|---:|---:|---:|"]
    for ordem, nome, ramo, fixas, variaveis, minimo in rows(conn, sql):
        linhas.append(f"| {ordem} | {nome} | {ramo} | {fixas} | {variaveis} | {minimo} |")
    return linhas


def especialidades_por_ramo(conn: sqlite3.Connection) -> list[str]:
    sql = """
        SELECT r.nome, COUNT(e.id), COALESCE(SUM(e.nivel1_itens), 0),
               COALESCE(SUM(e.nivel2_itens), 0), COALESCE(SUM(e.nivel3_itens), 0)
        FROM ramos r
        LEFT JOIN especialidades e ON e.ramo_id = r.id
        GROUP BY r.id, r.nome
        ORDER BY r.id
    """
    linhas = ["| Ramo | Especialidades | Nivel 1 | Nivel 2 | Nivel 3 |", "|---|---:|---:|---:|---:|"]
    for ramo, total, n1, n2, n3 in rows(conn, sql):
        linhas.append(f"| {ramo} | {total} | {n1} | {n2} | {n3} |")
    return linhas


def achados(progressao: sqlite3.Connection, especialidades: sqlite3.Connection) -> list[str]:
    itens: list[str] = []
    sem_req = rows(especialidades, """
        SELECT e.nome
        FROM especialidades e
        LEFT JOIN requisitos r ON r.especialidade_id = e.id
        GROUP BY e.id
        HAVING COUNT(r.id) = 0
        ORDER BY e.nome
    """)
    req_vazios = scalar(especialidades, "SELECT COUNT(*) FROM requisitos WHERE TRIM(texto) = ''")
    min_invalido = scalar(progressao, """
        SELECT COUNT(*)
        FROM bloco_ramo_meta m
        WHERE m.variaveis_minimo > (
            SELECT COUNT(*)
            FROM acoes_variaveis av
            WHERE av.bloco_id = m.bloco_id AND av.ramo_id = m.ramo_id
        )
    """)
    fonte_vazia = scalar(progressao, "SELECT COUNT(*) FROM bloco_ramo_meta WHERE TRIM(fonte_pagina) = ''")
    aliases = scalar(progressao, "SELECT COUNT(*) FROM especialidade_alias")
    itens.append(f"- Especialidades sem requisitos: {len(sem_req)}")
    itens.append(f"- Requisitos vazios: {req_vazios}")
    itens.append(f"- Metas com minimo variavel invalido: {min_invalido}")
    itens.append(f"- Metas sem pagina fonte: {fonte_vazia}")
    itens.append(f"- Aliases cadastrados: {aliases}")
    return itens


def main() -> None:
    progressao = sqlite3.connect(DB_PROGRESSAO)
    especialidades = sqlite3.connect(DB_ESPECIALIDADES)
    linhas = [
        "# Diagnostico da base operacional",
        "",
        f"Gerado em: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Totais progressao 2025+",
        "",
        *tabela_totais(progressao, [
            "ramos", "etapas", "eixos", "blocos", "bloco_ramo_meta",
            "acoes_fixas", "acoes_variaveis", "bloco_especialidades",
            "bloco_insignias", "especialidade_alias", "reconhecimentos_ramo",
            "reconhecimento_requisitos",
        ]),
        "",
        "## Totais especialidades",
        "",
        *tabela_totais(especialidades, ["ramos", "especialidades", "requisitos"]),
        "",
        "## Progressao por ramo",
        "",
        *progresso_por_ramo(progressao),
        "",
        "## Progressao por bloco e ramo",
        "",
        *progresso_por_bloco(progressao),
        "",
        "## Especialidades por ramo",
        "",
        *especialidades_por_ramo(especialidades),
        "",
        "## Achados automaticos",
        "",
        *achados(progressao, especialidades),
        "",
    ]
    OUT.write_text("\n".join(linhas), encoding="utf-8")
    progressao.close()
    especialidades.close()
    print(f"[OK] relatorio gerado: {OUT}")


if __name__ == "__main__":
    main()
