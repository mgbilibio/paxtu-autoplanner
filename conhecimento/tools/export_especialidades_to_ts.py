"""Lê especialidades_guia.sqlite e emite JSON + tipos TS pequeno.

274 especialidades / 2741 requisitos do Guia 18a Edição 2024-1.
Gera: especialidades_guia.json (data) + especialidades_guia.ts (tipos + exports)
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "conhecimento" / "bd" / "especialidades_guia.sqlite"
OUT_JSON = ROOT / "src" / "data" / "generated" / "especialidades_guia.json"
OUT_TS = ROOT / "src" / "data" / "generated" / "especialidades_guia.ts"


def main() -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cur.execute("SELECT id, nome, slug FROM ramos ORDER BY id")
    ramos = [{"id": r[0], "nome": r[1], "slug": r[2]} for r in cur.fetchall()]

    cur.execute(
        "SELECT id, ramo_id, nome, slug, nivel1_itens, nivel2_itens, nivel3_itens, total_itens, fonte "
        "FROM especialidades ORDER BY ramo_id, id"
    )
    esps = [
        {
            "id": r[0], "ramoId": r[1], "nome": r[2], "slug": r[3],
            "nivel1": r[4], "nivel2": r[5], "nivel3": r[6], "totalItens": r[7],
            "fonte": r[8],
        }
        for r in cur.fetchall()
    ]

    cur.execute("SELECT especialidade_id, posicao, texto, opcional FROM requisitos ORDER BY especialidade_id, posicao")
    reqs = [{"especialidadeId": r[0], "posicao": r[1], "texto": r[2], "opcional": r[3]} for r in cur.fetchall()]

    conn.close()

    data = {
        "ramos": ramos,
        "especialidades": esps,
        "requisitos": reqs,
    }

    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] {OUT_JSON}")
    print(f"     {len(ramos)} ramos | {len(esps)} especialidades | {len(reqs)} requisitos")

    ts_content = '''import dataJson from './especialidades_guia.json';

export interface RamoEspecialidade { id: number; nome: string; slug: string; }
export interface EspecialidadeGuia { id: number; ramoId: number; nome: string; slug: string; nivel1: number; nivel2: number; nivel3: number; totalItens: number; fonte: string; }
export interface RequisitoEspecialidade { especialidadeId: number; posicao: number; texto: string; opcional: number; }

export const RAMOS_ESPECIALIDADES = (dataJson as any).ramos as RamoEspecialidade[];
export const ESPECIALIDADES_GUIA = (dataJson as any).especialidades as EspecialidadeGuia[];
export const REQUISITOS_GUIA = (dataJson as any).requisitos as RequisitoEspecialidade[];
'''

    OUT_TS.write_text(ts_content, encoding="utf-8")
    print(f"[OK] {OUT_TS}")


if __name__ == "__main__":
    main()
