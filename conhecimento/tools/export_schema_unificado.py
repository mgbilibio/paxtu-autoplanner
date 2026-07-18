#!/usr/bin/env python3
"""
Script de exportação de schemas SQLite unificados.
Extrai CREATE TABLE de dois bancos e consolida em arquivo único.
"""

import sqlite3
from datetime import datetime
from pathlib import Path

# Paths relativos ao script (antes apontavam para paxtuplanner/conhecimento sem o
# segmento PaxtuAP/ — caminho inexistente).
_BD = Path(__file__).resolve().parents[1] / "bd"
BD_PROGRESSAO = str(_BD / "progressao_2025.sqlite")
BD_ESPECIALIDADES = str(_BD / "especialidades_guia.sqlite")
OUTPUT_PATH = str(_BD / "schema_unificado.sql")

HEADER = """-- ==========================================================
-- Schema unificado do projeto Paxtu Planner
-- Gerado em: {timestamp}
-- Origem: progressao_2025.sqlite + especialidades_guia.sqlite
-- ==========================================================

PRAGMA encoding = "UTF-8";

OBSERVACAO: Os nomes 'ramos' aparecem em ambos os blocos com semanticas
diferentes: em progressao tem 2 entradas (Lobinho, Escoteiro), em
especialidades tem 5 (C&T, Cultura, Desportos, Servicos, HE).
Para unificacao futura, renomear para prog_ramos e esp_ramos.

-- ----------------------------------------------------------
-- Bloco 1: Progressao Pessoal 2025+ (prefixo logico: prog_)
-- Origem: progressao_2025.sqlite
-- ----------------------------------------------------------

"""

SEPARATOR = """
-- ----------------------------------------------------------
-- Bloco 2: Catalogo de Especialidades (prefixo logico: esp_)
-- Origem: especialidades_guia.sqlite (Guia 18a Ed. 2024-1)
-- ----------------------------------------------------------

"""


def extract_create_tables(db_path):
    """Extrai CREATE TABLE statements de um banco SQLite."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL"
        )
        creates = [row[0] for row in cursor.fetchall()]
        conn.close()
        return creates
    except Exception as e:
        print(f"ERRO ao ler {db_path}: {e}")
        return []


def main():
    """Executa extração e consolidação."""
    print("[*] Extraindo schemas...")

    # Extrai schemas
    tables_progressao = extract_create_tables(BD_PROGRESSAO)
    tables_esp = extract_create_tables(BD_ESPECIALIDADES)

    print(f"  - progressao_2025.sqlite: {len(tables_progressao)} tabelas")
    print(f"  - especialidades_guia.sqlite: {len(tables_esp)} tabelas")

    # Monta output
    timestamp = datetime.now().isoformat()
    output = HEADER.format(timestamp=timestamp)

    for create in tables_progressao:
        output += create + ";\n\n"

    output += SEPARATOR

    for create in tables_esp:
        output += create + ";\n\n"

    # Escreve arquivo UTF-8 sem BOM
    Path(OUTPUT_PATH).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(output)

    file_size = Path(OUTPUT_PATH).stat().st_size
    print(f"\n[+] Arquivo gerado: {OUTPUT_PATH}")
    print(f"    Tamanho: {file_size} bytes")
    print(f"    Tabelas: {len(tables_progressao)} (prog) + {len(tables_esp)} (esp)")


if __name__ == "__main__":
    main()
