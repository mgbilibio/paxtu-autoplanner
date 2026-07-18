#!/usr/bin/env python
"""Resolve orphan especialidade names via manual aliases.

Idempotent script that adds missing alias mappings to especialidade_alias table.
Run after manual inspection of missing specialties.
"""
import sqlite3
import sys
from pathlib import Path

# Manual aliases found by inspection of especialidades_guia.sqlite.
# NOTA (M17): 'Esportes de Quadra' e 'Redes de Computadores' foram DELIBERADAMENTE
# removidos daqui. A revisao normativa posterior (fix_aliases_suspeitos.py, 2026-04-27,
# leitura cruzada Manual x Guia) decidiu que NAO ha equivalente direto no Guia 18a Ed.
# e os REMOVE. Mante-los aqui tornaria o pipeline nao-deterministico (dependente da
# ordem de execucao). fix_aliases_suspeitos.py e a autoridade para esses casos.
MANUAL_ALIASES = {
    'Brasilidades': 'Cultura Brasileira',
    'Civilizacoes da Antiguidade': 'História Mundial',
    'Civilizações da Antiguidade': 'História Mundial',
    'Costura e Estilismo': 'Costura',
    'Design de Interiores': 'Decoração',
    'Escotismo Mundial': 'História do Escotismo',
    'Investimentos': 'Educação Financeira',
    'Jardinagem e Paisagismo': 'Jardinagem',
    'Origami': 'Arte em Origami',
    'Producao Grafica': 'Artes Gráficas',
    'Produção Gráfica': 'Artes Gráficas',
    'Seguranca e Emergencia Nautica': 'Segurança no Mar',
    'Segurança e Emergência Náutica': 'Segurança no Mar',
    'Tiro com Arco': 'Arco e Flecha',
}

# Orphans with no legitimate mapping found
NO_MAPPING = {
    'Paz e Justica': 'No matching specialty in guide (likely Badge/Insignia)',
    'Paz e Justiça': 'No matching specialty in guide (likely Badge/Insignia)',
    'Diálogo inter-religioso': 'No matching specialty in guide (likely Badge/Insignia)',
}

def main():
    db_path = Path(__file__).parent.parent / 'bd' / 'progressao_2025.sqlite'

    if not db_path.exists():
        print(f"Error: Database not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    print("="*80)
    print("INSERTING MANUAL ALIASES")
    print("="*80)

    inserted = 0
    skipped = 0

    for orfa, canonico in MANUAL_ALIASES.items():
        # Check if already exists
        cursor.execute(
            'SELECT COUNT(*) FROM especialidade_alias WHERE nome_manual = ?',
            (orfa,)
        )
        if cursor.fetchone()[0] > 0:
            print(f"  SKIP {orfa} -> {canonico} (already exists)")
            skipped += 1
            continue

        # Verify canonico exists in especialidades_guia
        espec_path = Path(__file__).parent.parent / 'bd' / 'especialidades_guia.sqlite'
        espec_conn = sqlite3.connect(str(espec_path))
        espec_cursor = espec_conn.cursor()
        espec_cursor.execute('SELECT nome FROM especialidades WHERE nome = ?', (canonico,))
        if not espec_cursor.fetchone():
            print(f"  ERROR {orfa} -> {canonico} (canonical name not found in guide)")
            espec_conn.close()
            continue
        espec_conn.close()

        # Insert
        cursor.execute(
            'INSERT INTO especialidade_alias (nome_manual, nome_canonico) VALUES (?, ?)',
            (orfa, canonico)
        )
        print(f"  ADD   {orfa} -> {canonico}")
        inserted += 1

    conn.commit()

    print("\n" + "="*80)
    print("UNRESOLVED ORPHANS (No legitimate mapping)")
    print("="*80)

    for orfa, reason in NO_MAPPING.items():
        print(f"  {orfa}")
        print(f"    > {reason}")

    print("\n" + "="*80)
    print(f"Summary: {inserted} inserted, {skipped} skipped, {len(NO_MAPPING)} unresolved")
    print("="*80)

    conn.close()

if __name__ == '__main__':
    main()
