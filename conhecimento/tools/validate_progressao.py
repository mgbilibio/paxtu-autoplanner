#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validador de integridade do banco progressao_2025.sqlite e especialidades_guia.sqlite.
Executa 15 validações (1-11 originais + 12-14 semânticas + 15 cruzamento camada JSON)
com relatório estruturado em markdown.
"""

import json
import sqlite3
import unicodedata
import re
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict, Any


class ValidadorProgressao:
    """Validador de integridade dos bancos de progressão e especialidades."""

    def __init__(self, progressao_db: Path, especialidades_db: Path, docs_output: Path):
        """Inicializa o validador com caminhos dos bancos e saída."""
        self.progressao_db = progressao_db
        self.especialidades_db = especialidades_db
        self.docs_output = docs_output
        self.relatorio = []
        self.erros_totais = 0
        self.avisos_totais = 0
        self.erros_por_validacao = {}
        self.avisos_por_validacao = {}

    @staticmethod
    def normalize(s: str) -> str:
        """Normaliza string: lowercase + remove acentos + strip."""
        s = s.strip().lower()
        s = unicodedata.normalize('NFD', s)
        s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
        return s

    def conectar_progressao(self):
        """Retorna conexão com banco progressao_2025.sqlite."""
        return sqlite3.connect(str(self.progressao_db))

    def conectar_especialidades(self):
        """Retorna conexão com banco especialidades_guia.sqlite."""
        return sqlite3.connect(str(self.especialidades_db))

    def validacao_1_bloco_sem_acoes(self) -> Tuple[List[str], str]:
        """
        Validação 1: Bloco sem nenhuma ação fixa NEM variável para um dado ramo.
        Retorna lista de problemas e tipo (erro/aviso).
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT DISTINCT brm.bloco_id, brm.ramo_id, b.nome as bloco_nome, r.nome as ramo_nome
        FROM bloco_ramo_meta brm
        JOIN blocos b ON brm.bloco_id = b.id
        JOIN ramos r ON brm.ramo_id = r.id
        WHERE brm.bloco_id NOT IN (
            SELECT DISTINCT bloco_id FROM acoes_fixas
            WHERE ramo_id = brm.ramo_id AND bloco_id = brm.bloco_id
        )
        AND brm.bloco_id NOT IN (
            SELECT DISTINCT bloco_id FROM acoes_variaveis
            WHERE ramo_id = brm.ramo_id AND bloco_id = brm.bloco_id
        )
        ORDER BY brm.bloco_id, brm.ramo_id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [f"Bloco '{r[2]}' (ID {r[0]}) no ramo '{r[3]}' (ID {r[1]})" for r in resultados]
        return problemas, "erro"

    def validacao_2_variaveis_minimo_excedido(self) -> Tuple[List[str], str]:
        """
        Validação 2: Bloco com variaveis_minimo > COUNT(acoes_variaveis) para o ramo.
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT brm.bloco_id, brm.ramo_id, b.nome as bloco_nome, r.nome as ramo_nome,
               brm.variaveis_minimo, COUNT(av.id) as total_variaveis
        FROM bloco_ramo_meta brm
        JOIN blocos b ON brm.bloco_id = b.id
        JOIN ramos r ON brm.ramo_id = r.id
        LEFT JOIN acoes_variaveis av ON av.bloco_id = brm.bloco_id AND av.ramo_id = brm.ramo_id
        GROUP BY brm.bloco_id, brm.ramo_id
        HAVING brm.variaveis_minimo > COUNT(av.id)
        ORDER BY brm.bloco_id, brm.ramo_id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Bloco '{r[2]}' (ID {r[0]}) no ramo '{r[3]}' (ID {r[1]}): minimo={r[4]}, total={r[5]}"
            for r in resultados
        ]
        return problemas, "erro"

    def validacao_3_intencionalidade_vazia(self) -> Tuple[List[str], str]:
        """
        Validação 3: bloco_ramo_meta sem intencionalidade_educativa (string vazia ou NULL).
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT brm.id, brm.bloco_id, brm.ramo_id, b.nome as bloco_nome, r.nome as ramo_nome
        FROM bloco_ramo_meta brm
        JOIN blocos b ON brm.bloco_id = b.id
        JOIN ramos r ON brm.ramo_id = r.id
        WHERE intencionalidade_educativa IS NULL OR TRIM(intencionalidade_educativa) = ''
        ORDER BY brm.bloco_id, brm.ramo_id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Meta ID {r[0]}: Bloco '{r[3]}' (ID {r[1]}) no ramo '{r[4]}' (ID {r[2]})"
            for r in resultados
        ]
        return problemas, "aviso"

    def validacao_4_fonte_pagina_vazia(self) -> Tuple[List[str], str]:
        """
        Validação 4: bloco_ramo_meta sem fonte_pagina (NULL ou vazia).
        Reclassificado como AVISO.
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT brm.id, brm.bloco_id, brm.ramo_id, b.nome as bloco_nome, r.nome as ramo_nome
        FROM bloco_ramo_meta brm
        JOIN blocos b ON brm.bloco_id = b.id
        JOIN ramos r ON brm.ramo_id = r.id
        WHERE fonte_pagina IS NULL OR TRIM(fonte_pagina) = ''
        ORDER BY brm.bloco_id, brm.ramo_id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Meta ID {r[0]}: Bloco '{r[3]}' (ID {r[1]}) no ramo '{r[4]}' (ID {r[2]})"
            for r in resultados
        ]
        return problemas, "aviso"

    def validacao_5_reconhecimento_sem_requisitos(self) -> Tuple[List[str], str]:
        """
        Validação 5: Reconhecimento sem requisitos.
        Reclassificado como ERRO.
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT rr.id, rr.nome, rr.slug, r.nome as ramo_nome
        FROM reconhecimentos_ramo rr
        JOIN ramos r ON rr.ramo_id = r.id
        WHERE rr.id NOT IN (SELECT DISTINCT reconhecimento_id FROM reconhecimento_requisitos)
        ORDER BY rr.ramo_id, rr.id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Reconhecimento '{r[1]}' (ID {r[0]}, slug '{r[2]}') no ramo '{r[3]}'"
            for r in resultados
        ]
        return problemas, "erro"

    def validacao_6_especialidade_inexistente(self) -> Tuple[List[str], str]:
        """
        Validação 6: Especialidade citada em bloco_especialidades.especialidade_nome
        que não existe em especialidades_guia.especialidades.nome.
        Usa normalização (lowercase + remove acentos + strip).
        Consulta especialidade_alias para permitir mapeamentos manuais.
        Reclassificado como AVISO quando há mismatch por normalização.
        """
        conn_prog = self.conectar_progressao()
        conn_esp = self.conectar_especialidades()

        cursor_prog = conn_prog.cursor()
        cursor_esp = conn_esp.cursor()

        cursor_esp.execute("""
            SELECT nome FROM especialidades
        """)
        nomes_validos = {self.normalize(row[0]): row[0] for row in cursor_esp.fetchall()}

        # Obter aliases
        cursor_prog.execute("""
            SELECT nome_manual, nome_canonico FROM especialidade_alias
        """)
        aliases = {row[0]: row[1] for row in cursor_prog.fetchall()}

        query = """
        SELECT DISTINCT be.id, be.bloco_id, be.ramo_id, be.especialidade_nome,
                        b.nome as bloco_nome, r.nome as ramo_nome
        FROM bloco_especialidades be
        JOIN blocos b ON be.bloco_id = b.id
        JOIN ramos r ON be.ramo_id = r.id
        ORDER BY be.bloco_id, be.ramo_id
        """
        cursor_prog.execute(query)
        resultados = cursor_prog.fetchall()

        problemas = []
        for r in resultados:
            # Se tem alias, usar o nome canonico para validacao
            nome_para_validar = aliases.get(r[3], r[3])
            nome_norm = self.normalize(nome_para_validar)
            if nome_norm not in nomes_validos:
                problemas.append(
                    f"ID {r[0]}: '{r[3]}' no bloco '{r[4]}' (ID {r[1]}) "
                    f"ramo '{r[5]}' (ID {r[2]})"
                )

        conn_prog.close()
        conn_esp.close()

        return problemas, "aviso"

    def validacao_7_bloco_sem_entry_ramo(self) -> Tuple[List[str], str]:
        """
        Validação 7: Bloco sem entry em bloco_ramo_meta para algum dos 2 ramos
        (deveria ter para ambos, assumindo 2 ramos principais).
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM ramos")
        total_ramos = cursor.fetchone()[0]

        cursor.execute("""
            SELECT DISTINCT bloco_id, COUNT(DISTINCT ramo_id) as ramo_count
            FROM bloco_ramo_meta
            GROUP BY bloco_id
            HAVING ramo_count < ?
        """, (total_ramos,))
        resultados = cursor.fetchall()

        problemas = []
        for r in resultados:
            cursor.execute("SELECT nome FROM blocos WHERE id = ?", (r[0],))
            bloco_nome = cursor.fetchone()[0]
            problemas.append(f"Bloco '{bloco_nome}' (ID {r[0]}): em {r[1]}/{total_ramos} ramos")

        conn.close()

        return problemas, "erro"

    def validacao_8_blocos_cumulativos_incoerente(self) -> Tuple[List[str], str]:
        """
        Validação 8: Etapa cuja blocos_cumulativos não bate com a soma de blocos_nesta_etapa
        das etapas até ela (por ramo).
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT ramo_id FROM etapas
        """)
        ramos = [r[0] for r in cursor.fetchall()]

        problemas = []

        for ramo_id in ramos:
            cursor.execute("""
                SELECT id, nome, ordem, blocos_cumulativos, blocos_nesta_etapa
                FROM etapas
                WHERE ramo_id = ?
                ORDER BY ordem
            """, (ramo_id,))
            etapas = cursor.fetchall()

            soma_acumulada = 0
            for etapa in etapas:
                soma_acumulada += etapa[4]
                if soma_acumulada != etapa[3]:
                    cursor.execute("SELECT nome FROM ramos WHERE id = ?", (ramo_id,))
                    ramo_nome = cursor.fetchone()[0]
                    problemas.append(
                        f"Ramo '{ramo_nome}' (ID {ramo_id}), Etapa '{etapa[1]}' (ID {etapa[0]}, "
                        f"ordem {etapa[2]}): blocos_cumulativos={etapa[3]}, soma_calculada={soma_acumulada}"
                    )

        conn.close()
        return problemas, "erro"

    def validacao_6b_markdown_prefix(self) -> Tuple[List[str], str]:
        """
        Validação 6b: Especialidades no guia com prefixo markdown indevido (## , # ).
        Sub-validação de 6. Reclassificado como AVISO.
        """
        conn = self.conectar_especialidades()
        cursor = conn.cursor()

        query = """
        SELECT e.id, e.nome, r.nome as ramo_nome
        FROM especialidades e
        JOIN ramos r ON e.ramo_id = r.id
        WHERE e.nome LIKE '## %' OR e.nome LIKE '# %'
        ORDER BY e.ramo_id, e.id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Especialidade '{r[1]}' (ID {r[0]}) no ramo '{r[2]}' — prefixo markdown indevido"
            for r in resultados
        ]
        return problemas, "aviso"

    def validacao_9_especialidade_sem_requisitos(self) -> Tuple[List[str], str]:
        """
        Validação 9: Especialidade no guia sem requisitos.
        """
        conn = self.conectar_especialidades()
        cursor = conn.cursor()

        query = """
        SELECT e.id, e.nome, r.nome as ramo_nome
        FROM especialidades e
        JOIN ramos r ON e.ramo_id = r.id
        WHERE e.id NOT IN (SELECT DISTINCT especialidade_id FROM requisitos)
        ORDER BY e.ramo_id, e.id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Especialidade '{r[1]}' (ID {r[0]}) no ramo '{r[2]}'"
            for r in resultados
        ]
        return problemas, "aviso"

    def validacao_10_cumulativos_incoerentes(self) -> Tuple[List[str], str]:
        """
        Validação 10: Especialidade com nivel3_itens (threshold cumulativo final)
        diferente de total_itens (total real de requisitos).
        Nota: nivel1/nivel2/nivel3 são cumulativos, não exclusivos. Só nivel3 deve
        bater com total.
        Reclassificado como ERRO.
        """
        conn = self.conectar_especialidades()
        cursor = conn.cursor()

        query = """
        SELECT e.id, e.nome, r.nome as ramo_nome,
               e.nivel3_itens, e.total_itens
        FROM especialidades e
        JOIN ramos r ON e.ramo_id = r.id
        WHERE e.nivel3_itens > 0 AND e.nivel3_itens != e.total_itens
        ORDER BY e.ramo_id, e.id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"Especialidade '{r[1]}' (ID {r[0]}) no ramo '{r[2]}':"
            f" nivel3_itens={r[3]} != total_itens={r[4]}"
            for r in resultados
        ]
        return problemas, "erro"

    def validacao_11_insignias_em_bloco_especialidades(self) -> Tuple[List[str], str]:
        """
        Validação 11: Insígnias citadas em bloco_especialidades (campo especialidade_nome
        começa com 'Insígnia ' ou 'Insignia ').
        Devem estar em bloco_insignias, não em bloco_especialidades.
        Reclassificado como ERRO.
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        query = """
        SELECT DISTINCT be.id, be.bloco_id, be.ramo_id, be.especialidade_nome,
                        b.nome as bloco_nome, r.nome as ramo_nome
        FROM bloco_especialidades be
        JOIN blocos b ON be.bloco_id = b.id
        JOIN ramos r ON be.ramo_id = r.id
        WHERE be.especialidade_nome LIKE 'Insígnia %' OR be.especialidade_nome LIKE 'Insignia %'
        ORDER BY be.bloco_id, be.ramo_id
        """
        cursor.execute(query)
        resultados = cursor.fetchall()
        conn.close()

        problemas = [
            f"ID {r[0]}: '{r[3]}' no bloco '{r[4]}' (ID {r[1]}) ramo '{r[5]}' (ID {r[2]}) "
            f"— deve estar em bloco_insignias, não em bloco_especialidades"
            for r in resultados
        ]
        return problemas, "erro"

    def validacao_12_ocr_artifacts(self) -> List[str]:
        """
        Validação 12: Detectar artefatos OCR em descrições (V12 — AVISO).
        Procura por:
        - Sequência literal \\u00 (3+ chars sugere encoding não processado)
        - Mais de 3 símbolos consecutivos [()\\[\\].;]{4,}
        - Strings com ? no meio de palavra (regex \\w\\?\\w)
        Retorna lista de "tabela.coluna.id: snippet[0:60]"
        """
        conn_prog = self.conectar_progressao()
        conn_esp = self.conectar_especialidades()

        problemas = []

        cursor_prog = conn_prog.cursor()
        cursor_esp = conn_esp.cursor()

        # Regex para detectar artefatos
        regex_unicode_escape = re.compile(r'\\u00')
        regex_simbolos_multiplos = re.compile(r'[\(\)\[\]\.\,\;]{4,}')
        regex_interrogacao_palavra = re.compile(r'\w\?\w')

        def tem_artefato_ocr(texto):
            if not texto:
                return False
            return bool(regex_unicode_escape.search(texto) or
                       regex_simbolos_multiplos.search(texto) or
                       regex_interrogacao_palavra.search(texto))

        def extrair_snippet(texto, max_len=60):
            if not texto:
                return ""
            return texto[:max_len] + ("..." if len(texto) > max_len else "")

        # Verificar acoes_fixas.descricao
        cursor_prog.execute("SELECT id, descricao FROM acoes_fixas")
        for row in cursor_prog.fetchall():
            if tem_artefato_ocr(row[1]):
                snippet = extrair_snippet(row[1])
                problemas.append(f"acoes_fixas.id {row[0]}: {snippet}")

        # Verificar acoes_variaveis.descricao
        cursor_prog.execute("SELECT id, descricao FROM acoes_variaveis")
        for row in cursor_prog.fetchall():
            if tem_artefato_ocr(row[1]):
                snippet = extrair_snippet(row[1])
                problemas.append(f"acoes_variaveis.id {row[0]}: {snippet}")

        # Verificar bloco_ramo_meta.intencionalidade_educativa
        cursor_prog.execute("SELECT id, intencionalidade_educativa FROM bloco_ramo_meta")
        for row in cursor_prog.fetchall():
            if tem_artefato_ocr(row[1]):
                snippet = extrair_snippet(row[1])
                problemas.append(f"bloco_ramo_meta.id {row[0]}: {snippet}")

        # Verificar requisitos.texto (especialidades_guia)
        cursor_esp.execute("SELECT id, texto FROM requisitos")
        for row in cursor_esp.fetchall():
            if tem_artefato_ocr(row[1]):
                snippet = extrair_snippet(row[1])
                problemas.append(f"requisitos.id {row[0]}: {snippet}")

        conn_prog.close()
        conn_esp.close()

        return problemas

    def validacao_13_page_refs(self) -> Tuple[List[str], List[str]]:
        """
        Validação 13: Page refs em range válido (V13 — ERRO e AVISO).
        Para bloco_ramo_meta.fonte_pagina:
        - Vazio: AVISO
        - Não-numérico: ERRO
        - < 1 ou > 400: ERRO
        Retorna (erros, avisos)
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        erros = []
        avisos = []

        query = """
        SELECT id, bloco_id, ramo_id, fonte_pagina
        FROM bloco_ramo_meta
        """
        cursor.execute(query)
        resultados = cursor.fetchall()

        for row in resultados:
            meta_id, bloco_id, ramo_id, fonte_pagina = row

            if fonte_pagina is None or str(fonte_pagina).strip() == "":
                avisos.append(f"Meta ID {meta_id} (bloco {bloco_id}, ramo {ramo_id}): vazio")
            else:
                fonte_str = str(fonte_pagina).strip()
                if not fonte_str.isdigit():
                    erros.append(f"Meta ID {meta_id} (bloco {bloco_id}, ramo {ramo_id}): "
                                f"'{fonte_str}' não é numérico")
                else:
                    valor = int(fonte_str)
                    if valor < 1 or valor > 400:
                        erros.append(f"Meta ID {meta_id} (bloco {bloco_id}, ramo {ramo_id}): "
                                    f"valor {valor} fora do range [1, 400]")

        conn.close()
        return erros, avisos

    def validacao_14_descricao_minima(self) -> List[str]:
        """
        Validação 14: Descrição mínima (V14 — AVISO).
        Ações com length(descricao) < 20 chars são suspeitas de truncamento.
        Retorna lista de "tabela.id: descricao_completa"
        """
        conn = self.conectar_progressao()
        cursor = conn.cursor()

        problemas = []

        # Verificar acoes_fixas
        cursor.execute("SELECT id, descricao FROM acoes_fixas WHERE LENGTH(COALESCE(descricao, '')) < 20")
        for row in cursor.fetchall():
            problemas.append(f"acoes_fixas.id {row[0]}: '{row[1]}'")

        # Verificar acoes_variaveis
        cursor.execute("SELECT id, descricao FROM acoes_variaveis WHERE LENGTH(COALESCE(descricao, '')) < 20")
        for row in cursor.fetchall():
            problemas.append(f"acoes_variaveis.id {row[0]}: '{row[1]}'")

        conn.close()
        return problemas

    def formatar_secao_validacao(self, numero: int, titulo: str, problemas: List[str],
                                  tipo: str) -> Tuple[str, int]:
        """Formata uma seção de validação em markdown."""
        secao = f"\n## Validacao {numero}: {titulo}\n\n"

        if not problemas:
            secao += "[OK]\n"
            return secao, 0

        qtd = len(problemas)
        tipo_label = "ERRO" if tipo == "erro" else "AVISO"
        secao += f"**{tipo_label}** — {qtd} ocorrência(s):\n\n"

        for problema in problemas[:20]:
            secao += f"- {problema}\n"

        if len(problemas) > 20:
            secao += f"\n... e mais {len(problemas) - 20} ocorrência(s)\n"

        return secao, qtd

    def validacao_15_camada_json(self) -> Tuple[List[str], str]:
        """
        Validação 15 (M18): confere se o catálogo POR 2025+ usa o Guia oficial.

        A coleção specs_*.json permanece como compatibilidade do POR 2020. O
        planejador atual deve consumir officialSpecialtyCatalog, derivado do
        mesmo JSON gerado a partir de especialidades_guia.sqlite.
        """
        problemas: List[str] = []
        data_dir = self.progressao_db.parents[2] / "src" / "data"
        catalog_index = data_dir / "catalog" / "index.ts"
        adapter = data_dir / "officialSpecialtyCatalog.ts"
        generated = data_dir / "generated" / "especialidades_guia.json"
        conn = self.conectar_especialidades()
        total_guia = conn.execute("SELECT COUNT(*) FROM especialidades").fetchone()[0]
        conn.close()
        if not all(path.exists() for path in [catalog_index, adapter, generated]):
            problemas.append(
                "Arquivos do adaptador oficial não encontrados para validar o catálogo POR 2025+."
            )
            return problemas, "aviso"

        index_text = catalog_index.read_text(encoding="utf-8")
        if "getOfficialSpecialtyCatalog" not in index_text:
            problemas.append("catalog/index.ts não referencia getOfficialSpecialtyCatalog no POR 2025+.")

        dados = json.loads(generated.read_text(encoding="utf-8"))
        total_gerado = len(dados.get("especialidades", []))
        if total_gerado != total_guia:
            problemas.append(
                f"Guia SQLite tem {total_guia} especialidades, mas o JSON gerado tem {total_gerado}."
            )
        return problemas, "aviso"

    def executar_validacoes(self):
        """Executa as validações 1-15 (incluindo 6b, 12, 13, 14 e 15 como extensões)."""
        validacoes = [
            (1, "Bloco sem nenhuma ação fixa nem variável", self.validacao_1_bloco_sem_acoes),
            (2, "variáveis_mínimo > total de ações variáveis", self.validacao_2_variaveis_minimo_excedido),
            (3, "Intencionalidade educativa vazia", self.validacao_3_intencionalidade_vazia),
            (4, "Fonte/página vazia em meta", self.validacao_4_fonte_pagina_vazia),
            (5, "Reconhecimento sem requisitos", self.validacao_5_reconhecimento_sem_requisitos),
            (6, "Especialidade inexistente no guia", self.validacao_6_especialidade_inexistente),
            (6.5, "Especialidades com prefixo markdown indevido", self.validacao_6b_markdown_prefix),
            (7, "Bloco sem entry em algum ramo", self.validacao_7_bloco_sem_entry_ramo),
            (8, "blocos_cumulativos incoerente", self.validacao_8_blocos_cumulativos_incoerente),
            (9, "Especialidade sem requisitos", self.validacao_9_especialidade_sem_requisitos),
            (10, "Cumulativos de níveis incoerentes", self.validacao_10_cumulativos_incoerentes),
            (11, "Insígnias em bloco_especialidades (deve ser bloco_insignias)", self.validacao_11_insignias_em_bloco_especialidades),
            (15, "Divergência camada JSON (planejador) x guia (M18)", self.validacao_15_camada_json),
        ]

        for num, titulo, funcao_validacao in validacoes:
            problemas, tipo = funcao_validacao()
            secao, qtd = self.formatar_secao_validacao(num, titulo, problemas, tipo)
            self.relatorio.append(secao)

            chave = num
            if tipo == "erro":
                self.erros_totais += qtd
                self.erros_por_validacao[chave] = qtd
            else:
                self.avisos_totais += qtd
                self.avisos_por_validacao[chave] = qtd

        # V12 — OCR Artifacts (AVISO)
        problemas_v12 = self.validacao_12_ocr_artifacts()
        secao_v12, qtd_v12 = self.formatar_secao_validacao(12, "OCR artifacts em descrições", problemas_v12, "aviso")
        self.relatorio.append(secao_v12)
        if qtd_v12 > 0:
            self.avisos_totais += qtd_v12
            self.avisos_por_validacao[12] = qtd_v12

        # V13 — Page refs em range válido (ERRO + AVISO)
        erros_v13, avisos_v13 = self.validacao_13_page_refs()
        if erros_v13 or avisos_v13:
            if erros_v13:
                secao_v13_err, qtd_v13_err = self.formatar_secao_validacao(13, "Page refs fora do range [1, 400]", erros_v13, "erro")
                self.relatorio.append(secao_v13_err)
                self.erros_totais += qtd_v13_err
                self.erros_por_validacao[13] = self.erros_por_validacao.get(13, 0) + qtd_v13_err
            if avisos_v13:
                secao_v13_avi, qtd_v13_avi = self.formatar_secao_validacao("13-A", "Page refs vazios", avisos_v13, "aviso")
                self.relatorio.append(secao_v13_avi)
                self.avisos_totais += qtd_v13_avi
                self.avisos_por_validacao["13-A"] = qtd_v13_avi
        else:
            secao_v13, qtd_v13 = self.formatar_secao_validacao(13, "Page refs em range [1, 400]", [], "info")
            self.relatorio.append(secao_v13)

        # V14 — Descrição mínima (AVISO)
        problemas_v14 = self.validacao_14_descricao_minima()
        secao_v14, qtd_v14 = self.formatar_secao_validacao(14, "Descrição mínima (< 20 chars)", problemas_v14, "aviso")
        self.relatorio.append(secao_v14)
        if qtd_v14 > 0:
            self.avisos_totais += qtd_v14
            self.avisos_por_validacao[14] = qtd_v14

    def gerar_relatorio(self):
        """Gera relatório final em markdown."""
        timestamp = datetime.now().isoformat()

        conteudo = f"""# Validação de Integridade: progressao_2025.sqlite

**Data/Hora:** {timestamp}

**Resumo Executivo:**
- Erros encontrados: {self.erros_totais}
- Avisos encontrados: {self.avisos_totais}

---

"""

        conteudo += "".join(self.relatorio)

        erros_por_val = "\n".join([
            f"| {k} | {v} |" for k, v in sorted(self.erros_por_validacao.items())
        ]) if self.erros_por_validacao else "| (nenhum) | 0 |"

        avisos_por_val = "\n".join([
            f"| {k} | {v} |" for k, v in sorted(self.avisos_por_validacao.items())
        ]) if self.avisos_por_validacao else "| (nenhum) | 0 |"

        conteudo += f"""

---

## Sumário Final

### Totais
| Tipo | Quantidade |
|------|------------|
| Erros | {self.erros_totais} |
| Avisos | {self.avisos_totais} |
| **Total** | **{self.erros_totais + self.avisos_totais}** |

### Erros por Validação
| Validação | Quantidade |
|-----------|------------|
{erros_por_val}

### Avisos por Validação
| Validação | Quantidade |
|-----------|------------|
{avisos_por_val}

"""

        return conteudo

    def escrever_relatorio(self, conteudo: str):
        """Escreve o relatório em arquivo markdown."""
        self.docs_output.parent.mkdir(parents=True, exist_ok=True)
        self.docs_output.write_text(conteudo, encoding="utf-8")

    def imprimir_resumo(self, conteudo: str):
        """Imprime resumo no stdout."""
        try:
            print(conteudo)
        except UnicodeEncodeError:
            print(conteudo.encode('utf-8', errors='replace').decode('utf-8'))


def main():
    """Ponto de entrada principal."""
    base_dir = Path(__file__).parent.parent.parent
    progressao_db = base_dir / "conhecimento" / "bd" / "progressao_2025.sqlite"
    especialidades_db = base_dir / "conhecimento" / "bd" / "especialidades_guia.sqlite"
    docs_output = base_dir / "conhecimento" / "docs" / "validacao_progressao_2025.md"

    if not progressao_db.exists():
        print(f"ERRO: Banco progressao_2025.sqlite não encontrado em {progressao_db}")
        return

    if not especialidades_db.exists():
        print(f"ERRO: Banco especialidades_guia.sqlite não encontrado em {especialidades_db}")
        return

    validador = ValidadorProgressao(progressao_db, especialidades_db, docs_output)

    print("Executando validações...")
    validador.executar_validacoes()

    relatorio = validador.gerar_relatorio()

    validador.escrever_relatorio(relatorio)
    print(f"\nRelatório gravado em: {docs_output}\n")

    validador.imprimir_resumo(relatorio)


if __name__ == "__main__":
    main()
