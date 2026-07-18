import sqlite3
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime
from pathlib import Path

DB_PROGRESSAO = Path("conhecimento/bd/progressao_2025.sqlite")
DB_ESPECIALIDADES = Path("conhecimento/bd/especialidades_guia.sqlite")
OUTPUT_PATH = Path("conhecimento/docs/revisao_aliases.md")

def normalize_text(text):
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text.lower().strip())
    return "".join([c for c in nfkd if not unicodedata.combining(c)])

def similarity_ratio(s1, s2):
    n1 = normalize_text(s1)
    n2 = normalize_text(s2)
    return SequenceMatcher(None, n1, n2).ratio()

def load_aliases():
    conn = sqlite3.connect(DB_PROGRESSAO)
    cursor = conn.cursor()
    cursor.execute("SELECT nome_manual, nome_canonico FROM especialidade_alias ORDER BY nome_manual;")
    aliases = cursor.fetchall()
    conn.close()
    return aliases

def load_especialidades():
    conn = sqlite3.connect(DB_ESPECIALIDADES)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome, slug, ramo_id FROM especialidades;")
    espec = {row[1]: {"id": row[0], "slug": row[2], "ramo_id": row[3]} for row in cursor.fetchall()}
    conn.close()
    return espec

def load_blocos_por_alias(nome_manual):
    conn = sqlite3.connect(DB_PROGRESSAO)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT b.id, b.nome, be.ramo_id FROM bloco_especialidades be JOIN blocos b ON be.bloco_id = b.id WHERE be.especialidade_nome = ? ORDER BY b.id;",
        (nome_manual,)
    )
    blocos = cursor.fetchall()
    conn.close()
    return blocos

def load_ramo_name(ramo_id):
    conn = sqlite3.connect(DB_PROGRESSAO)
    cursor = conn.cursor()
    cursor.execute("SELECT nome FROM ramos WHERE id = ?;", (ramo_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else f"Ramo {ramo_id}"

def load_requisitos(especialidade_slug, limit=5):
    conn = sqlite3.connect(DB_ESPECIALIDADES)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT r.texto FROM requisitos r JOIN especialidades e ON r.especialidade_id = e.id WHERE e.slug = ? LIMIT ?;",
        (especialidade_slug, limit)
    )
    reqs = [row[0][:80] for row in cursor.fetchall()]
    conn.close()
    return reqs

def classify_similarity(ratio):
    if ratio >= 0.80:
        return "forte"
    elif 0.60 <= ratio < 0.80:
        return "moderada"
    else:
        return "fraca"

def main():
    aliases = load_aliases()
    especialidades = load_especialidades()

    # Calcula similaridade para cada alias
    alias_scores = []
    for nome_manual, nome_canonico in aliases:
        ratio = similarity_ratio(nome_manual, nome_canonico)
        alias_scores.append({
            "nome_manual": nome_manual,
            "nome_canonico": nome_canonico,
            "ratio": ratio,
            "classe": classify_similarity(ratio)
        })

    # Ordena por similaridade (suspeitos primeiro)
    alias_scores.sort(key=lambda x: x["ratio"])

    # Contar por classe
    forte = sum(1 for a in alias_scores if a["classe"] == "forte")
    moderada = sum(1 for a in alias_scores if a["classe"] == "moderada")
    fraca = sum(1 for a in alias_scores if a["classe"] == "fraca")

    # Gera markdown
    output = []
    output.append("# Revisao de Aliases Manual×Guia\n")
    output.append(f"Gerado em: {datetime.now().isoformat()}\n")
    output.append(f"Total: {len(aliases)} aliases para revisar.\n\n")
    output.append("**Como usar**:\n")
    output.append("- Marque `[x]` os aliases que considera CORRETOS.\n")
    output.append("- Mantenha `[ ]` nos que precisam ser corrigidos ou removidos.\n")
    output.append("- Marque como `[~]` os 'aceitaveis com ressalva'.\n")
    output.append("- Apos revisao, rode `tools/apply_alias_corrections.py` para aplicar.\n\n")
    output.append("**Legenda de similaridade**:\n")
    output.append("- ≥ 0.80: forte (provavelmente OK)\n")
    output.append("- 0.60–0.79: moderada (revisar)\n")
    output.append("- < 0.60: fraca ⚠️ (suspeita)\n\n")
    output.append("---\n\n")

    # Cada alias
    for item in alias_scores:
        nome_manual = item["nome_manual"]
        nome_canonico = item["nome_canonico"]
        ratio = item["ratio"]
        classe = item["classe"]

        # Símbolo de alerta
        emoji = " ⚠️ BAIXA" if classe == "fraca" else ""
        if classe == "moderada":
            emoji = ""

        output.append(f"### [ ] Alias: \"{nome_manual}\" → \"{nome_canonico}\"\n\n")

        # Blocos onde aparece
        blocos = load_blocos_por_alias(nome_manual)
        if blocos:
            output.append("- **Aparece em blocos** (Manual):\n")
            for bloco_id, bloco_nome, ramo_id in blocos:
                ramo_nome = load_ramo_name(ramo_id)
                output.append(f"  - Bloco {bloco_id} ({bloco_nome}), {ramo_nome}\n")
        else:
            output.append("- **Aparece em blocos**: (nenhum encontrado)\n")

        # Especialidade canonica
        if nome_canonico in especialidades:
            espec = especialidades[nome_canonico]
            output.append(f"- **Especialidade canonica no Guia**: {nome_canonico} (ramo {espec['ramo_id']})\n")

            # Requisitos
            reqs = load_requisitos(espec["slug"], limit=5)
            if reqs:
                output.append("  - Requisitos (amostra):\n")
                for i, req in enumerate(reqs, 1):
                    output.append(f"    {i}. {req}...\n")
        else:
            output.append(f"- **Especialidade canonica no Guia**: {nome_canonico} (NAO ENCONTRADA)\n")

        output.append(f"- **Similaridade nome**: {ratio:.2f} ({classe}){emoji}\n")

        if classe == "fraca":
            output.append("- **Acao sugerida**: revisar — nomes muito diferentes podem indicar mapeamento incorreto\n")
        elif classe == "moderada":
            output.append("- **Acao sugerida**: revisar manualmente\n")

        output.append("\n---\n\n")

    # Footer com sumario
    output.append("## Sumario\n\n")
    output.append(f"- **Similares (≥ 0.80)**: {forte}\n")
    output.append(f"- **Moderados (0.60–0.79)**: {moderada}\n")
    output.append(f"- **Suspeitos (< 0.60)**: {fraca}\n")

    # Salva
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("".join(output))

    print(f"[OK] Documento gerado: {OUTPUT_PATH}")
    print(f"  - Tamanho aproximado: {OUTPUT_PATH.stat().st_size / 1024:.1f} KB")
    print(f"  - Distribuicao: {forte} fortes, {moderada} moderados, {fraca} suspeitos")

    # Top 3 suspeitos
    top3 = [a for a in alias_scores if a["classe"] == "fraca"][:3]
    if top3:
        print(f"\n  Top-3 suspeitos:")
        for i, item in enumerate(top3, 1):
            print(f"    {i}. \"{item['nome_manual']}\" -> \"{item['nome_canonico']}\" (sim: {item['ratio']:.2f})")

if __name__ == "__main__":
    main()
