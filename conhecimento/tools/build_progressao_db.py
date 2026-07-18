"""Gera progressao_2025.sqlite com a estrutura de progressao pessoal 2025+.

Dados extraidos dos Manuais do Escotista (Lobinho e Escoteiro) 2025.10.
Usa :memory: + conn.backup() para evitar lock no Windows.

Schema:
  ramos, eixos, etapas, blocos, bloco_ramo_meta,
  acoes_fixas, acoes_variaveis,
  bloco_especialidades, bloco_insignias,
  reconhecimentos_ramo, reconhecimento_requisitos

ATENCAO — ORDEM CANONICA DO PIPELINE (este script SOZINHO nao basta):
  1. build_progressao_db.py        (este: recria o DB do zero — APAGA aliases/fixes)
  2. fix_data_inconsistencies.py   (migra Insignia do Aprender; CRIA especialidade_alias)
  3. resolve_orphan_aliases.py     (aliases manuais)
  4. fix_aliases_suspeitos.py      (correcoes normativas; autoridade sobre 3)
  5. fix_niveis_especialidades.py  (niveis das especialidades)
  6. export_progressao_to_ts.py    (gera src/data/generated/progressao_2025.ts)
Rodar apenas 1 e 6 deixa o DB SEM a tabela especialidade_alias e sem a migracao da
Insignia do Aprender. Para mudancas pontuais (ex.: faixa etaria), prefira UPDATE
direto no .sqlite + passo 6, sem recriar o banco.
"""

from __future__ import annotations

import sqlite3
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_OUT = ROOT / "bd" / "progressao_2025.sqlite"

SCHEMA = """
PRAGMA encoding = "UTF-8";

CREATE TABLE ramos (
    id                    INTEGER PRIMARY KEY,
    nome                  TEXT NOT NULL,
    slug                  TEXT NOT NULL UNIQUE,
    faixa_etaria          TEXT NOT NULL,
    grupo_secao           TEXT NOT NULL
);

CREATE TABLE eixos (
    id          INTEGER PRIMARY KEY,
    nome        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    ordem       INTEGER NOT NULL,
    cor_hex     TEXT NOT NULL DEFAULT '',
    descricao   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE etapas (
    id                  INTEGER PRIMARY KEY,
    ramo_id             INTEGER NOT NULL REFERENCES ramos(id),
    nome                TEXT NOT NULL,
    slug                TEXT NOT NULL,
    ordem               INTEGER NOT NULL,
    blocos_cumulativos  INTEGER NOT NULL,
    blocos_nesta_etapa  INTEGER NOT NULL,
    idade_referencia    TEXT NOT NULL DEFAULT '',
    UNIQUE(ramo_id, slug)
);

CREATE TABLE blocos (
    id            INTEGER PRIMARY KEY,
    eixo_id       INTEGER NOT NULL REFERENCES eixos(id),
    nome          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    ordem_global  INTEGER NOT NULL
);

CREATE TABLE bloco_ramo_meta (
    id                        INTEGER PRIMARY KEY,
    bloco_id                  INTEGER NOT NULL REFERENCES blocos(id),
    ramo_id                   INTEGER NOT NULL REFERENCES ramos(id),
    intencionalidade_educativa TEXT NOT NULL DEFAULT '',
    variaveis_minimo          INTEGER NOT NULL DEFAULT 0,
    fonte_pagina              TEXT NOT NULL DEFAULT '',
    UNIQUE(bloco_id, ramo_id)
);

CREATE TABLE acoes_fixas (
    id          INTEGER PRIMARY KEY,
    bloco_id    INTEGER NOT NULL REFERENCES blocos(id),
    ramo_id     INTEGER NOT NULL REFERENCES ramos(id),
    descricao   TEXT NOT NULL,
    modalidade  TEXT NOT NULL DEFAULT 'geral',
    ordem       INTEGER NOT NULL
);

CREATE TABLE acoes_variaveis (
    id          INTEGER PRIMARY KEY,
    bloco_id    INTEGER NOT NULL REFERENCES blocos(id),
    ramo_id     INTEGER NOT NULL REFERENCES ramos(id),
    descricao   TEXT NOT NULL,
    modalidade  TEXT NOT NULL DEFAULT 'geral',
    ordem       INTEGER NOT NULL
);

CREATE TABLE bloco_especialidades (
    id                INTEGER PRIMARY KEY,
    bloco_id          INTEGER NOT NULL REFERENCES blocos(id),
    ramo_id           INTEGER NOT NULL REFERENCES ramos(id),
    especialidade_nome TEXT NOT NULL,
    tipo              TEXT NOT NULL DEFAULT 'substitui',
    nivel_minimo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE bloco_insignias (
    id           INTEGER PRIMARY KEY,
    bloco_id     INTEGER NOT NULL REFERENCES blocos(id),
    ramo_id      INTEGER NOT NULL REFERENCES ramos(id),
    insignia_nome TEXT NOT NULL,
    tipo         TEXT NOT NULL DEFAULT 'substitui'
);

CREATE TABLE reconhecimentos_ramo (
    id                  INTEGER PRIMARY KEY,
    ramo_id             INTEGER NOT NULL REFERENCES ramos(id),
    nome                TEXT NOT NULL,
    slug                TEXT NOT NULL UNIQUE,
    idade_limite_anos   REAL,
    descricao           TEXT NOT NULL DEFAULT '',
    fonte_pagina        TEXT NOT NULL DEFAULT ''
);

CREATE TABLE reconhecimento_requisitos (
    id                INTEGER PRIMARY KEY,
    reconhecimento_id INTEGER NOT NULL REFERENCES reconhecimentos_ramo(id),
    tipo              TEXT NOT NULL DEFAULT 'geral',
    descricao         TEXT NOT NULL,
    ordem             INTEGER NOT NULL
);
"""


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.replace(" ", "-").replace("/", "-")
    return "".join(c for c in text if c.isalnum() or c == "-")


# ---------------------------------------------------------------------------
# Dados: Ramos
# ---------------------------------------------------------------------------

RAMOS = [
    {"id": 1, "nome": "Lobinho", "slug": "lobinho", "faixa_etaria": "6,5-10 anos", "grupo_secao": "Alcateia"},
    {"id": 2, "nome": "Escoteiro", "slug": "escoteiro", "faixa_etaria": "11-14 anos", "grupo_secao": "Tropa"},
]

# ---------------------------------------------------------------------------
# Dados: Eixos
# ---------------------------------------------------------------------------

EIXOS = [
    {"id": 1, "nome": "Habilidades Para a Vida", "slug": "habilidades-para-a-vida", "ordem": 1,
     "cor_hex": "#E91E8C",
     "descricao": "Desenvolve autonomia, criatividade, liderança e inteligência emocional."},
    {"id": 2, "nome": "Meio Ambiente", "slug": "meio-ambiente", "ordem": 2,
     "cor_hex": "#4CAF50",
     "descricao": "Estimula a exploração da natureza e a responsabilidade ambiental."},
    {"id": 3, "nome": "Paz e Desenvolvimento", "slug": "paz-e-desenvolvimento", "ordem": 3,
     "cor_hex": "#1565C0",
     "descricao": "Promove respeito à diversidade, cidadania e valorização da herança cultural."},
    {"id": 4, "nome": "Saúde e Bem-estar", "slug": "saude-e-bem-estar", "ordem": 4,
     "cor_hex": "#FF7043",
     "descricao": "Desenvolve cuidado com o corpo, saúde mental, hábitos saudáveis e espiritualidade."},
]

# ---------------------------------------------------------------------------
# Dados: Etapas
# ---------------------------------------------------------------------------

ETAPAS = [
    # Lobinho
    {"id": 1, "ramo_id": 1, "nome": "Lobo Pata-Tenra", "slug": "pata-tenra",
     "ordem": 1, "blocos_cumulativos": 4, "blocos_nesta_etapa": 4, "idade_referencia": "6,5-7 anos"},
    {"id": 2, "ramo_id": 1, "nome": "Lobo Saltador", "slug": "saltador",
     "ordem": 2, "blocos_cumulativos": 8, "blocos_nesta_etapa": 4, "idade_referencia": "~8 anos"},
    {"id": 3, "ramo_id": 1, "nome": "Lobo Rastreador", "slug": "rastreador",
     "ordem": 3, "blocos_cumulativos": 13, "blocos_nesta_etapa": 5, "idade_referencia": "~9 anos"},
    {"id": 4, "ramo_id": 1, "nome": "Lobo Caçador", "slug": "cacador",
     "ordem": 4, "blocos_cumulativos": 18, "blocos_nesta_etapa": 5, "idade_referencia": "~10 anos"},
    # Escoteiro
    {"id": 5, "ramo_id": 2, "nome": "Pistas", "slug": "pistas",
     "ordem": 1, "blocos_cumulativos": 4, "blocos_nesta_etapa": 4, "idade_referencia": ""},
    {"id": 6, "ramo_id": 2, "nome": "Trilha", "slug": "trilha",
     "ordem": 2, "blocos_cumulativos": 8, "blocos_nesta_etapa": 4, "idade_referencia": ""},
    {"id": 7, "ramo_id": 2, "nome": "Rumo", "slug": "rumo",
     "ordem": 3, "blocos_cumulativos": 13, "blocos_nesta_etapa": 5, "idade_referencia": ""},
    {"id": 8, "ramo_id": 2, "nome": "Travessia", "slug": "travessia",
     "ordem": 4, "blocos_cumulativos": 18, "blocos_nesta_etapa": 5, "idade_referencia": "antes dos 15 anos"},
]

# ---------------------------------------------------------------------------
# Dados: Blocos (18 compartilhados, ordem canonical = Lobinho)
# ---------------------------------------------------------------------------
# Eixo 1: Habilidades Para a Vida (4 blocos)
# Eixo 2: Meio Ambiente (4 blocos)
# Eixo 3: Paz e Desenvolvimento (5 blocos)
# Eixo 4: Saúde e Bem-estar (5 blocos)

BLOCOS = [
    {"id": 1,  "eixo_id": 1, "nome": "Aprendizagem Contínua e Desenvolvimento Vocacional", "slug": "aprendizagem-continua", "ordem_global": 1},
    {"id": 2,  "eixo_id": 1, "nome": "Autonomia e Liderança",     "slug": "autonomia-e-lideranca",    "ordem_global": 2},
    {"id": 3,  "eixo_id": 1, "nome": "Criatividade e Inovação",   "slug": "criatividade-e-inovacao",  "ordem_global": 3},
    {"id": 4,  "eixo_id": 1, "nome": "Inteligência Emocional",    "slug": "inteligencia-emocional",   "ordem_global": 4},
    {"id": 5,  "eixo_id": 2, "nome": "Consumo Responsável",       "slug": "consumo-responsavel",      "ordem_global": 5},
    {"id": 6,  "eixo_id": 2, "nome": "Mudanças Climáticas",       "slug": "mudancas-climaticas",      "ordem_global": 6},
    {"id": 7,  "eixo_id": 2, "nome": "Preservação da Biodiversidade", "slug": "preservacao-biodiversidade", "ordem_global": 7},
    {"id": 8,  "eixo_id": 2, "nome": "Vida ao Ar Livre",          "slug": "vida-ao-ar-livre",         "ordem_global": 8},
    {"id": 9,  "eixo_id": 3, "nome": "Comunidade",                "slug": "comunidade",               "ordem_global": 9},
    {"id": 10, "eixo_id": 3, "nome": "Democracia",                "slug": "democracia",               "ordem_global": 10},
    {"id": 11, "eixo_id": 3, "nome": "Herança Cultural",          "slug": "heranca-cultural",         "ordem_global": 11},
    {"id": 12, "eixo_id": 3, "nome": "Promoção da Paz",           "slug": "promocao-da-paz",          "ordem_global": 12},
    {"id": 13, "eixo_id": 3, "nome": "Valores",                   "slug": "valores",                  "ordem_global": 13},
    {"id": 14, "eixo_id": 4, "nome": "Cuidado com o Corpo",       "slug": "cuidado-com-o-corpo",      "ordem_global": 14},
    {"id": 15, "eixo_id": 4, "nome": "Espiritualidade",           "slug": "espiritualidade",          "ordem_global": 15},
    {"id": 16, "eixo_id": 4, "nome": "Hábitos Saudáveis",         "slug": "habitos-saudaveis",        "ordem_global": 16},
    {"id": 17, "eixo_id": 4, "nome": "Saúde Mental",              "slug": "saude-mental",             "ordem_global": 17},
    {"id": 18, "eixo_id": 4, "nome": "Vínculos Saudáveis",        "slug": "vinculos-saudaveis",       "ordem_global": 18},
]

# ---------------------------------------------------------------------------
# Dados: bloco_ramo_meta — (bloco_id, ramo_id, intencionalidade, variaveis_minimo, pagina)
# ---------------------------------------------------------------------------
# Nota: Escoteiro Saúde e Bem-estar: ordem de apresentação difere do canônico.
# No livro Escoteiro: bloco 14=Cuidado, 16=Hábitos, 17=Saúde Mental, 18=Vínculos, 15=Espiritualidade.

BLOCO_RAMO_META = [
    # ---- Bloco 1: Aprendizagem Contínua ----
    (1, 1, "Se interessar por diversos temas, aprender com diferentes pessoas e consultar várias fontes para ampliar seu conhecimento, explorando novas ideias e recursos nas atividades.", 5, "282"),
    (1, 2, "Explorar temas que despertam seu interesse, buscar informações confiáveis para aprender mais e experimentar novas ideias e recursos, aplicando esse conhecimento em atividades e projetos de serviço.", 4, "263"),
    # ---- Bloco 2: Autonomia e Liderança ----
    (2, 1, "Organizar tarefas simples, tomar pequenas decisões e colaborar com os companheiros, aprendendo a se responsabilizar pelo que faz.", 4, "283"),
    (2, 2, "Assumir diferentes papéis em sua patrulha, sabendo quando colaborar e quando liderar. Aprender a administrar seu dinheiro para realizar atividades e projetos, além de planejar, executar e avaliar tarefas junto ao grupo, tomando decisões de forma responsável.", 5, "265"),
    # ---- Bloco 3: Criatividade e Inovação ----
    (3, 1, "Criar, inventar e experimentar soluções novas usando materiais simples e a imaginação, descobrindo que é capaz de resolver problemas de formas diferentes.", 5, "285"),
    (3, 2, "Usar a criatividade para encontrar soluções práticas para os desafios do dia a dia, analisando diferentes alternativas antes de tomar uma decisão.", 4, "267"),
    # ---- Bloco 4: Inteligência Emocional ----
    (4, 1, "Reconhecer e nomear suas emoções, aprendendo a expressá-las de forma saudável e a respeitar os sentimentos dos outros em brincadeiras e atividades do dia a dia.", 5, "287"),
    (4, 2, "Reconhecer e compreender suas emoções, aprender a lidar com elas de maneira respeitosa e desenvolver resiliência ao enfrentar desafios e superar dificuldades.", 4, "269"),
    # ---- Bloco 5: Consumo Responsável ----
    (5, 1, "Usar apenas o necessário, evitando desperdícios e consumindo de forma consciente para preservar os recursos naturais.", 5, "289"),
    (5, 2, "Praticar o consumo consciente diariamente, evitando desperdícios e ajudando a preservar os recursos naturais.", 5, "273"),
    # ---- Bloco 6: Mudanças Climáticas ----
    (6, 1, "Cuidar do planeta adotando hábitos que ajudam a reduzir os impactos das mudanças climáticas no dia a dia.", 4, "291"),
    (6, 2, "Se envolver em atividades e projetos para reduzir os impactos ambientais e combater as mudanças climáticas.", 5, "275"),
    # ---- Bloco 7: Preservação da Biodiversidade ----
    (7, 1, "Conhecer e valorizar os seres vivos ao redor, entendendo que cada planta e animal tem um papel importante para o equilíbrio do planeta.", 5, "293"),
    (7, 2, "Cuidar dos animais e das plantas, entendendo como as atitudes humanas podem protegê-los ou prejudicá-los.", 5, "277"),
    # ---- Bloco 8: Vida ao Ar Livre ----
    (8, 1, "Aproveitar as atividades ao ar livre com responsabilidade, sempre cuidando da natureza e deixando os lugares melhores do que o encontrou.", 4, "295"),
    (8, 2, "Aproveitar as atividades ao ar livre com responsabilidade, respeitando a natureza e deixando os lugares sempre melhores do que encontrou.", 5, "279"),
    # ---- Bloco 9: Comunidade ----
    (9, 1, "Praticar boas ações diariamente, seja em casa, na escola ou na comunidade, contribuindo para tornar o mundo um lugar melhor.", 3, "298"),
    (9, 2, "Realizar boas ações diariamente e trabalhar em equipe para organizar atividades e projetos de serviço que beneficiem a comunidade.", 3, "283"),
    # ---- Bloco 10: Democracia ----
    (10, 1, "Ajudar na tomada de decisões em grupo, respeitando as escolhas coletivas e colaborando para que todos sejam ouvidos.", 2, "300"),
    (10, 2, "Participar das decisões da tropa, contribuindo com suas ideias, respeitando as opiniões dos colegas e se comprometendo a seguir o que foi decidido coletivamente.", 2, "285"),
    # ---- Bloco 11: Herança Cultural ----
    (11, 1, "Descobrir e valorizar a cultura da sua comunidade e do seu país, explorando histórias, tradições e costumes em atividades divertidas.", 5, "302"),
    (11, 2, "Explorar e valorizar a cultura de sua comunidade e de seu país, conhecendo costumes, tradições, folclore e geografia, e propor atividades para compartilhar esse conhecimento com os outros.", 5, "287"),
    # ---- Bloco 12: Promoção da Paz ----
    (12, 1, "Participar de atividades que promovem a paz e o respeito entre as pessoas, aprendendo a conviver com diferentes crenças e formas de pensar.", 5, "305"),
    (12, 2, "Promover a paz, a inclusão e a diversidade em suas ações diárias, respeitando e demonstrando interesse por diferentes crenças e tradições espirituais.", 4, "289"),
    # ---- Bloco 13: Valores ----
    (13, 1, "Agir sempre de acordo com os valores da Promessa do Lobinho, sendo amigo, leal e prestativo com todos ao seu redor.", 5, "307"),
    (13, 2, "Atuar de acordo com seus valores pessoais e os princípios do Movimento Escoteiro, vivendo sua Promessa e a Lei Escoteira em todas as suas atitudes.", 3, "291"),
    # ---- Bloco 14: Cuidado com o Corpo ----
    (14, 1, "Conhecer seu corpo, entender as diferenças entre as pessoas e realizar atividades que desenvolvem sua agilidade, força e flexibilidade. Conhecer técnicas básicas de primeiros socorros para ajudar em situações simples.", 4, "309"),
    (14, 2, "Compreender e respeitar as mudanças do seu próprio corpo e das outras pessoas, independentemente de aparência, identidade ou orientação sexual. Se desafiar a superar suas limitações físicas e aprender técnicas básicas de primeiros socorros.", 4, "295"),
    # ---- Bloco 15: Espiritualidade ----
    (15, 1, "Descobrir e respeitar diferentes crenças espirituais em sua comunidade, expressando sua própria fé com respeito e bondade no ambiente familiar e entre amigos.", 4, "311"),
    (15, 2, "Explora a espiritualidade observando as maravilhas da natureza, praticando a solidariedade e conhecendo diferentes crenças. Além disso, se esforça para viver seus princípios diariamente.", 4, "303"),
    # ---- Bloco 16: Hábitos Saudáveis ----
    (16, 1, "Cuidar de si mesmo, praticando atividades físicas, mantendo uma alimentação saudável e garantindo a higiene pessoal e do ambiente ao seu redor.", 5, "313"),
    (16, 2, "Cuidar da própria saúde praticando exercícios físicos, mantendo uma alimentação equilibrada e garantindo bons hábitos de higiene pessoal e organização do seu espaço.", 3, "297"),
    # ---- Bloco 17: Saúde Mental ----
    (17, 1, "Adotar hábitos que ajudam a equilibrar sua saúde mental, buscando momentos de relaxamento, diversão e bem-estar, tanto para si quanto para os outros.", 4, "316"),
    (17, 2, "Adotar práticas que ajudam a manter o equilíbrio da sua saúde mental, buscando estratégias para lidar com desafios e contribuindo para o bem-estar das pessoas ao seu redor.", 2, "299"),
    # ---- Bloco 18: Vínculos Saudáveis ----
    (18, 1, "Fazer novas amizades, fortalecer os laços com os amigos e aprender a se relacionar de maneira saudável e positiva.", 5, "318"),
    (18, 2, "Criar laços de amizade de forma saudável, respeitosa e empática, fortalecendo suas relações pessoais de maneira positiva.", 4, "301"),
]

# ---------------------------------------------------------------------------
# Dados: Ações Fixas — (bloco_id, ramo_id, descricao, modalidade, ordem)
# modalidade: 'geral' | 'ar' | 'mar'
# ---------------------------------------------------------------------------

ACOES_FIXAS = [
    # == Bloco 1: Aprendizagem Contínua ==
    # Lobinho
    (1, 1, "Conquistar especialidade sobre tema de interesse novo", "geral", 1),
    (1, 1, "Visitar um aeródromo", "ar", 2),
    (1, 1, "Visitar porto, marina ou iate clube", "mar", 3),
    # Escoteiro
    (1, 2, "Conquistar especialidade no Ramo Escoteiro sobre tema de interesse novo", "geral", 1),
    (1, 2, "Realizar Percurso de Gilwell de pelo menos 3 km com a patrulha", "geral", 2),
    (1, 2, "Visitar aeroporto ou aeroclube", "ar", 3),
    (1, 2, "Visitar porto, marina ou iate clube", "mar", 4),

    # == Bloco 2: Autonomia e Liderança ==
    # Lobinho
    (2, 1, "Organizar materiais individuais e arrumar mochila para acampamento de alcateia", "geral", 1),
    (2, 1, "Navegar em embarcação com colete salva-vidas", "mar", 2),
    # Escoteiro
    (2, 2, "Montar corretamente uma mochila para um acampamento, mantendo o equipamento pessoal em bom estado", "geral", 1),
    (2, 2, "Navegar em embarcação a vela ou remo, montando-a corretamente, identificando as partes (proa, popa, bombordo, boreste), usando o colete salva-vidas e respeitando as regras de segurança", "mar", 2),

    # == Bloco 3: Criatividade e Inovação ==
    # Lobinho
    (3, 1, "Construir engenhoca simples (varal, suporte de panela, etc.)", "geral", 1),
    (3, 1, "Construir três diferentes modelos de avião de papel", "ar", 2),
    # Escoteiro
    (3, 2, "Animar um Fogo de Conselho em um acampamento da patrulha ou de tropa", "geral", 1),
    (3, 2, "Aplicar conceitos básicos de estruturas (cavaletes, encaixes, ancoragens) em projetos como pontes, balsas, pórticos ou outras pioneiras", "geral", 2),
    (3, 2, "Construir uma pipa, planador e foguete, testando aerodinâmica, planagem e propulsão", "ar", 3),
    (3, 2, "Confeccionar e utilizar uma jangada, canoa ou bote para embarcar a sua patrulha, respeitando as regras de segurança", "mar", 4),

    # == Bloco 4: Inteligência Emocional ==
    # Lobinho: sem ação fixa
    # Escoteiro
    (4, 2, "Identificar situações perigosas e de maus tratos, sabendo como agir e a quem recorrer", "geral", 1),

    # == Bloco 5: Consumo Responsável ==
    # Lobinho
    (5, 1, "Participar de piquenique, excursão ou acampamento com alcateia sem utilização de plásticos descartáveis", "geral", 1),
    # Escoteiro
    (5, 2, "Em acampamentos e excursões, criar soluções para melhorar a higiene e conforto e classificar os resíduos em categorias, tratando-os adequadamente", "geral", 1),
    (5, 2, "Planejar adequadamente e adquirir as quantidades dos alimentos para refeições em um acampamento para sua patrulha, evitando desperdício", "geral", 2),

    # == Bloco 6: Mudanças Climáticas ==
    # Lobinho: sem ação fixa
    # Escoteiro: sem ação fixa

    # == Bloco 7: Preservação da Biodiversidade ==
    # Lobinho
    (7, 1, "Explorar a fauna e a flora local em uma atividade com a alcateia, compreendendo a importância da preservação", "geral", 1),
    (7, 1, "Conhecer as características do bioma aquático local", "mar", 2),
    (7, 1, "Identificar as aves da região e seus hábitos", "ar", 3),
    # Escoteiro
    (7, 2, "Participar, em patrulha, de atividade de exploração em ambiente natural, reconhecendo a fauna e a flora locais e identificando riscos à preservação, além de propor soluções para evitá-los", "geral", 1),
    (7, 2, "Identificar aves da região, seus hábitos e compreender a relação das espécies com os métodos de voo e aerodinâmica", "ar", 2),
    (7, 2, "Conhecer as características do bioma aquático local e os riscos para esse bioma", "mar", 3),

    # == Bloco 8: Vida ao Ar Livre ==
    # Lobinho
    (8, 1, "Explorar fauna e flora local", "geral", 1),
    (8, 1, "Aplicar nós: direito, escota alceado, aselha, de correr e volta do fiel, sabendo suas funções, durante acampamento", "geral", 2),
    (8, 1, "Montar, pernoitar, desmontar e acondicionar barraca durante acampamento", "geral", 3),
    (8, 1, "Acender pequena fogueira para bebida quente/lanche demonstrando técnicas de segurança", "geral", 4),
    (8, 1, "Conhecer a Rosa dos Ventos e constelação do Cruzeiro do Sul usando-os para orientação", "geral", 5),
    (8, 1, "Participar de pelo menos dois acampamentos ou acantonamentos com a alcateia; cozinhar prato de comida mateira", "geral", 6),
    (8, 1, "Saber remar em bote ou canoa demonstrando embarque e desembarque", "mar", 7),
    # Escoteiro
    (8, 2, "Montar o campo de patrulha com pioneiras como mesa, pórtico e canto do lenhador, utilizando amarras adequadas", "geral", 1),
    (8, 2, "Aplicar os nós direito, correr, aselha, volta do fiel, escota, durante um acampamento sabendo sua utilização", "geral", 2),
    (8, 2, "Escolher corretamente o local para montagem da barraca, incluindo técnicas de montagem, desmontagem e acondicionamento durante acampamento", "geral", 3),
    (8, 2, "Manusear corretamente ferramentas de corte e sapa durante acampamento, zelando pela segurança e realizando reparos", "geral", 4),
    (8, 2, "Preparar e executar fogueira para refeição mateira durante acampamento, seguindo as técnicas de segurança", "geral", 5),
    (8, 2, "Participar de ao menos duas excursões ao ar livre (patrulha ou tropa) utilizando normas de baixo impacto ambiental", "geral", 6),
    (8, 2, "Participar de ao menos dois acampamentos ao ar livre (patrulha ou tropa) utilizando normas de baixo impacto ambiental", "geral", 7),
    (8, 2, "Orientar-se com recursos naturais, bússola e mapa, utilizando azimutes", "geral", 8),
    (8, 2, "Durante acampamento, realizar observação das estrelas, identificando constelações e fases da lua", "ar", 9),
    (8, 2, "Durante atividade náutica, utilizar nós de modalidade do mar: lais de guia, nó de cunho, pinha de retinida e nó de defesa", "mar", 10),

    # == Bloco 9: Comunidade ==
    # Lobinho
    (9, 1, "Identificar, com sua alcateia, uma necessidade da UEL e participar de uma ação coletiva de melhoria", "geral", 1),
    (9, 1, "Conhecer os hospitais próximos à sua casa e os contatos de emergência (Bombeiros, SAMU, Polícia)", "geral", 2),
    # Escoteiro
    (9, 2, "Identificar, sozinho ou em patrulha, uma necessidade da comunidade e planejar e executar uma ação comunitária", "geral", 1),
    (9, 2, "Identificar os riscos de desastres naturais na comunidade e conhecer os hospitais e contatos de emergência, sabendo quando acionar cada um", "geral", 2),

    # == Bloco 10: Democracia ==
    # Lobinho
    (10, 1, "Participar ativamente de uma Roca de Conselho, expressando opiniões de forma respeitosa", "geral", 1),
    (10, 1, "Conhecer a história 'Caçadas de Kaa' e discutir com os companheiros a conduta dos personagens", "geral", 2),
    (10, 1, "Participar da eleição de primo e segundo da matilha e combinar suas responsabilidades", "geral", 3),
    # Escoteiro
    (10, 2, "Participar ativamente das decisões do Conselho de Patrulha, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados", "geral", 1),
    (10, 2, "Participar ativamente das decisões da Assembleia de Tropa, contribuindo com ideias, votando e assumindo responsabilidades, respeitando os resultados", "geral", 2),
    (10, 2, "Participar da eleição do monitor da patrulha e das decisões de encargos, respeitando os resultados", "geral", 3),

    # == Bloco 11: Herança Cultural ==
    # Lobinho
    (11, 1, "Realizar o hasteamento ou arriamento da Bandeira Nacional em cerimônia de abertura ou de encerramento de atividade", "geral", 1),
    # Escoteiro
    (11, 2, "Realizar o hasteamento ou arriamento da bandeira em cerimônia de abertura ou encerramento de atividade", "geral", 1),

    # == Bloco 12: Promoção da Paz ==
    # Lobinho
    (12, 1, "Ouvir as histórias 'Flor Vermelha' e 'Irmãos de Mowgli', do Livro da Jângal", "geral", 1),
    # Escoteiro
    (12, 2, "Aplicar uma atividade para a patrulha sobre Direitos Humanos ou os Direitos da Criança e do Adolescente", "geral", 1),

    # == Bloco 13: Valores ==
    # Lobinho
    (13, 1, "Ouvir a história 'Tigre Tigre' e comparar a conduta de Mowgli com a sua Promessa de Lobinho", "geral", 1),
    # Escoteiro
    (13, 2, "Avaliar, com seus companheiros de patrulha, a vivência da Promessa e Lei Escoteira", "geral", 1),

    # == Bloco 14: Cuidado com o Corpo ==
    # Lobinho
    (14, 1, "Saber realizar os primeiros socorros em cortes, queimaduras e outros pequenos ferimentos", "geral", 1),
    (14, 1, "Saber utilizar ataduras e tipóias", "geral", 2),
    (14, 1, "Saber usar um termômetro", "geral", 3),
    (14, 1, "Cuidar de sua segurança e dos demais nas atividades da alcateia, seguindo as orientações dos Velhos Lobos", "geral", 4),
    # Escoteiro
    (14, 2, "Conhecer as ações iniciais em acidentes e como cuidar de pequenos cortes, contusões, escoriações, queimaduras e picadas de animais peçonhentos", "geral", 1),
    (14, 2, "Aplicar técnicas de bandagens e transporte de feridos", "geral", 2),
    (14, 2, "Cuidar da segurança física e mental nas atividades escoteiras, respeitando os limites próprios e dos outros, e seguindo as orientações dos escotistas", "geral", 3),
    (14, 2, "Arremessar cabo de retinida com pinha ou bóia salva-vidas a 10 metros e conhecer técnicas de natação para salvamento, transporte, reanimação e aquecimento de afogados", "mar", 4),

    # == Bloco 15: Espiritualidade ==
    # Lobinho: sem ação fixa
    # Escoteiro: sem ação fixa

    # == Bloco 16: Hábitos Saudáveis ==
    # Lobinho
    (16, 1, "Auxiliar na preparação de uma refeição saudável em um acampamento ou acantonamento e experimentá-la", "geral", 1),
    (16, 1, "Preparar um lanche saudável para uma caçada, contendo pelo menos três tipos de legumes e dois tipos de frutas", "geral", 2),
    (16, 1, "Participar de pelo menos uma caminhada ao ar livre com a alcateia (entre 2 e 3 km) registrando três observações sobre o local durante o percurso", "geral", 3),
    (16, 1, "Saber remar em bote ou canoa, demonstrando embarque e desembarque", "mar", 4),
    # Escoteiro
    (16, 2, "Planejar e executar um cardápio completo e saudável (café da manhã, almoço e jantar) para a patrulha em acampamento", "geral", 1),
    (16, 2, "Conhecer e aplicar normas de limpeza no tratamento e conservação de alimentos nas atividades de patrulha", "geral", 2),

    # == Bloco 17: Saúde Mental ==
    # Lobinho: sem ação fixa
    # Escoteiro
    (17, 2, "Conhecer o conceito de Espaços Seguros e aplicá-los em todas as atividades de sua patrulha ou tropa", "geral", 1),
    (17, 2, "Aprender a identificar sinais de tristeza ou isolamento em colegas e saber como oferecer apoio inicial, como conversar com respeito e buscar ajuda de um adulto de confiança", "geral", 2),

    # == Bloco 18: Vínculos Saudáveis ==
    # Lobinho
    (18, 1, "Participar com entusiasmo das atividades da alcateia, brincando, conversando e respeitando os lobinhos e os Velhos Lobos", "geral", 1),
    (18, 1, "Cumprimentar membros do grupo com a saudação do lobinho e o aperto de mão", "geral", 2),
    # Escoteiro
    (18, 2, "Realizar uma campanha para combater o bullying e cyberbullying para a comunidade", "geral", 1),
    (18, 2, "Participar de torneio de aeromodelos", "ar", 2),
]

# ---------------------------------------------------------------------------
# Dados: Ações Variáveis — (bloco_id, ramo_id, descricao, modalidade, ordem)
# ---------------------------------------------------------------------------

ACOES_VARIAVEIS = [
    # == Bloco 1: Aprendizagem Contínua ==
    (1, 1, "Utilizar corretamente um rádio comunicador em atividade", "geral", 1),
    (1, 1, "Pesquisar e apresentar resultados de um tema em formato criativo (cartaz, teatro, vídeo)", "geral", 2),
    (1, 1, "Planejar e executar ação de serviço comunitário baseada em informações pesquisadas sobre necessidades locais", "geral", 3),
    (1, 1, "Visitar profissões relacionadas ao interesse do jovem", "geral", 4),
    (1, 1, "Usar internet, rádio ou TV para pesquisar tema de interesse e apresentar para o grupo", "geral", 5),
    (1, 1, "Convidar especialista para apresentar tema de interesse", "geral", 6),
    (1, 1, "Conhecer e demonstrar o funcionamento de um sistema de localização por satélite", "ar", 7),
    (1, 1, "Apresentar a história e características de uma aeronave de sua escolha", "ar", 8),
    (1, 1, "Realizar manutenção de uma embarcação (faxina, reparo, pintura ou substituição de peças)", "mar", 9),
    (1, 1, "Calcular um rumo magnético e corrigir a rota quando se aproxima de uma linha isogônica", "mar", 10),
    (1, 2, "Utilizar corretamente um rádio comunicador em atividade da patrulha", "geral", 1),
    (1, 2, "Realizar uma pesquisa sobre um tema escolhido e apresentar os resultados para a patrulha ou tropa em formato criativo (cartaz, teatro, vídeo, oficina)", "geral", 2),
    (1, 2, "Planejar e executar, em conjunto com a sua patrulha, uma ação de serviço comunitário baseada em informações pesquisadas sobre necessidades locais", "geral", 3),
    (1, 2, "Conhecer e demonstrar o funcionamento de um sistema de localização por satélite", "ar", 4),
    (1, 2, "Apresentar a história e características de uma aeronave de sua escolha", "ar", 5),
    (1, 2, "Realizar manutenção de uma embarcação (faxina, reparo, pintura ou substituição de peças)", "mar", 6),
    (1, 2, "Calcular um rumo magnético e corrigir a rota quando se aproxima de uma linha isogônica", "mar", 7),

    # == Bloco 2: Autonomia e Liderança ==
    (2, 1, "Participar de planejamento de excursão, cuidando de alimentação e materiais necessários", "geral", 1),
    (2, 1, "Realizar tarefa simples de manutenção da sede ou espaço de reunião da alcateia", "geral", 2),
    (2, 1, "Exercer função ou encargo por um período de atividades", "geral", 3),
    (2, 1, "Controlar gasto pessoal em atividade, anotando o que gastou e reportando para os Velhos Lobos", "geral", 4),
    (2, 2, "Contribuir para o planejamento e a organização de uma excursão de patrulha", "geral", 1),
    (2, 2, "Fazer uma excursão urbana com a patrulha ou tropa, se locomovendo por meio de transportes públicos", "geral", 2),
    (2, 2, "Pesquisar e realizar as compras dos alimentos para um acampamento, apresentando para a patrulha uma prestação de contas", "geral", 3),
    (2, 2, "Saber onde encontrar, identificando em um mapa, os principais serviços públicos na cidade", "geral", 4),
    (2, 2, "Planejar e executar em patrulha um projeto de captação de recursos para participação em uma atividade escoteira", "geral", 5),
    (2, 2, "Participar de atividades ou oficinas sobre finanças pessoais", "geral", 6),
    (2, 2, "Assumir pelo menos três encargos diferentes na patrulha, sendo bem avaliado pelos seus companheiros", "geral", 7),
    (2, 2, "Administrar o fundo de patrulha por pelo menos três meses, registrando receitas e despesas", "geral", 8),
    (2, 2, "Registrar receitas e despesas simples ou da mesada em planilha ou caderno por um período determinado", "geral", 9),
    (2, 2, "Conduzir uma reunião de patrulha como monitor ou secretário, registrando decisões e acompanhando sua execução", "geral", 10),

    # == Bloco 3: Criatividade e Inovação ==
    (3, 1, "Criar uma brincadeira ou jogo novo para a alcateia", "geral", 1),
    (3, 1, "Construir um brinquedo simples com materiais reciclados", "geral", 2),
    (3, 1, "Decorar o espaço da matilha de forma criativa usando materiais disponíveis", "geral", 3),
    (3, 1, "Participar de festival de talentos ou apresentação cultural da alcateia", "geral", 4),
    (3, 1, "Criar uma minihistória em quadrinhos ou vídeo sobre tema escoteiro", "geral", 5),
    (3, 2, "Organizar uma atividade de divulgação do escotismo no colégio usando diferentes recursos (vídeos, cartazes, panfletos)", "geral", 1),
    (3, 2, "Conhecer e cantar canções e danças apropriadas para diferentes momentos", "geral", 2),
    (3, 2, "Criar uma campanha publicitária divertida promovendo algum projeto ou atividade da patrulha ou Tropa Escoteira", "geral", 3),
    (3, 2, "Construir equipamentos improvisados de campo (mesa, suporte, abrigo, utensílios) utilizando materiais disponíveis", "geral", 4),
    (3, 2, "Propor e implementar soluções criativas para reduzir custos de uma atividade, aproveitando materiais recicláveis ou doados", "geral", 5),
    (3, 2, "Ensinar e aplicar dois novos jogos para sua tropa", "geral", 6),
    (3, 2, "Criar alternativas criativas para decorar o canto da patrulha ou o acampamento", "geral", 7),
    (3, 2, "Participar de um festival de talentos na tropa", "geral", 8),
    (3, 2, "Improvisar apresentações artísticas (esquetes, músicas, danças) em um Fogo de Conselho", "geral", 9),
    (3, 2, "Criar um vídeo de divulgação das atividades de sua patrulha ou tropa", "geral", 10),
    (3, 2, "Demonstrar com 1 experimento simples: sustentação das asas e funcionamento de 1 aeróstato", "ar", 11),
    (3, 2, "Fazer um trabalho artesanal marinheiro com cabos, usando nós característicos da marinharia", "mar", 12),

    # == Bloco 4: Inteligência Emocional ==
    (4, 1, "Participar de rodas de conversa após atividades intensas, ouvindo e respeitando as emoções dos demais", "geral", 1),
    (4, 1, "Escrever carta de incentivo para si mesmo, lembrando de suas qualidades e dando sugestões de como superar desafios futuros", "geral", 2),
    (4, 1, "Criar e encenar história com personagem que supera dificuldades", "geral", 3),
    (4, 1, "Identificar e nomear pelo menos cinco emoções diferentes durante atividade da alcateia", "geral", 4),
    (4, 1, "Participar de jogo ou brincadeira que envolva empatia e cuidado com o outro", "geral", 5),
    (4, 2, "Conversar com a patrulha sobre pontos fortes e de melhoria no desempenho da equipe em atividades e acampamentos", "geral", 1),
    (4, 2, "Identificar seus medos e suas emoções diante a um obstáculo desafiador, trabalhando para conseguir superá-lo", "geral", 2),
    (4, 2, "Em um acampamento, participar de um turno de ronda com outro companheiro de patrulha, refletindo sobre o cuidado com o outro", "geral", 3),
    (4, 2, "Participar de jogos ou competições, respeitando regras e resultados", "geral", 4),
    (4, 2, "Em uma atividade de patrulha ou de tropa aplicar técnicas de respiração, relaxamento ou meditação antes de um grande desafio", "geral", 5),
    (4, 2, "Participar de rodas de conversa ou momentos de partilha após atividades intensas, ouvindo e respeitando as emoções dos demais", "geral", 6),
    (4, 2, "Escrever uma pequena carta para si mesmo com palavras de incentivo, lembrando de suas qualidades e dando sugestões de como superar desafios futuros", "geral", 7),
    (4, 2, "Criar e encenar uma pequena história em que o personagem passa por dificuldades e encontra formas saudáveis de lidar com elas", "geral", 8),

    # == Bloco 5: Consumo Responsável ==
    (5, 1, "Registrar o que consome em um dia e identificar o que pode reduzir ou reaproveitar", "geral", 1),
    (5, 1, "Fazer uma feira de trocas ou ação de doação com objetos que não usa mais", "geral", 2),
    (5, 1, "Participar da organização de uma campanha de coleta seletiva na sede ou escola", "geral", 3),
    (5, 1, "Preparar refeição em acampamento sem uso de embalagens descartáveis", "geral", 4),
    (5, 1, "Consertar ou reutilizar um objeto em vez de descartá-lo", "geral", 5),
    (5, 2, "Registrar e analisar o consumo de água e energia da sua residência, buscando ideias para economizar", "geral", 1),
    (5, 2, "Avaliar o impacto ambiental de uma atividade e apresentar alternativas mais sustentáveis", "geral", 2),
    (5, 2, "Visitar uma estação de energia renovável, estação de tratamento de água, cooperativa ou usina de reciclagem", "geral", 3),
    (5, 2, "Consertar objetos simples, como brinquedos ou pequenos eletrodomésticos", "geral", 4),
    (5, 2, "Utilizar embalagens retornáveis ou reutilizáveis nas refeições de campo, evitando descartáveis", "geral", 5),
    (5, 2, "Separar resíduos orgânicos e criar um sistema de compostagem caseira", "geral", 6),
    (5, 2, "Criar uma campanha educativa para a tropa sobre consumo consciente e economia de recursos", "geral", 7),
    (5, 2, "Trocar roupas, livros ou jogos com amigos e familiares em vez de comprar novos", "geral", 8),
    (5, 2, "Organizar, com sua patrulha, uma campanha de conscientização sobre consumo responsável", "geral", 9),
    (5, 2, "Confeccionar utensílios ou equipamentos a partir de materiais reciclados para uso nas atividades da patrulha", "geral", 10),
    (5, 2, "Planejar e realizar as refeições de um dia de acampamento sem carne, garantindo a ingestão adequada de proteínas", "geral", 11),
    (5, 2, "Organizar, cuidar e fazer reparos nos materiais da patrulha", "geral", 12),

    # == Bloco 6: Mudanças Climáticas ==
    (6, 1, "Observar e registrar mudanças no tempo durante uma semana (temperatura, chuva, vento)", "geral", 1),
    (6, 1, "Participar de plantio de árvore ou muda em área degradada", "geral", 2),
    (6, 1, "Conhecer fontes de energia limpa e apresentar para o grupo", "geral", 3),
    (6, 1, "Fazer trilha noturna observando impacto da luz artificial na natureza", "geral", 4),
    (6, 2, "Em um acampamento, criar uma estação meteorológica simples para registrar temperatura, umidade, direção do vento, nuvens e possíveis mudanças no tempo", "geral", 1),
    (6, 2, "Participar da construção de um fogão solar e usá-lo em um acampamento de patrulha ou tropa", "geral", 2),
    (6, 2, "Participar de uma excursão urbana com foco ecológico, identificando situações de risco para a sociedade referentes às mudanças climáticas", "geral", 3),
    (6, 2, "Visitar ou participar de uma atividade com uma organização que atua em prol do meio ambiente", "geral", 4),
    (6, 2, "Em uma excursão ou acampamento em área não urbana, identificar ações prejudiciais à natureza como extrativismo e mineração, e listar seus impactos", "geral", 5),
    (6, 2, "Planejar e participar de uma excursão utilizando meios de transporte que dependem de fontes de energia limpa (bicicleta, ônibus elétrico, embarcação a remo)", "geral", 6),
    (6, 2, "Organizar, com sua patrulha ou tropa, um projeto de conscientização sobre o uso de energia e água na escola, condomínio ou sede da UEL", "geral", 7),
    (6, 2, "Participar de mutirões de plantio de mudas ou cultivo de uma horta em casa, na escola ou na UEL", "geral", 8),

    # == Bloco 7: Preservação da Biodiversidade ==
    (7, 1, "Reconhecer animais venenosos e peçonhentos da região e saber como agir em caso de picada", "geral", 1),
    (7, 1, "Plantar uma muda nativa e acompanhar seu crescimento registrando as etapas", "geral", 2),
    (7, 1, "Construir comedouro ou bebedouro para aves", "geral", 3),
    (7, 1, "Observar e registrar espécies durante acampamento ou excursão", "geral", 4),
    (7, 1, "Visitar parque, reserva ou centro de proteção ambiental", "geral", 5),
    (7, 2, "Reconhecer os animais venenosos e peçonhentos da região e saber como agir em casos de picadas ou contaminação", "geral", 1),
    (7, 2, "Planejar e executar um projeto ambiental com a patrulha ou tropa", "geral", 2),
    (7, 2, "Plantar uma espécie nativa e observar seu crescimento, registrando cada etapa", "geral", 3),
    (7, 2, "Identificar as pegadas de pelo menos cinco animais da fauna brasileira e realizar levantamento das pegadas em áreas naturais", "geral", 4),
    (7, 2, "Participar de uma atividade de mergulho que tenha o objetivo de conhecer e explorar a vida na água", "geral", 5),
    (7, 2, "Participar de uma atividade de observação de animais noturnos com sua patrulha", "geral", 6),
    (7, 2, "Observar e registrar espécies de aves, insetos, plantas ou outros animais durante acampamento ou excursão", "geral", 7),
    (7, 2, "Visitar parques, reservas ou centros de proteção ambiental para conhecer ações de preservação", "geral", 8),
    (7, 2, "Construir comedouros ou bebedouros para aves e instalar em áreas adequadas, acompanhando seu uso", "geral", 9),
    (7, 2, "Criar materiais educativos, como vídeos ou posts, sobre a importância de preservar a biodiversidade", "geral", 10),

    # == Bloco 8: Vida ao Ar Livre ==
    (8, 1, "Participar de percurso de campo usando sinais de pista", "geral", 1),
    (8, 1, "Colaborar no preparo de alimentos na fogueira sem utensílios", "geral", 2),
    (8, 1, "Desenvolver soluções para purificação e consumo de água em acampamento", "geral", 3),
    (8, 1, "Aplicar técnicas de tocaia em jogos com a alcateia", "geral", 4),
    (8, 2, "Participar de um percurso no campo de pelo menos 1 km utilizando sinais de pista", "geral", 1),
    (8, 2, "Colaborar na preparação de alimentos para a patrulha em pelo menos três atividades ao ar livre, sendo uma delas no estilo comida mateira, sem utensílios", "geral", 2),
    (8, 2, "Desenvolver soluções para purificação e consumo de água em um acampamento", "geral", 3),
    (8, 2, "Aplicar técnicas de 'tocaia' em jogos com a patrulha", "geral", 4),
    (8, 2, "Participar da construção de um fogão suspenso ou forno de acampamento para o preparo de uma refeição", "geral", 5),
    (8, 2, "Construir e pernoitar em um bivaque ou abrigo natural durante uma atividade de patrulha", "geral", 6),
    (8, 2, "Confeccionar falcaças, nó catau, lais de guia, pescador, oito duplo e demonstrar cuidados com as cordas", "geral", 7),
    (8, 2, "Participar de uma atividade aquática com a tropa, seguindo as normas de segurança", "geral", 8),
    (8, 2, "Desenhar um croqui de um acampamento, usando sinais topográficos", "geral", 9),

    # == Bloco 9: Comunidade ==
    (9, 1, "Realizar uma boa ação fora da alcateia e reportar para o grupo", "geral", 1),
    (9, 1, "Participar de campanha de serviço organizada pela UEL, distrito ou região", "geral", 2),
    (9, 1, "Colaborar em ações organizadas por outras instituições de serviço", "geral", 3),
    (9, 2, "Aplicar o conhecimento adquirido nas especialidades em ações de serviço à comunidade", "geral", 1),
    (9, 2, "Participar ativamente de pelo menos uma campanha de serviço e desenvolvimento comunitário organizadas pela UEL, distrito ou região", "geral", 2),
    (9, 2, "Organizar uma oficina de brinquedos, doando os itens consertados para uma instituição que atende crianças carentes", "geral", 3),
    (9, 2, "Colaborar em ações organizadas por outras instituições de serviço", "geral", 4),

    # == Bloco 10: Democracia ==
    (10, 1, "Participar de votação sobre atividade ou regra da alcateia e respeitar o resultado", "geral", 1),
    (10, 1, "Representar a matilha em reunião maior ou cerimônia da alcateia", "geral", 2),
    (10, 2, "Visitar a sede administrativa de qualquer um dos três poderes e explicar a importância desta forma de governo", "geral", 1),
    (10, 2, "Conhecer a estrutura do grupo escoteiro ou seção autônoma e participar de uma Assembleia da UEL", "geral", 2),
    (10, 2, "Participar ativamente de um fórum de jovens do grupo escoteiro", "geral", 3),
    (10, 2, "Aprender e compartilhar sobre a história do voto e da democracia no Brasil", "geral", 4),

    # == Bloco 11: Herança Cultural ==
    (11, 1, "Pesquisar e apresentar tradição ou folclore da sua região para a alcateia", "geral", 1),
    (11, 1, "Participar de festa típica da região ou evento cultural da comunidade", "geral", 2),
    (11, 1, "Confeccionar artesanato típico da sua região e apresentar seu significado", "geral", 3),
    (11, 1, "Criar e apresentar esquete sobre lenda ou história do folclore brasileiro no Fogo de Conselho", "geral", 4),
    (11, 1, "Cantar o Hino Nacional corretamente e conhecer os símbolos nacionais", "geral", 5),
    (11, 2, "Desenvolver sua 'Árvore Genealógica', pesquisando seu sobrenome, significado e a história dos seus antepassados, e apresentá-la para sua patrulha", "geral", 1),
    (11, 2, "Participar das cerimônias com os símbolos nacionais e cantar o Hino Nacional corretamente", "geral", 2),
    (11, 2, "Apresentar para sua patrulha ou tropa histórias de mulheres que se destacaram em nosso país", "geral", 3),
    (11, 2, "Participar, com sua patrulha, de uma comemoração ou festa típica da sua região", "geral", 4),
    (11, 2, "Participar, com sua patrulha, de um safari fotográfico em sua cidade, identificando os locais de importância histórica", "geral", 5),
    (11, 2, "Participar de um jantar festivo representando um estado diferente do seu", "geral", 6),
    (11, 2, "Aplicar jogos e atividades típicas da sua região", "geral", 7),
    (11, 2, "Visitar museus, centros culturais ou pontos históricos locais para conhecer o patrimônio da região", "geral", 8),
    (11, 2, "Investigar lendas, histórias ou personagens do folclore brasileiro e dramatizá-los em esquetes no Fogo de Conselho", "geral", 9),
    (11, 2, "Aplicar canções e danças típicas do Brasil", "geral", 10),
    (11, 2, "Confeccionar artesanato típico de alguma região do Brasil", "geral", 11),
    (11, 2, "Apresentar a cultura da sua cidade em um evento regional ou nacional, como feira das cidades ou noite folclórica", "geral", 12),

    # == Bloco 12: Promoção da Paz ==
    (12, 1, "Participar de atividade que envolva respeito a diferentes culturas ou religiões", "geral", 1),
    (12, 1, "Criar material (cartaz, vídeo ou conto) sobre importância da paz", "geral", 2),
    (12, 1, "Participar de atividade com outra alcateia ou grupo escoteiro e refletir sobre Fraternidade Escoteira", "geral", 3),
    (12, 1, "Visitar local de culto diferente do seu e conhecer costumes e rituais", "geral", 4),
    (12, 1, "Ouvir relato de pessoa de cultura diferente da sua e apresentar o que aprendeu", "geral", 5),
    (12, 2, "Convidar a patrulha a cooperar em ações organizadas por uma comunidade em favor de pessoas vulneráveis", "geral", 1),
    (12, 2, "Participar de uma excursão com sua patrulha ou tropa visitando diferentes templos e conhecendo um pouco mais sobre cada religião", "geral", 2),
    (12, 2, "Participar de eventos de trocas culturais entre jovens de diferentes origens para estimular o respeito mútuo", "geral", 3),
    (12, 2, "Participar de uma atividade com outro grupo escoteiro ou seção autônoma e refletir sobre o que é Fraternidade Mundial Escoteira", "geral", 4),
    (12, 2, "Conhecer as diferentes denominações de fé e crença de amigos da patrulha, tropa, escola e comunidade", "geral", 5),
    (12, 2, "Promover uma campanha que incentive atitudes de respeito e cooperação entre todos", "geral", 6),
    (12, 2, "Convidar representantes de diferentes crenças para compartilhar experiências e responder perguntas da tropa", "geral", 7),
    (12, 2, "Criar com sua patrulha ou seção um calendário de celebrações religiosas das diferentes denominações ali presentes", "geral", 8),

    # == Bloco 13: Valores ==
    (13, 1, "Praticar uma boa ação diária por uma semana e reportar ao grupo", "geral", 1),
    (13, 1, "Explicar o significado da Promessa do Lobinho para um novo membro", "geral", 2),
    (13, 1, "Participar da cerimônia de Promessa de um companheiro e apoiá-lo na preparação", "geral", 3),
    (13, 1, "Conhecer e cantar o Canto dos Lobinhos", "geral", 4),
    (13, 1, "Refletir sobre um valor escoteiro vivenciado em acampamento ou atividade", "geral", 5),
    (13, 2, "Participar da avaliação da sua Progressão Pessoal e dos companheiros da patrulha", "geral", 1),
    (13, 2, "Explicar o significado da Lei e da Promessa Escoteira aos novos membros da patrulha", "geral", 2),
    (13, 2, "Auxiliar um companheiro de patrulha a realizar sua Promessa Escoteira", "geral", 3),
    (13, 2, "Explicar aos novos membros da patrulha os significados da flor-de-lis e da Saudação Escoteira", "geral", 4),
    (13, 2, "Conhecer e cantar o Hino Alerta", "geral", 5),

    # == Bloco 14: Cuidado com o Corpo ==
    (14, 1, "Medir sua altura e peso e acompanhar evolução ao longo das atividades", "geral", 1),
    (14, 1, "Participar de atividade sobre higiene pessoal e cuidados básicos de saúde", "geral", 2),
    (14, 1, "Realizar percurso de obstáculos desenvolvendo agilidade e coordenação motora", "geral", 3),
    (14, 1, "Participar de simulação de atendimento a pequeno acidente com colegas", "geral", 4),
    (14, 2, "Conhecer as medidas do seu corpo (palmo, envergadura, passo simples e duplo) e aplicá-las durante uma excursão", "geral", 1),
    (14, 2, "Participar de atividade, oficina ou palestra sobre malefícios de anorexia, bulimia, drogas, álcool, cigarro e cigarros eletrônicos", "geral", 2),
    (14, 2, "Saber contato dos órgãos de emergência e saber como informar os sinais vitais e situação da vítima", "geral", 3),
    (14, 2, "Participar de uma simulação de acidente e atuar em conjunto com a sua patrulha", "geral", 4),
    (14, 2, "Proteger-se do sol e do frio durante as atividades, identificando casos de desidratação e insolação, e respeitar os limites do seu corpo", "geral", 5),
    (14, 2, "Demonstrar como ajudar uma pessoa em casos de obstrução das vias aéreas e convulsões", "geral", 6),
    (14, 2, "Conhecer os itens que compõem a caixa de primeiros socorros da patrulha e mantê-la organizada", "geral", 7),
    (14, 2, "Saber agir em casos de hemorragia", "geral", 8),

    # == Bloco 15: Espiritualidade ==
    (15, 1, "Participar de momento de reflexão ou oração de agradecimento em atividade da alcateia", "geral", 1),
    (15, 1, "Representar artisticamente símbolo de religião ou crença", "geral", 2),
    (15, 1, "Fazer leitura de texto de sua crença para o grupo", "geral", 3),
    (15, 1, "Criar mandala ou atividade de gratidão sobre coisas da vida e da natureza", "geral", 4),
    (15, 2, "Fazer reflexões espirituais rotineiras na tropa ou patrulha, ao ar livre", "geral", 1),
    (15, 2, "Apresentar um pequeno relato à patrulha ou tropa sobre os ensinamentos de sua crença ou religião", "geral", 2),
    (15, 2, "Auxiliar na realização de uma celebração de sua comunidade religiosa", "geral", 3),
    (15, 2, "Celebrar sua crença ou religião regularmente", "geral", 4),
    (15, 2, "Colaborar na organização de um culto interconfessional em uma atividade escoteira", "geral", 5),
    (15, 2, "Participar de um momento de reflexão e conexão com um ambiente natural em que possa apreciar e agradecer a beleza do mundo natural", "geral", 6),

    # == Bloco 16: Hábitos Saudáveis ==
    (16, 1, "Praticar atividade física regularmente por um mês e reportar ao grupo", "geral", 1),
    (16, 1, "Dormir adequadamente por uma semana e registrar horários", "geral", 2),
    (16, 1, "Preparar refeição saudável para a matilha em atividade", "geral", 3),
    (16, 1, "Participar de caminhada, circuito ou gincana esportiva da alcateia", "geral", 4),
    (16, 1, "Identificar alimentos saudáveis e não saudáveis em embalagens de supermercado", "geral", 5),
    (16, 2, "Manter hábitos de higiene pessoal, utilizar o vestuário ou uniforme adequadamente, demonstrando aplicação correta dos distintivos", "geral", 1),
    (16, 2, "Contribuir para manter a sede do grupo e canto de patrulha em ordem e em perfeito estado de conservação", "geral", 2),
    (16, 2, "Montar um cronograma semanal, equilibrando estudos, responsabilidades e momentos de lazer", "geral", 3),
    (16, 2, "Praticar uma atividade física regularmente", "geral", 4),
    (16, 2, "Promover um piquenique com alimentos saudáveis com sua patrulha ou tropa", "geral", 5),
    (16, 2, "Manter adequada rotina de sono e alimentação saudável", "geral", 6),
    (16, 2, "Saber o que são as indicações de rótulos, o que são gorduras saturadas, conservantes, corantes além dos selos de advertência", "geral", 7),
    (16, 2, "Arrumar e limpar seu quarto e contribuir nas rotinas da casa", "geral", 8),

    # == Bloco 17: Saúde Mental ==
    (17, 1, "Participar de atividade de relaxamento ou meditação guiada na alcateia", "geral", 1),
    (17, 1, "Fazer atividade offline de bem-estar por uma semana e apresentar para o grupo", "geral", 2),
    (17, 1, "Criar diário de gratidão registrando momentos positivos do dia por uma semana", "geral", 3),
    (17, 1, "Participar de jogo de tabuleiro, RPG ou atividade de lazer analógico com a alcateia", "geral", 4),
    (17, 2, "Participar de uma atividade sobre a importância do autocuidado e da saúde mental", "geral", 1),
    (17, 2, "Conduzir uma sessão de relaxamento como yoga, meditação, caminhadas silenciosas na natureza, alongamentos para sua patrulha ou tropa", "geral", 2),
    (17, 2, "Organizar sua rotina de atividades semanais, considerando a importância do equilíbrio entre as atividades do mundo digital e real e realizar uma atividade de bem-estar offline", "geral", 3),
    (17, 2, "Propor momentos de descontração com a família ao ar livre, evitando o uso da tecnologia e compartilhar como foi a experiência", "geral", 4),
    (17, 2, "Participar com sua patrulha de uma atividade que promova o contato com os sentidos e momentos de equilíbrio emocional (trilha sensorial, pintura livre, roda de canções, observação de céu ou fogueira)", "geral", 5),

    # == Bloco 18: Vínculos Saudáveis ==
    (18, 1, "Ajudar um companheiro mais novo em atividade da alcateia", "geral", 1),
    (18, 1, "Convidar colega de escola ou vizinhança para conhecer a alcateia", "geral", 2),
    (18, 1, "Participar de atividade com alcateia de outra UEL", "geral", 3),
    (18, 1, "Demonstrar saudação escoteira e apresentar o escotismo para alguém de fora", "geral", 4),
    (18, 1, "Resolver, com ajuda, uma situação de conflito com companheiro de forma pacífica", "geral", 5),
    (18, 2, "Participar de jogos com a patrulha ou a tropa, respeitando as regras e seus participantes", "geral", 1),
    (18, 2, "Organizar uma atividade de patrulha em sua casa ou na casa de um membro da patrulha", "geral", 2),
    (18, 2, "Ensinar uma canção escoteira a outros escoteiros", "geral", 3),
    (18, 2, "Ajudar outro membro da UEL a conquistar uma especialidade ou insígnias", "geral", 4),
    (18, 2, "Propor metas para melhorar a convivência na vida na patrulha e na tropa", "geral", 5),
    (18, 2, "Participar de uma atividade entre diferentes grupos escoteiros ou atividade regional ou nacional", "geral", 6),
    (18, 2, "Acolher os novos integrantes da patrulha", "geral", 7),
    (18, 2, "Assumir tarefas domésticas para melhorar a convivência em casa", "geral", 8),
    (18, 2, "Participar de uma atividade da tropa com a família ou responsáveis", "geral", 9),
    (18, 2, "Convidar um colega da mesma faixa etária para participar de um Fogo de Conselho, integrado a sua patrulha e com o devido 'Registro de Visitante'", "geral", 10),
]

# ---------------------------------------------------------------------------
# Dados: Especialidades por bloco — (bloco_id, ramo_id, nome, tipo, nivel_minimo)
# tipo: 'substitui' = substitui variáveis; 'complemento' = sugestão adicional
# ---------------------------------------------------------------------------

BLOCO_ESPECIALIDADES = [
    # Bloco 1 — Aprendizagem Contínua
    (1, 1, "Insígnia do Aprender", "substitui", 1),  # Note: insígnia vai em bloco_insignias, mas também listamos aqui o nome
    # Especialidades complemento Lobinho (bloco 1)
    (1, 1, "Aeromodelismo", "complemento", 1),
    (1, 1, "Astronomia", "complemento", 1),
    (1, 1, "Comunicações", "complemento", 1),
    (1, 1, "Informática", "complemento", 1),
    (1, 1, "Jornalismo", "complemento", 1),
    (1, 1, "Matemática", "complemento", 1),
    (1, 1, "Programação", "complemento", 1),
    (1, 1, "Robótica", "complemento", 1),
    # Especialidades complemento Escoteiro
    (1, 2, "Aeromodelismo", "complemento", 1),
    (1, 2, "Arquitetura e Urbanismo", "complemento", 1),
    (1, 2, "Astronáutica", "complemento", 1),
    (1, 2, "Astronomia", "complemento", 1),
    (1, 2, "Biblioteconomia", "complemento", 1),
    (1, 2, "Cartografia", "complemento", 1),
    (1, 2, "Comunicações", "complemento", 1),
    (1, 2, "Confeitaria", "complemento", 1),
    (1, 2, "Construção Civil", "complemento", 1),
    (1, 2, "Criptografia", "complemento", 1),
    (1, 2, "Culinária", "complemento", 1),
    (1, 2, "Design de Interiores", "complemento", 1),
    (1, 2, "E-Sports", "complemento", 1),
    (1, 2, "Etiqueta", "complemento", 1),
    (1, 2, "Ferramentas de Corte", "complemento", 1),
    (1, 2, "Fiscalização de Pátio de Aeródromo", "complemento", 1),
    (1, 2, "Informática", "complemento", 1),
    (1, 2, "Investimentos", "complemento", 1),
    (1, 2, "Jornalismo", "complemento", 1),
    (1, 2, "Manicure", "complemento", 1),
    (1, 2, "Manutenção Elétrica", "complemento", 1),
    (1, 2, "Marcenaria", "complemento", 1),
    (1, 2, "Marinharia", "complemento", 1),
    (1, 2, "Matemática", "complemento", 1),
    (1, 2, "Mecânica Aérea", "complemento", 1),
    (1, 2, "Mecânica de Automóveis", "complemento", 1),
    (1, 2, "Navegação Aérea", "complemento", 1),
    (1, 2, "Observação Aérea", "complemento", 1),
    (1, 2, "Planador", "complemento", 1),
    (1, 2, "Prevenção de Incêndio", "complemento", 1),
    (1, 2, "Produção Gráfica", "complemento", 1),
    (1, 2, "Programação", "complemento", 1),
    (1, 2, "Química", "complemento", 1),
    (1, 2, "Radioamateurismo", "complemento", 1),
    (1, 2, "Radioescuta", "complemento", 1),
    (1, 2, "Redes de Computadores", "complemento", 1),
    (1, 2, "Segurança e Emergência Náutica", "complemento", 1),
    (1, 2, "Segurança no Trânsito", "complemento", 1),
    (1, 2, "Simulação Aérea", "complemento", 1),
    (1, 2, "Sinalização", "complemento", 1),
    (1, 2, "Técnica Aeronáutica", "complemento", 1),
    (1, 2, "Vendas", "complemento", 1),
    (1, 2, "Web Design", "complemento", 1),

    # Bloco 2 — Autonomia e Liderança
    (2, 1, "Empreendedorismo", "substitui", 1),
    (2, 1, "Educação Financeira", "substitui", 1),
    (2, 1, "Administração", "substitui", 1),
    (2, 1, "Reparos Domésticos", "substitui", 1),
    (2, 1, "Oratória", "substitui", 1),
    (2, 2, "Empreendedorismo", "substitui", 1),
    (2, 2, "Educação Financeira", "substitui", 1),
    (2, 2, "Administração", "substitui", 1),
    (2, 2, "Reparos Domésticos", "substitui", 1),
    (2, 2, "Oratória", "substitui", 1),

    # Bloco 3 — Criatividade e Inovação
    (3, 1, "Arte Digital", "substitui", 1),
    (3, 1, "Artes Visuais", "substitui", 1),
    (3, 1, "Artesanato", "substitui", 1),
    (3, 1, "Comédia", "substitui", 1),
    (3, 1, "Costura e Estilismo", "substitui", 1),
    (3, 1, "Encadernação", "substitui", 1),
    (3, 1, "Grafite", "substitui", 1),
    (3, 1, "HQ", "substitui", 1),
    (3, 1, "Maquete", "substitui", 1),
    (3, 1, "Pintura", "substitui", 1),
    (3, 1, "Propaganda e Marketing", "substitui", 1),
    (3, 1, "Robótica", "substitui", 1),
    (3, 1, "Videomaker", "substitui", 1),
    (3, 2, "Arte Digital", "substitui", 1),
    (3, 2, "Artes Visuais", "substitui", 1),
    (3, 2, "Artesanato", "substitui", 1),
    (3, 2, "Comédia", "substitui", 1),
    (3, 2, "Costura e Estilismo", "substitui", 1),
    (3, 2, "Encadernação", "substitui", 1),
    (3, 2, "Grafite", "substitui", 1),
    (3, 2, "HQ", "substitui", 1),
    (3, 2, "Maquete", "substitui", 1),
    (3, 2, "Pintura", "substitui", 1),
    (3, 2, "Propaganda e Marketing", "substitui", 1),
    (3, 2, "Robótica", "substitui", 1),
    (3, 2, "Videomaker", "substitui", 1),

    # Bloco 5 — Consumo Responsável
    (5, 1, "Horticultura", "substitui", 1),
    (5, 1, "Agricultura", "complemento", 1),
    (5, 1, "Aquicultura", "complemento", 1),
    (5, 1, "Energia", "complemento", 1),
    (5, 2, "Horticultura", "substitui", 1),
    (5, 2, "Agricultura", "complemento", 1),
    (5, 2, "Aquicultura", "complemento", 1),
    (5, 2, "Energia", "complemento", 1),

    # Bloco 6 — Mudanças Climáticas
    (6, 1, "Meteorologia", "substitui", 1),
    (6, 1, "Energia", "complemento", 1),
    (6, 1, "Agricultura", "complemento", 1),
    (6, 1, "Jardinagem e Paisagismo", "complemento", 1),
    (6, 2, "Meteorologia", "substitui", 1),
    (6, 2, "Energia", "complemento", 1),
    (6, 2, "Agricultura", "complemento", 1),
    (6, 2, "Jardinagem e Paisagismo", "complemento", 1),

    # Bloco 7 — Preservação da Biodiversidade
    (7, 1, "Ciências da Terra", "substitui", 1),
    (7, 1, "Zoologia", "substitui", 1),
    (7, 1, "Oceanologia", "substitui", 1),
    (7, 1, "Botânica", "substitui", 1),
    (7, 1, "Animais Venenosos e Peçonhentos", "complemento", 1),
    (7, 1, "Aquarismo", "complemento", 1),
    (7, 1, "Biologia", "complemento", 1),
    (7, 1, "Cuidados com Animais de Estimação", "complemento", 1),
    (7, 1, "Entomologia", "complemento", 1),
    (7, 1, "Geologia", "complemento", 1),
    (7, 1, "Meliponicultura", "complemento", 1),
    (7, 1, "Microbiologia", "complemento", 1),
    (7, 2, "Ciências da Terra", "substitui", 1),
    (7, 2, "Zoologia", "substitui", 1),
    (7, 2, "Oceanologia", "substitui", 1),
    (7, 2, "Botânica", "substitui", 1),
    (7, 2, "Animais Venenosos e Peçonhentos", "complemento", 1),
    (7, 2, "Aquarismo", "complemento", 1),
    (7, 2, "Biologia", "complemento", 1),
    (7, 2, "Cuidados com Animais de Estimação", "complemento", 1),
    (7, 2, "Entomologia", "complemento", 1),
    (7, 2, "Geologia", "complemento", 1),
    (7, 2, "Meliponicultura", "complemento", 1),
    (7, 2, "Microbiologia", "complemento", 1),

    # Bloco 8 — Vida ao Ar Livre
    (8, 1, "Acampamento", "substitui", 1),
    (8, 1, "Excursões", "substitui", 1),
    (8, 1, "Montanhismo", "substitui", 1),
    (8, 1, "Pioneria", "substitui", 1),
    (8, 1, "Sobrevivência", "substitui", 1),
    (8, 1, "Corrida de Orientação", "complemento", 1),
    (8, 1, "Culinária Mateira", "complemento", 1),
    (8, 1, "Escalada", "complemento", 1),
    (8, 1, "Espeleoturismo", "complemento", 1),
    (8, 1, "Ferramentas de Corte", "complemento", 1),
    (8, 1, "Lenhador", "complemento", 1),
    (8, 1, "Mountain Bike", "complemento", 1),
    (8, 1, "Pesca", "complemento", 1),
    (8, 1, "Rastreamento", "complemento", 1),
    (8, 2, "Acampamento", "substitui", 1),
    (8, 2, "Excursões", "substitui", 1),
    (8, 2, "Montanhismo", "substitui", 1),
    (8, 2, "Pioneria", "substitui", 1),
    (8, 2, "Sobrevivência", "substitui", 1),
    (8, 2, "Corrida de Orientação", "complemento", 1),
    (8, 2, "Culinária Mateira", "complemento", 1),
    (8, 2, "Escalada", "complemento", 1),
    (8, 2, "Espeleoturismo", "complemento", 1),
    (8, 2, "Ferramentas de Corte", "complemento", 1),
    (8, 2, "Lenhador", "complemento", 1),
    (8, 2, "Mountain Bike", "complemento", 1),
    (8, 2, "Pesca", "complemento", 1),
    (8, 2, "Rastreamento", "complemento", 1),

    # Bloco 9 — Comunidade
    (9, 1, "Defesa Civil", "substitui", 1),
    (9, 1, "Inclusão", "complemento", 1),
    (9, 1, "Libras", "complemento", 1),
    (9, 2, "Defesa Civil", "substitui", 1),
    (9, 2, "Inclusão", "complemento", 1),
    (9, 2, "Libras", "complemento", 1),

    # Bloco 10 — Democracia
    (10, 1, "Prevenção de Fake News", "complemento", 1),
    (10, 1, "Geografia", "complemento", 1),
    (10, 1, "Paz e Justiça", "complemento", 1),
    (10, 2, "Prevenção de Fake News", "complemento", 1),
    (10, 2, "Geografia", "complemento", 1),
    (10, 2, "Paz e Justiça", "complemento", 1),

    # Bloco 11 — Herança Cultural
    (11, 1, "Brasilidades", "substitui", 1),
    (11, 1, "Genealogia", "substitui", 1),
    (11, 1, "Informações Turísticas", "substitui", 1),
    (11, 1, "Tradições dos Povos Indígenas", "substitui", 1),
    (11, 1, "Anime", "complemento", 1),
    (11, 1, "Arqueologia", "complemento", 1),
    (11, 1, "Arte da Marinharia", "complemento", 1),
    (11, 1, "Artes Cênicas", "complemento", 1),
    (11, 1, "Capoeira", "complemento", 1),
    (11, 1, "Civilizações da Antiguidade", "complemento", 1),
    (11, 1, "Cosplay", "complemento", 1),
    (11, 1, "Culinária Típica", "complemento", 1),
    (11, 1, "Danças Folclóricas", "complemento", 1),
    (11, 1, "História do Escotismo", "complemento", 1),
    (11, 1, "História Local", "complemento", 1),
    (11, 1, "Literatura", "complemento", 1),
    (11, 1, "Mitologias", "complemento", 1),
    (11, 1, "Museologia", "complemento", 1),
    (11, 1, "Origami", "complemento", 1),
    (11, 1, "Paleontologia", "complemento", 1),
    (11, 1, "Poesia", "complemento", 1),
    (11, 2, "Brasilidades", "substitui", 1),
    (11, 2, "Genealogia", "substitui", 1),
    (11, 2, "Informações Turísticas", "substitui", 1),
    (11, 2, "Tradições dos Povos Indígenas", "substitui", 1),
    (11, 2, "Anime", "complemento", 1),
    (11, 2, "Arqueologia", "complemento", 1),
    (11, 2, "Arte da Marinharia", "complemento", 1),
    (11, 2, "Artes Cênicas", "complemento", 1),
    (11, 2, "Capoeira", "complemento", 1),
    (11, 2, "Civilizações da Antiguidade", "complemento", 1),
    (11, 2, "Cosplay", "complemento", 1),
    (11, 2, "Culinária Típica", "complemento", 1),
    (11, 2, "Danças Folclóricas", "complemento", 1),
    (11, 2, "História Aeroespacial", "complemento", 1),
    (11, 2, "História da Aviação", "complemento", 1),
    (11, 2, "História Brasileira", "complemento", 1),
    (11, 2, "História da Arte", "complemento", 1),
    (11, 2, "História do Escotismo", "complemento", 1),
    (11, 2, "História Local", "complemento", 1),
    (11, 2, "História Marítima", "complemento", 1),
    (11, 2, "Literatura", "complemento", 1),
    (11, 2, "Mitologias", "complemento", 1),
    (11, 2, "Museologia", "complemento", 1),
    (11, 2, "Origami", "complemento", 1),
    (11, 2, "Paleontologia", "complemento", 1),
    (11, 2, "Poesia", "complemento", 1),

    # Bloco 12 — Promoção da Paz
    (12, 1, "Geografia", "complemento", 1),
    (12, 1, "História Mundial", "complemento", 1),
    (12, 1, "Inclusão", "complemento", 1),
    (12, 1, "Libras", "complemento", 1),
    (12, 1, "Línguas", "complemento", 1),
    (12, 1, "Paz e Justiça", "complemento", 1),
    (12, 2, "Geografia", "complemento", 1),
    (12, 2, "História Mundial", "complemento", 1),
    (12, 2, "Inclusão", "complemento", 1),
    (12, 2, "Libras", "complemento", 1),
    (12, 2, "Línguas", "complemento", 1),
    (12, 2, "Paz e Justiça", "complemento", 1),

    # Bloco 13 — Valores
    (13, 1, "Escotismo Mundial", "substitui", 1),
    (13, 1, "Fogo de Conselho", "complemento", 1),
    (13, 1, "História do Escotismo", "complemento", 1),
    (13, 2, "Escotismo Mundial", "substitui", 1),
    (13, 2, "Fogo de Conselho", "complemento", 1),
    (13, 2, "História do Escotismo", "complemento", 1),

    # Bloco 14 — Cuidado com o Corpo
    (14, 1, "Anatomia Humana", "substitui", 1),
    (14, 1, "Prevenção em Saúde", "substitui", 1),
    (14, 1, "Primeiros Socorros", "substitui", 1),
    (14, 1, "Babá", "complemento", 1),
    (14, 1, "Cuidados com Idosos", "complemento", 1),
    (14, 1, "Vigilância Epidemiológica", "complemento", 1),
    (14, 1, "Salvamento", "complemento", 1),
    (14, 1, "Segurança", "complemento", 1),
    (14, 2, "Anatomia Humana", "substitui", 1),
    (14, 2, "Prevenção em Saúde", "substitui", 1),
    (14, 2, "Primeiros Socorros", "substitui", 1),
    (14, 2, "Babá", "complemento", 1),
    (14, 2, "Cuidados com Idosos", "complemento", 1),
    (14, 2, "Vigilância Epidemiológica", "complemento", 1),
    (14, 2, "Salvamento", "complemento", 1),
    (14, 2, "Segurança", "complemento", 1),

    # Bloco 15 — Espiritualidade
    (15, 1, "Diálogo inter-religioso", "substitui", 1),
    (15, 2, "Yoga", "substitui", 1),

    # Bloco 16 — Hábitos Saudáveis
    (16, 1, "Noções Desportivas", "substitui", 1),
    (16, 1, "Nutrição", "substitui", 1),
    (16, 1, "Artes Marciais", "complemento", 1),
    (16, 1, "Canoagem", "complemento", 1),
    (16, 1, "Ciclismo", "complemento", 1),
    (16, 1, "Natação", "complemento", 1),
    (16, 1, "Yoga", "complemento", 1),
    (16, 2, "Noções Desportivas", "substitui", 1),
    (16, 2, "Nutrição", "substitui", 1),
    (16, 2, "Artes Marciais", "complemento", 1),
    (16, 2, "Canoagem", "complemento", 1),
    (16, 2, "Ciclismo", "complemento", 1),
    (16, 2, "Corrida de Rua", "complemento", 1),
    (16, 2, "Culinária Vegetariana", "complemento", 1),
    (16, 2, "Cuidados Bucais", "complemento", 1),
    (16, 2, "Dança", "complemento", 1),
    (16, 2, "Desportos Inclusivos", "complemento", 1),
    (16, 2, "Esportes de Quadra", "complemento", 1),
    (16, 2, "Futebol", "complemento", 1),
    (16, 2, "Ginásticas", "complemento", 1),
    (16, 2, "Hipismo", "complemento", 1),
    (16, 2, "Mergulho", "complemento", 1),
    (16, 2, "Natação", "complemento", 1),
    (16, 2, "Patinação", "complemento", 1),
    (16, 2, "Plantas Medicinais", "complemento", 1),
    (16, 2, "Remo", "complemento", 1),
    (16, 2, "Skateboard", "complemento", 1),
    (16, 2, "Slackline", "complemento", 1),
    (16, 2, "Técnicas Verticais", "complemento", 1),
    (16, 2, "Tênis", "complemento", 1),
    (16, 2, "Tênis de Mesa", "complemento", 1),
    (16, 2, "Tiro com Arco", "complemento", 1),
    (16, 2, "Triatlo", "complemento", 1),
    (16, 2, "Vela", "complemento", 1),
    (16, 2, "Yoga", "complemento", 1),

    # Bloco 17 — Saúde Mental
    (17, 1, "Prevenção aos Vícios", "substitui", 1),
    (17, 1, "Canto", "complemento", 1),
    (17, 1, "Coleções", "complemento", 1),
    (17, 1, "Cubo Mágico", "complemento", 1),
    (17, 1, "Expressão Musical", "complemento", 1),
    (17, 1, "Ioiô", "complemento", 1),
    (17, 1, "Jogos de Cartas Colecionáveis", "complemento", 1),
    (17, 1, "Jogos de Tabuleiro", "complemento", 1),
    (17, 1, "Mágica e Ilusionismo", "complemento", 1),
    (17, 1, "Pipas", "complemento", 1),
    (17, 1, "Plastimodelismo", "complemento", 1),
    (17, 1, "Quebra-Cabeças", "complemento", 1),
    (17, 1, "RPG", "complemento", 1),
    (17, 1, "Xadrez", "complemento", 1),
    (17, 2, "Prevenção aos Vícios", "substitui", 1),
    (17, 2, "Canto", "complemento", 1),
    (17, 2, "Coleções", "complemento", 1),
    (17, 2, "Cubo Mágico", "complemento", 1),
    (17, 2, "Expressão Musical", "complemento", 1),
    (17, 2, "Ioiô", "complemento", 1),
    (17, 2, "Jogos de Cartas Colecionáveis", "complemento", 1),
    (17, 2, "Jogos de Tabuleiro", "complemento", 1),
    (17, 2, "Mágica e Ilusionismo", "complemento", 1),
    (17, 2, "Pipas", "complemento", 1),
    (17, 2, "Plastimodelismo", "complemento", 1),
    (17, 2, "Quebra-Cabeças", "complemento", 1),
    (17, 2, "RPG", "complemento", 1),
    (17, 2, "Xadrez", "complemento", 1),

    # Bloco 18 — Vínculos Saudáveis
    (18, 1, "Prevenção ao Bullying", "substitui", 1),
    (18, 2, "Prevenção ao Bullying", "substitui", 1),
]

# ---------------------------------------------------------------------------
# Dados: Insígnias por bloco — (bloco_id, ramo_id, nome, tipo)
# ---------------------------------------------------------------------------

BLOCO_INSIGNIAS = [
    # Bloco 1
    (1, 1, "Insígnia do Aprender", "substitui"),
    (1, 2, "Insígnia do Aprender", "substitui"),
    (1, 2, "Insígnia da Modalidade do Mar - Grumete", "substitui"),
    (1, 2, "Insígnia da Modalidade do Ar - Aviador", "substitui"),
    # Bloco 5 — Consumo Responsável
    (5, 1, "Reduzir, Reciclar, Reutilizar", "substitui"),
    (5, 2, "Reduzir, Reciclar, Reutilizar", "substitui"),
    # Bloco 6 — Mudanças Climáticas
    (6, 1, "Escoteiros pela Energia Solar", "substitui"),
    (6, 2, "Escoteiros pela Energia Solar", "substitui"),
    # Bloco 7 — Preservação da Biodiversidade
    (7, 1, "Campeões da Natureza", "substitui"),
    (7, 2, "Campeões da Natureza", "substitui"),
    # Bloco 9 — Comunidade
    (9, 1, "Mensageiros da Paz", "substitui"),
    (9, 1, "Insígnia da Boa Ação", "substitui"),
    (9, 2, "Mensageiros da Paz", "substitui"),
    (9, 2, "Insígnia da Boa Ação", "substitui"),
    # Bloco 11 — Herança Cultural (nenhuma insígnia explícita)
    # Bloco 12 — Promoção da Paz
    (12, 1, "Insígnia da Lusofonia", "substitui"),
    (12, 1, "Insígnia do Cone Sul", "substitui"),
    (12, 1, "Diálogos pela Paz", "substitui"),
    (12, 2, "Insígnia da Lusofonia", "substitui"),
    (12, 2, "Insígnia do Cone Sul", "substitui"),
    (12, 2, "Diálogos pela Paz", "substitui"),
    # Bloco 15 — Espiritualidade
    (15, 1, "Yoga", "substitui"),
    (15, 2, "Diálogo Inter-religioso", "substitui"),
]

# ---------------------------------------------------------------------------
# Dados: Reconhecimentos de Ramo
# ---------------------------------------------------------------------------

RECONHECIMENTOS = [
    {
        "id": 1, "ramo_id": 1,
        "nome": "Cruzeiro do Sul",
        "slug": "cruzeiro-do-sul",
        "idade_limite_anos": 11.0,
        "descricao": "Reconhecimento de conclusão do Ramo Lobinho. Requer conclusão dos 18 blocos, Caminho do Caçador, autoavaliação e avaliação dos pares (Roca de Conselho). Recomendado por volta dos 10 anos, obrigatoriamente antes dos 11.",
        "fonte_pagina": "319",
    },
    {
        "id": 2, "ramo_id": 2,
        "nome": "Lis de Ouro",
        "slug": "lis-de-ouro",
        "idade_limite_anos": 15.0,
        "descricao": "Reconhecimento de conclusão do Ramo Escoteiro. Requer conclusão dos 18 blocos, Jornada de Travessia (Percurso de Gilwell ≥12 km + trecho ≥2 km + pernoite + orientação), autoavaliação e avaliação dos pares/Corte de Honra. Antes dos 15 anos.",
        "fonte_pagina": "304",
    },
]

RECONHECIMENTO_REQUISITOS = [
    # Cruzeiro do Sul
    (1, "bloco", "Concluir todos os 18 Blocos de Aprendizagem conforme Manual do Escotista", 1),
    (1, "desafio", "Vivenciar o Caminho do Caçador: trilha ≥1 km por sinais de pista com obstáculos, orientação pela constelação do Cruzeiro do Sul à noite, montar e acender fogueira + refeição simples/bebida quente, preparar mochila autonomamente, reflexão final", 2),
    (1, "avaliacao", "Autoavaliação", 3),
    (1, "avaliacao", "Avaliação dos pares na Roca de Conselho", 4),
    (1, "administrativo", "Homologação pela diretoria da UEL; solicitação de certificado, distintivo e barreta via Sistema Paxtu", 5),
    # Lis de Ouro
    (2, "bloco", "Concluir todos os 18 Blocos de Aprendizagem", 1),
    (2, "desafio", "Concluir a Jornada de Travessia: Percurso de Gilwell ≥12 km (trecho obrigatório ≥2 km) com pernoite e exercício de orientação", 2),
    (2, "avaliacao", "Autoavaliação", 3),
    (2, "avaliacao", "Avaliação dos pares e Corte de Honra", 4),
]


# ---------------------------------------------------------------------------
# Geração do banco
# ---------------------------------------------------------------------------

def build_db() -> None:
    DB_OUT.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA)
    cur = conn.cursor()

    # Ramos
    for r in RAMOS:
        cur.execute(
            "INSERT INTO ramos(id, nome, slug, faixa_etaria, grupo_secao) VALUES (?,?,?,?,?)",
            (r["id"], r["nome"], r["slug"], r["faixa_etaria"], r["grupo_secao"]),
        )

    # Eixos
    for e in EIXOS:
        cur.execute(
            "INSERT INTO eixos(id, nome, slug, ordem, cor_hex, descricao) VALUES (?,?,?,?,?,?)",
            (e["id"], e["nome"], e["slug"], e["ordem"], e["cor_hex"], e["descricao"]),
        )

    # Etapas
    for et in ETAPAS:
        cur.execute(
            "INSERT INTO etapas(id, ramo_id, nome, slug, ordem, blocos_cumulativos, blocos_nesta_etapa, idade_referencia) VALUES (?,?,?,?,?,?,?,?)",
            (et["id"], et["ramo_id"], et["nome"], et["slug"], et["ordem"],
             et["blocos_cumulativos"], et["blocos_nesta_etapa"], et["idade_referencia"]),
        )

    # Blocos
    for b in BLOCOS:
        cur.execute(
            "INSERT INTO blocos(id, eixo_id, nome, slug, ordem_global) VALUES (?,?,?,?,?)",
            (b["id"], b["eixo_id"], b["nome"], b["slug"], b["ordem_global"]),
        )

    # bloco_ramo_meta
    for bloco_id, ramo_id, intent, var_min, pagina in BLOCO_RAMO_META:
        cur.execute(
            "INSERT INTO bloco_ramo_meta(bloco_id, ramo_id, intencionalidade_educativa, variaveis_minimo, fonte_pagina) VALUES (?,?,?,?,?)",
            (bloco_id, ramo_id, intent, var_min, pagina),
        )

    # acoes_fixas
    for bloco_id, ramo_id, desc, modal, ordem in ACOES_FIXAS:
        cur.execute(
            "INSERT INTO acoes_fixas(bloco_id, ramo_id, descricao, modalidade, ordem) VALUES (?,?,?,?,?)",
            (bloco_id, ramo_id, desc, modal, ordem),
        )

    # acoes_variaveis
    for bloco_id, ramo_id, desc, modal, ordem in ACOES_VARIAVEIS:
        cur.execute(
            "INSERT INTO acoes_variaveis(bloco_id, ramo_id, descricao, modalidade, ordem) VALUES (?,?,?,?,?)",
            (bloco_id, ramo_id, desc, modal, ordem),
        )

    # bloco_especialidades
    for bloco_id, ramo_id, nome, tipo, nivel in BLOCO_ESPECIALIDADES:
        cur.execute(
            "INSERT INTO bloco_especialidades(bloco_id, ramo_id, especialidade_nome, tipo, nivel_minimo) VALUES (?,?,?,?,?)",
            (bloco_id, ramo_id, nome, tipo, nivel),
        )

    # bloco_insignias
    for bloco_id, ramo_id, nome, tipo in BLOCO_INSIGNIAS:
        cur.execute(
            "INSERT INTO bloco_insignias(bloco_id, ramo_id, insignia_nome, tipo) VALUES (?,?,?,?)",
            (bloco_id, ramo_id, nome, tipo),
        )

    # reconhecimentos
    for rec in RECONHECIMENTOS:
        cur.execute(
            "INSERT INTO reconhecimentos_ramo(id, ramo_id, nome, slug, idade_limite_anos, descricao, fonte_pagina) VALUES (?,?,?,?,?,?,?)",
            (rec["id"], rec["ramo_id"], rec["nome"], rec["slug"],
             rec["idade_limite_anos"], rec["descricao"], rec["fonte_pagina"]),
        )

    for rec_id, tipo, desc, ordem in RECONHECIMENTO_REQUISITOS:
        cur.execute(
            "INSERT INTO reconhecimento_requisitos(reconhecimento_id, tipo, descricao, ordem) VALUES (?,?,?,?)",
            (rec_id, tipo, desc, ordem),
        )

    conn.commit()

    disk = sqlite3.connect(DB_OUT)
    conn.backup(disk)
    disk.close()
    conn.close()


def report() -> None:
    conn = sqlite3.connect(DB_OUT)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM blocos")
    n_blocos = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM acoes_fixas")
    n_fixas = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM acoes_variaveis")
    n_var = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM bloco_especialidades")
    n_esp = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM bloco_insignias")
    n_ins = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM reconhecimentos_ramo")
    n_rec = cur.fetchone()[0]
    print(f"[OK] progressao_2025.sqlite gerado em {DB_OUT}")
    print(f"     {n_blocos} blocos | {n_fixas} acoes_fixas | {n_var} acoes_variaveis")
    print(f"     {n_esp} bloco_especialidades | {n_ins} bloco_insignias | {n_rec} reconhecimentos")
    for ramo_id, ramo_nome in ((1, "Lobinho"), (2, "Escoteiro")):
        cur.execute("SELECT COUNT(*) FROM bloco_ramo_meta WHERE ramo_id=?", (ramo_id,))
        n_meta = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM acoes_fixas WHERE ramo_id=?", (ramo_id,))
        n_f = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM acoes_variaveis WHERE ramo_id=?", (ramo_id,))
        n_v = cur.fetchone()[0]
        print(f"     {ramo_nome}: {n_meta}/18 blocos com meta | {n_f} fixas | {n_v} variáveis")
    conn.close()


if __name__ == "__main__":
    build_db()
    report()
