"""Aplica correcoes nos aliases suspeitos (similaridade < 0.6) baseado em revisao normativa.

Decisoes (2026-04-27, baseado em leitura cruzada Manual×Guia):

CORRIGIR:
- "Investimentos" -> "Educacao Financeira" (era "Bolsa de Valores", muito especifico)

REMOVER (sem equivalente direto no Guia 18a Ed.):
- "Esportes de Quadra" -> nao ha categoria generica; especialidades especificas (Voleibol,
  Futebol, etc.) ficam como complemento; o nome amplo nao linka
- "Redes de Computadores" -> nao existe especialidade com esse nome no guia

Idempotente: pode rodar varias vezes.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "bd" / "progressao_2025.sqlite"

CORRIGIR = [
    ("Investimentos", "Educação Financeira"),
]

REMOVER = [
    "Esportes de Quadra",
    "Redes de Computadores",
    "Paz e Justiça",
    "Diálogo inter-religioso",
]


def main() -> None:
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    for nome_manual, novo_canonico in CORRIGIR:
        cur.execute("UPDATE especialidade_alias SET nome_canonico=? WHERE nome_manual=?", (novo_canonico, nome_manual))
        if cur.rowcount > 0:
            print(f"[CORRIGIDO] {nome_manual!r} -> {novo_canonico!r}")
        else:
            cur.execute("INSERT OR IGNORE INTO especialidade_alias(nome_manual, nome_canonico) VALUES (?, ?)", (nome_manual, novo_canonico))
            print(f"[INSERIDO] {nome_manual!r} -> {novo_canonico!r}")

    for nome_manual in REMOVER:
        # Remove tanto da tabela alias quanto de bloco_especialidades
        cur.execute("DELETE FROM especialidade_alias WHERE nome_manual=?", (nome_manual,))
        rem_alias = cur.rowcount
        cur.execute("DELETE FROM bloco_especialidades WHERE especialidade_nome=?", (nome_manual,))
        rem_blocos = cur.rowcount
        print(f"[REMOVIDO] {nome_manual!r}: {rem_alias} alias(es), {rem_blocos} entrada(s) em bloco_especialidades")

    conn.commit()

    # Relatorio
    total_aliases = cur.execute("SELECT COUNT(*) FROM especialidade_alias").fetchone()[0]
    total_bloco_esp = cur.execute("SELECT COUNT(*) FROM bloco_especialidades").fetchone()[0]
    print(f"\n[OK] Estado atual: {total_aliases} aliases, {total_bloco_esp} bloco_especialidades.")
    conn.close()


if __name__ == "__main__":
    main()
