"""Gera o mapa especialidade -> pagina do PDF do Guia de Especialidades 18a Ed.

Fonte de paginas: biblioteca_fts.sqlite (markdown por pagina, com pdf_page).
Estrategia:
  1. Match por titulo: a pagina de conteudo da especialidade tem o nome como
     titulo do bloco (ex.: "Aeromodelismo" -> pagina 45). Pega a menor pagina,
     excluindo paginas de indice (muitos nomes juntos).
  2. Fallback por requisitos: quando o titulo saiu como imagem/OCR corrompido,
     localiza a pagina pelo texto dos proprios requisitos (especialidades_guia.sqlite),
     por votacao de trechos distintivos.

Saida: src/data/generated/especialidade_pages.json  ->  { "<id>": <pagina>, ... }

Pipeline: rodar apos build do biblioteca_fts e do especialidades_guia.
"""
import json
import sqlite3
import unicodedata
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FTS_DB = RAIZ / 'conhecimento' / 'bd' / 'biblioteca_fts.sqlite'
GUIA_DB = RAIZ / 'conhecimento' / 'bd' / 'especialidades_guia.sqlite'
SAIDA = RAIZ / 'src' / 'data' / 'generated' / 'especialidade_pages.json'
GUIA_PDF_LIKE = '%Guia de Especialidades 18%'


# Casos em que a pagina de conteudo cita varias especialidades (caindo na
# heuristica de indice) ou tem o titulo como imagem. Verificados manualmente
# pelo texto dos requisitos. id_especialidade -> pdf_page.
OVERRIDES = {
    49: 145,  # Artes Cenicas: pagina cita varias artes; confirmada por "ator principal"/"teatro musicado".
}


def norm(s):
    s = unicodedata.normalize('NFD', str(s))
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return ' '.join(s.upper().split())


def carregar_paginas():
    """Retorna (titulo_para_pagina, pagina_para_corpo, paginas_indice)."""
    con = sqlite3.connect(FTS_DB)
    rows = con.execute(
        'SELECT pdf_page, title, body FROM markdown_blocks '
        'WHERE pdf_path LIKE ? AND pdf_page IS NOT NULL', (GUIA_PDF_LIKE,)
    ).fetchall()
    con.close()

    pagina_corpo = defaultdict(str)
    titulo_pagina = {}
    for pg, titulo, corpo in rows:
        pagina_corpo[pg] += ' ' + norm(corpo)
        nt = norm(titulo)
        if nt:
            titulo_pagina[nt] = min(titulo_pagina.get(nt, 10 ** 9), pg)
    return titulo_pagina, pagina_corpo


def detectar_indices(pagina_corpo, nomes):
    """Paginas que listam 6+ especialidades distintas sao indice (excluir)."""
    nomes_set = {n for n in nomes if n}
    indices = set()
    for pg, corpo in pagina_corpo.items():
        if sum(1 for n in nomes_set if n in corpo) >= 6:
            indices.add(pg)
    return indices


def pagina_por_requisitos(esp_id, pagina_corpo, indices, guia):
    """Vota a pagina pelo texto dos requisitos da especialidade."""
    reqs = [r[0] for r in guia.execute(
        'SELECT texto FROM requisitos WHERE especialidade_id=? ORDER BY posicao LIMIT 4',
        (esp_id,))]
    votos = defaultdict(int)
    for req in reqs:
        palavras = norm(req).split()
        for i in range(0, max(1, len(palavras) - 6), 3):
            frase = ' '.join(palavras[i:i + 7])
            if len(frase) < 25:
                continue
            for pg, corpo in pagina_corpo.items():
                if pg in indices:
                    continue
                if frase in corpo:
                    votos[pg] += 1
    if not votos:
        return None
    return sorted(votos.items(), key=lambda x: (-x[1], x[0]))[0][0]


def main():
    guia = sqlite3.connect(GUIA_DB)
    especialidades = guia.execute('SELECT id, nome FROM especialidades ORDER BY id').fetchall()
    nomes = [norm(n) for _, n in especialidades]

    titulo_pagina, pagina_corpo = carregar_paginas()
    indices = detectar_indices(pagina_corpo, nomes)

    mapa = {}
    por_titulo = por_requisito = sem_match = 0
    faltantes = []
    for esp_id, nome in especialidades:
        if esp_id in OVERRIDES:
            mapa[str(esp_id)] = OVERRIDES[esp_id]
            por_titulo += 1
            continue
        nn = norm(nome)
        pg = titulo_pagina.get(nn)
        if pg is not None and pg not in indices:
            mapa[str(esp_id)] = pg
            por_titulo += 1
            continue
        pg = pagina_por_requisitos(esp_id, pagina_corpo, indices, guia)
        if pg is not None:
            mapa[str(esp_id)] = pg
            por_requisito += 1
            continue
        sem_match += 1
        faltantes.append(nome)
    guia.close()

    SAIDA.write_text(json.dumps(mapa, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'[build_especialidade_pages] total={len(especialidades)} '
          f'titulo={por_titulo} requisitos={por_requisito} sem_match={sem_match}')
    if faltantes:
        print('  sem pagina:', faltantes)
    print(f'  -> {SAIDA}')


if __name__ == '__main__':
    main()
