import sqlite3
import json
from datetime import datetime
from pathlib import Path


def conectar_progressao():
    db_path = Path("conhecimento/bd/progressao_2025.sqlite")
    return sqlite3.connect(db_path)


def conectar_especialidades():
    db_path = Path("conhecimento/bd/especialidades_guia.sqlite")
    return sqlite3.connect(db_path)


def extrair_progressao(conn):
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM blocos")
    total_blocos = cursor.fetchone()[0]

    cursor.execute("""
        SELECT eixos.nome, eixos.cor_hex, COUNT(blocos.id) as qtd
        FROM eixos
        LEFT JOIN blocos ON eixos.id = blocos.eixo_id
        GROUP BY eixos.id, eixos.nome, eixos.cor_hex
        ORDER BY eixos.ordem
    """)
    por_eixo = [
        {"eixo": row[0], "blocos": row[2], "corHex": row[1]}
        for row in cursor.fetchall()
    ]

    cursor.execute("SELECT id, nome FROM ramos ORDER BY id")
    ramos_data = {row[0]: row[1] for row in cursor.fetchall()}

    por_ramo = []
    for ramo_id, ramo_nome in ramos_data.items():
        cursor.execute("""
            SELECT nome, blocos_nesta_etapa FROM etapas
            WHERE ramo_id = ?
            ORDER BY ordem
        """, (ramo_id,))
        etapas = [{"nome": row[0], "blocos": row[1]} for row in cursor.fetchall()]

        cursor.execute("""
            SELECT COUNT(*) FROM acoes_fixas WHERE ramo_id = ?
        """, (ramo_id,))
        total_fixas = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) FROM acoes_variaveis WHERE ramo_id = ?
        """, (ramo_id,))
        total_variaveis = cursor.fetchone()[0]

        por_ramo.append({
            "ramo": ramo_nome,
            "etapas": etapas,
            "totalAcoesFixas": total_fixas,
            "totalAcoesVariaveis": total_variaveis
        })

    cursor.execute("""
        SELECT ramo_id, nome, idade_limite_anos, COUNT(*) as qtd_requisitos
        FROM reconhecimentos_ramo
        LEFT JOIN reconhecimento_requisitos ON reconhecimentos_ramo.id = reconhecimento_requisitos.reconhecimento_id
        GROUP BY reconhecimentos_ramo.id, reconhecimentos_ramo.ramo_id, reconhecimentos_ramo.nome, reconhecimentos_ramo.idade_limite_anos
        ORDER BY ramo_id
    """)
    reconhecimentos_rows = cursor.fetchall()

    reconhecimentos = []
    for row in reconhecimentos_rows:
        cursor.execute("SELECT nome FROM ramos WHERE id = ?", (row[0],))
        ramo_name = cursor.fetchone()[0]
        reconhecimentos.append({
            "ramo": ramo_name,
            "nome": row[1],
            "idadeLimite": row[2],
            "qtdRequisitos": row[3]
        })

    return {
        "totalBlocos": total_blocos,
        "porEixo": por_eixo,
        "porRamo": por_ramo,
        "reconhecimentos": reconhecimentos
    }


def extrair_especialidades(conn):
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM especialidades")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM requisitos")
    total_requisitos = cursor.fetchone()[0]

    cursor.execute("""
        SELECT ramos.nome, COUNT(especialidades.id) as qtd
        FROM ramos
        LEFT JOIN especialidades ON ramos.id = especialidades.ramo_id
        GROUP BY ramos.id, ramos.nome
        ORDER BY ramos.id
    """)
    por_ramo = [
        {"ramo": row[0], "qtd": row[1]}
        for row in cursor.fetchall()
    ]

    return {
        "total": total,
        "totalRequisitos": total_requisitos,
        "porRamo": por_ramo
    }


def gerar_json_dashboard():
    conn_prog = conectar_progressao()
    conn_esp = conectar_especialidades()

    progressao = extrair_progressao(conn_prog)
    especialidades = extrair_especialidades(conn_esp)

    dashboard = {
        "geradoEm": datetime.now().isoformat(),
        "progressao": progressao,
        "especialidades": especialidades
    }

    conn_prog.close()
    conn_esp.close()

    return dashboard


def salvar_json(data):
    output_dir = Path("AutoPaxtu042026/docs")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "dashboard_progressao_2025.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return output_file


def main():
    data = gerar_json_dashboard()
    output_file = salvar_json(data)

    total_blocos = data["progressao"]["totalBlocos"]
    total_eixos = len(data["progressao"]["porEixo"])
    total_etapas = len(data["progressao"]["porRamo"][0]["etapas"]) if data["progressao"]["porRamo"] else 0
    total_fixas = sum(r["totalAcoesFixas"] for r in data["progressao"]["porRamo"])
    total_variaveis = sum(r["totalAcoesVariaveis"] for r in data["progressao"]["porRamo"])
    total_reconhecimentos = len(data["progressao"]["reconhecimentos"])
    total_especialidades = data["especialidades"]["total"]
    total_requisitos = data["especialidades"]["totalRequisitos"]

    file_size = output_file.stat().st_size

    print(f"[OK] geradas {total_blocos} entradas (blocos={total_blocos}, eixos={total_eixos}, etapas={total_etapas}, fixas={total_fixas}, variaveis={total_variaveis}, reconhecimentos={total_reconhecimentos}, especialidades={total_especialidades}, requisitos={total_requisitos}, tamanho={file_size}B)")


if __name__ == "__main__":
    main()
