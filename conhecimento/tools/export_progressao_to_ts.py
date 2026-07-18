"""Lê progressao_2025.sqlite e emite src/data/generated/progressao_2025.ts.

Saída: módulo TypeScript self-contained com tipos e dados imutáveis.
Reprodutível: rodar sempre que progressao_2025.sqlite for regenerado.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "conhecimento" / "bd" / "progressao_2025.sqlite"
OUT = ROOT / "src" / "data" / "generated" / "progressao_2025.ts"


def js(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def fetch_all_dict(conn: sqlite3.Connection, sql: str) -> list[dict]:
    cur = conn.cursor()
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)

    ramos = fetch_all_dict(conn, "SELECT id, nome, slug, faixa_etaria, grupo_secao FROM ramos ORDER BY id")
    eixos = fetch_all_dict(conn, "SELECT id, nome, slug, ordem, cor_hex, descricao FROM eixos ORDER BY ordem")
    etapas = fetch_all_dict(
        conn,
        "SELECT id, ramo_id, nome, slug, ordem, blocos_cumulativos, blocos_nesta_etapa, idade_referencia "
        "FROM etapas ORDER BY ramo_id, ordem",
    )
    blocos = fetch_all_dict(conn, "SELECT id, eixo_id, nome, slug, ordem_global FROM blocos ORDER BY ordem_global")
    bloco_ramo_meta = fetch_all_dict(
        conn,
        "SELECT bloco_id, ramo_id, intencionalidade_educativa, variaveis_minimo, fonte_pagina "
        "FROM bloco_ramo_meta ORDER BY bloco_id, ramo_id",
    )
    acoes_fixas = fetch_all_dict(
        conn,
        "SELECT bloco_id, ramo_id, descricao, modalidade, ordem FROM acoes_fixas ORDER BY bloco_id, ramo_id, ordem",
    )
    acoes_variaveis = fetch_all_dict(
        conn,
        "SELECT bloco_id, ramo_id, descricao, modalidade, ordem FROM acoes_variaveis ORDER BY bloco_id, ramo_id, ordem",
    )
    bloco_especialidades = fetch_all_dict(
        conn,
        "SELECT bloco_id, ramo_id, especialidade_nome, tipo, nivel_minimo "
        "FROM bloco_especialidades ORDER BY bloco_id, ramo_id, id",
    )
    bloco_insignias = fetch_all_dict(
        conn,
        "SELECT bloco_id, ramo_id, insignia_nome, tipo FROM bloco_insignias ORDER BY bloco_id, ramo_id, id",
    )
    reconhecimentos = fetch_all_dict(
        conn,
        "SELECT id, ramo_id, nome, slug, idade_limite_anos, descricao, fonte_pagina "
        "FROM reconhecimentos_ramo ORDER BY id",
    )
    rec_reqs = fetch_all_dict(
        conn,
        "SELECT reconhecimento_id, tipo, descricao, ordem FROM reconhecimento_requisitos ORDER BY reconhecimento_id, ordem",
    )
    conn.close()

    lines: list[str] = []
    lines.append("// AUTO-GERADO por conhecimento/tools/export_progressao_to_ts.py")
    lines.append("// NÃO EDITAR MANUALMENTE — rode o script para regenerar.")
    lines.append("// Fonte: conhecimento/bd/progressao_2025.sqlite")
    lines.append("")
    lines.append("export interface Ramo2025 { id: number; nome: string; slug: string; faixaEtaria: string; grupoSecao: string; }")
    lines.append("export interface Eixo2025 { id: number; nome: string; slug: string; ordem: number; corHex: string; descricao: string; }")
    lines.append("export interface Etapa2025 { id: number; ramoId: number; nome: string; slug: string; ordem: number; blocosCumulativos: number; blocosNestaEtapa: number; idadeReferencia: string; }")
    lines.append("export interface Bloco2025 { id: number; eixoId: number; nome: string; slug: string; ordemGlobal: number; }")
    lines.append("export interface BlocoRamoMeta { blocoId: number; ramoId: number; intencionalidade: string; variaveisMinimo: number; fontePagina: string; }")
    lines.append("export interface AcaoEducativa { blocoId: number; ramoId: number; descricao: string; modalidade: 'geral'|'ar'|'mar'; ordem: number; }")
    lines.append("export interface BlocoEspecialidade { blocoId: number; ramoId: number; nome: string; tipo: 'substitui'|'complemento'; nivelMinimo: number; }")
    lines.append("export interface BlocoInsignia { blocoId: number; ramoId: number; nome: string; tipo: 'substitui'|'complemento'; }")
    lines.append("export interface ReconhecimentoRamo { id: number; ramoId: number; nome: string; slug: string; idadeLimiteAnos: number | null; descricao: string; fontePagina: string; }")
    lines.append("export interface ReconhecimentoRequisito { reconhecimentoId: number; tipo: string; descricao: string; ordem: number; }")
    lines.append("")

    def emit(name: str, items: list[dict], mapper) -> None:
        lines.append(f"export const {name} = [")
        for it in items:
            lines.append(f"  {mapper(it)},")
        lines.append("] as const;")
        lines.append("")

    emit("RAMOS_2025", ramos, lambda r: js({"id": r["id"], "nome": r["nome"], "slug": r["slug"], "faixaEtaria": r["faixa_etaria"], "grupoSecao": r["grupo_secao"]}))
    emit("EIXOS_2025", eixos, lambda e: js({"id": e["id"], "nome": e["nome"], "slug": e["slug"], "ordem": e["ordem"], "corHex": e["cor_hex"], "descricao": e["descricao"]}))
    emit("ETAPAS_2025", etapas, lambda e: js({"id": e["id"], "ramoId": e["ramo_id"], "nome": e["nome"], "slug": e["slug"], "ordem": e["ordem"], "blocosCumulativos": e["blocos_cumulativos"], "blocosNestaEtapa": e["blocos_nesta_etapa"], "idadeReferencia": e["idade_referencia"]}))
    emit("BLOCOS_2025", blocos, lambda b: js({"id": b["id"], "eixoId": b["eixo_id"], "nome": b["nome"], "slug": b["slug"], "ordemGlobal": b["ordem_global"]}))
    emit("BLOCO_RAMO_META_2025", bloco_ramo_meta, lambda m: js({"blocoId": m["bloco_id"], "ramoId": m["ramo_id"], "intencionalidade": m["intencionalidade_educativa"], "variaveisMinimo": m["variaveis_minimo"], "fontePagina": m["fonte_pagina"]}))
    emit("ACOES_FIXAS_2025", acoes_fixas, lambda a: js({"blocoId": a["bloco_id"], "ramoId": a["ramo_id"], "descricao": a["descricao"], "modalidade": a["modalidade"], "ordem": a["ordem"]}))
    emit("ACOES_VARIAVEIS_2025", acoes_variaveis, lambda a: js({"blocoId": a["bloco_id"], "ramoId": a["ramo_id"], "descricao": a["descricao"], "modalidade": a["modalidade"], "ordem": a["ordem"]}))
    emit("BLOCO_ESPECIALIDADES_2025", bloco_especialidades, lambda b: js({"blocoId": b["bloco_id"], "ramoId": b["ramo_id"], "nome": b["especialidade_nome"], "tipo": b["tipo"], "nivelMinimo": b["nivel_minimo"]}))
    emit("BLOCO_INSIGNIAS_2025", bloco_insignias, lambda b: js({"blocoId": b["bloco_id"], "ramoId": b["ramo_id"], "nome": b["insignia_nome"], "tipo": b["tipo"]}))
    emit("RECONHECIMENTOS_2025", reconhecimentos, lambda r: js({"id": r["id"], "ramoId": r["ramo_id"], "nome": r["nome"], "slug": r["slug"], "idadeLimiteAnos": r["idade_limite_anos"], "descricao": r["descricao"], "fontePagina": r["fonte_pagina"]}))
    emit("RECONHECIMENTO_REQUISITOS_2025", rec_reqs, lambda r: js({"reconhecimentoId": r["reconhecimento_id"], "tipo": r["tipo"], "descricao": r["descricao"], "ordem": r["ordem"]}))

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] {OUT} gerado")
    print(f"     {len(ramos)} ramos | {len(eixos)} eixos | {len(etapas)} etapas | {len(blocos)} blocos")
    print(f"     {len(acoes_fixas)} fixas | {len(acoes_variaveis)} variaveis")
    print(f"     {len(bloco_especialidades)} bloco_especialidades | {len(bloco_insignias)} bloco_insignias")
    print(f"     {len(reconhecimentos)} reconhecimentos | {len(rec_reqs)} requisitos")


if __name__ == "__main__":
    main()
