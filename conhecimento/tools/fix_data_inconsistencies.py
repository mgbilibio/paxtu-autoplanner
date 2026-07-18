import sqlite3
import unicodedata
import difflib
from pathlib import Path

# Paths relativos ao script (antes apontavam para paxtuplanner/conhecimento, sem o
# PaxtuAP/ — caminho inexistente que fazia o script operar no DB errado/falhar).
_BD = Path(__file__).resolve().parents[1] / "bd"
PROGRESSAO_DB = _BD / "progressao_2025.sqlite"
ESPECIALIDADES_DB = _BD / "especialidades_guia.sqlite"

def normalize_string(s):
    """Remove accents and lowercase for comparison."""
    if not s:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower())
                   if unicodedata.category(c) != 'Mn')

def fix_insignia_migration():
    """Fix 1: Migrate 'Insígnia do Aprender' to bloco_insignias."""
    conn = sqlite3.connect(PROGRESSAO_DB)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO bloco_insignias (bloco_id, ramo_id, insignia_nome, tipo)
            SELECT bloco_id, ramo_id, 'Insígnia do Aprender', 'substitui'
            FROM bloco_especialidades
            WHERE especialidade_nome = 'Insígnia do Aprender'
            AND NOT EXISTS (
                SELECT 1 FROM bloco_insignias
                WHERE bloco_especialidades.bloco_id = bloco_insignias.bloco_id
                AND bloco_especialidades.ramo_id = bloco_insignias.ramo_id
                AND bloco_insignias.insignia_nome = 'Insígnia do Aprender'
            )
        """)
        cursor.execute("""
            DELETE FROM bloco_especialidades
            WHERE especialidade_nome = 'Insígnia do Aprender'
        """)
        conn.commit()
        affected = cursor.rowcount
        print(f"[FIX1] Insignia migration completed ({affected} rows)")
    except Exception as e:
        print(f"[FIX1] Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def fix_especialidades_names():
    """Fix 2: Clean markdown prefixes from especialidades."""
    conn = sqlite3.connect(ESPECIALIDADES_DB)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE especialidades
            SET nome = TRIM(REPLACE(REPLACE(nome, '## ', ''), '# ', ''))
            WHERE nome LIKE '##%' OR nome LIKE '#%'
        """)
        conn.commit()
        affected = cursor.rowcount
        print(f"[FIX2] Fixed {affected} especialidades with markdown prefixes")
    except Exception as e:
        print(f"[FIX2] Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def fix_especialidade_aliases():
    """Fix 3: Create and populate especialidade_alias table."""
    conn = sqlite3.connect(PROGRESSAO_DB)
    cursor = conn.cursor()

    # Predefined mappings
    predefined = {
        "Aquarismo": "Aquariofilia",
        "Aeronáutica": "Engenharia Aeronáutica",
        "Arquitetura e Urbanismo": "Arquitetura",
        "Animais Venenosos e Peçonhentos": "Animais Peçonhentos",
    }

    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS especialidade_alias (
                nome_manual TEXT PRIMARY KEY,
                nome_canonico TEXT NOT NULL
            )
        """)

        # Get canonical names from especialidades_guia
        canon_conn = sqlite3.connect(ESPECIALIDADES_DB)
        canon_cursor = canon_conn.cursor()
        canon_cursor.execute("SELECT DISTINCT nome FROM especialidades ORDER BY nome")
        canonical_names = [row[0] for row in canon_cursor.fetchall()]
        canon_conn.close()

        # Get orphan names from progressao_2025
        cursor.execute("""
            SELECT DISTINCT especialidade_nome FROM bloco_especialidades
            ORDER BY especialidade_nome
        """)
        orphan_names = [row[0] for row in cursor.fetchall()]

        # Find missing (orphan) names
        orphan_set = set()
        for orphan in orphan_names:
            norm_orphan = normalize_string(orphan)
            found = False
            for canon in canonical_names:
                if normalize_string(canon) == norm_orphan:
                    found = True
                    break
            if not found:
                orphan_set.add(orphan)

        print(f"[FIX3] Found {len(orphan_set)} orphan especialidades")

        # Match predefined + fuzzy match
        aliases_to_insert = []
        fuzzy_matched = 0
        unresolved = 0

        for orphan in orphan_set:
            if orphan in predefined:
                aliases_to_insert.append((orphan, predefined[orphan]))
            else:
                # Fuzzy match
                best_match = None
                best_ratio = 0
                for canon in canonical_names:
                    ratio = difflib.SequenceMatcher(None, orphan.lower(), canon.lower()).ratio()
                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_match = canon

                if best_ratio >= 0.7 and best_match:
                    aliases_to_insert.append((orphan, best_match))
                    fuzzy_matched += 1
                else:
                    unresolved += 1
                    print(f"  - Unresolved: '{orphan}'")

        # Insert aliases
        cursor.executemany(
            "INSERT OR IGNORE INTO especialidade_alias (nome_manual, nome_canonico) VALUES (?, ?)",
            aliases_to_insert
        )
        conn.commit()

        print(f"[FIX3] Inserted {len(aliases_to_insert)} aliases")
        print(f"[FIX3] Fuzzy matched: {fuzzy_matched}, Unresolved: {unresolved}")
    except Exception as e:
        print(f"[FIX3] Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting data inconsistency fixes...")
    fix_insignia_migration()
    fix_especialidades_names()
    fix_especialidade_aliases()
    print("Fixes completed.")
