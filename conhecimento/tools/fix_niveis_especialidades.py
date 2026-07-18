#!/usr/bin/env python
"""
Corrige inconsistências de nivel3_itens em especialidades.

Critério: Se o COUNT real de requisitos diferir de nivel3_itens, corrige
automaticamente para o COUNT real (todos os casos detectados justificam isso).

Idempotente: pode rodar múltiplas vezes sem duplicar mudanças.
"""

import sqlite3
import sys
from pathlib import Path


def main():
    db_path = Path("conhecimento/bd/especialidades_guia.sqlite")
    if not db_path.exists():
        print(f"ERRO: Banco não encontrado em {db_path.absolute()}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Especialidades identificadas com erro
    erros = [
        (1, "Aeromodelismo", "Ciência e Tecnologia"),
        (16, "Eletrônica", "Ciência e Tecnologia"),
        (69, "Gênero Musical", "Cultura"),
        (129, "Mergulho", "Desportos"),
        (143, "Slackline", "Desportos"),
        (164, "Biblioteconomia", "Serviços"),
        (188, "Entrega de Mensagens", "Serviços"),
        (193, "Garçom", "Serviços"),
        (199, "Jardinagem", "Serviços"),
        (203, "Lides Campeiras", "Serviços"),
        (235, "Radioescuta", "Serviços"),
        (238, "Reparos Domésticos", "Serviços"),
        (250, "Sinalização", "Serviços"),
        (272, "Pioneiria", "Habilidades Escoteiras"),
    ]

    fixes_applied = []

    print("=" * 80)
    print("CORRIGINDO INCONSISTÊNCIAS DE NIVEIS")
    print("=" * 80)

    for spec_id, nome, ramo in erros:
        # Contar requisitos reais
        cursor.execute(
            "SELECT COUNT(*) FROM requisitos WHERE especialidade_id = ?",
            (spec_id,)
        )
        count_real = cursor.fetchone()[0]

        # Buscar estado atual
        cursor.execute(
            "SELECT nivel1_itens, nivel2_itens, nivel3_itens, total_itens "
            "FROM especialidades WHERE id = ?",
            (spec_id,)
        )
        n1, n2, n3, total = cursor.fetchone()

        # Decidir ação
        if count_real != n3:
            # Corrigir nivel3_itens para COUNT real
            cursor.execute(
                "UPDATE especialidades SET nivel3_itens = ? WHERE id = ?",
                (count_real, spec_id)
            )
            fixes_applied.append({
                'id': spec_id,
                'nome': nome,
                'ramo': ramo,
                'antes': n3,
                'depois': count_real,
                'count_real': count_real
            })
            print(f"\n[OK] {nome} ({ramo})")
            print(f"  ID {spec_id}: nivel3_itens {n3} -> {count_real}")

    conn.commit()

    # Relatório final
    print("\n" + "=" * 80)
    print(f"RESUMO: {len(fixes_applied)} correções aplicadas")
    print("=" * 80)

    for fix in fixes_applied:
        print(f"\n{fix['nome']} ({fix['ramo']})")
        print(f"  nivel3_itens: {fix['antes']} -> {fix['depois']}")

    # Verificar inconsistências entre nivel2 cumulativo e esperado
    print("\n" + "=" * 80)
    print("VERIFICAÇÃO DE INCONSISTÊNCIAS NIVEL2 (reportadas, não corrigidas)")
    print("=" * 80)

    issues_n2 = []
    for spec_id, nome, ramo in erros:
        cursor.execute(
            "SELECT nivel1_itens, nivel2_itens, nivel3_itens "
            "FROM especialidades WHERE id = ?",
            (spec_id,)
        )
        n1, n2, n3 = cursor.fetchone()

        # Verificar coerência: N2 deve ser exatamente 2*N1
        if n1 > 0 and n2 != 2 * n1:
            issues_n2.append({
                'id': spec_id,
                'nome': nome,
                'ramo': ramo,
                'n1': n1,
                'n2': n2,
                'n2_esperado': 2 * n1
            })
            print(f"\n[WARN] {nome} ({ramo})")
            print(f"  ID {spec_id}: nivel2_itens={n2}, esperado=2*{n1}={2*n1}")

    if not issues_n2:
        print("\n[OK] Nenhuma inconsistência N2 detectada após correção.")

    conn.close()

    print("\n" + "=" * 80)
    return 0


if __name__ == "__main__":
    sys.exit(main())
