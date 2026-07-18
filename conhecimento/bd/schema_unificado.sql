-- ==========================================================
-- Schema unificado do projeto Paxtu Planner
-- Gerado em: 2026-04-27T11:16:10.459829
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


-- ----------------------------------------------------------
-- Bloco 2: Catalogo de Especialidades (prefixo logico: esp_)
-- Origem: especialidades_guia.sqlite (Guia 18a Ed. 2024-1)
-- ----------------------------------------------------------

CREATE TABLE ramos (
    id   INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE especialidades (
    id              INTEGER PRIMARY KEY,
    ramo_id         INTEGER NOT NULL REFERENCES ramos(id),
    nome            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    revisada        INTEGER DEFAULT 0,
    nova            INTEGER DEFAULT 0,
    versao          TEXT DEFAULT '',
    proponentes     TEXT DEFAULT '',
    avaliadores     TEXT DEFAULT '',
    nota_tecnica    TEXT DEFAULT '',
    nivel1_itens    INTEGER DEFAULT 0,
    nivel2_itens    INTEGER DEFAULT 0,
    nivel3_itens    INTEGER DEFAULT 0,
    total_itens     INTEGER DEFAULT 0,
    fonte           TEXT DEFAULT 'Guia de Especialidades 18a Edicao 2024',
    linha_inicio    INTEGER DEFAULT 0
);

CREATE TABLE requisitos (
    id               INTEGER PRIMARY KEY,
    especialidade_id INTEGER NOT NULL REFERENCES especialidades(id),
    posicao          INTEGER NOT NULL,
    texto            TEXT NOT NULL,
    opcional         INTEGER DEFAULT 0
);

