CREATE TABLE versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT
);

CREATE TABLE branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

CREATE TABLE stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    version_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (version_id) REFERENCES versions(id)
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);

CREATE TABLE requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    source_ref TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE specialty_sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    branch TEXT NOT NULL,
    knowledge_area TEXT NOT NULL,
    version_code TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_kind TEXT NOT NULL DEFAULT 'derived',
    source_page_hint TEXT,
    source_page_kind TEXT,
    short_description TEXT,
    full_description TEXT,
    requirements_total INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE specialty_sheet_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheet_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    guidance TEXT,
    source_ref TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (sheet_id) REFERENCES specialty_sheets(id)
);

CREATE TABLE specialty_sheet_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    note TEXT NOT NULL,
    evidence TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (step_id) REFERENCES specialty_sheet_steps(id)
);

CREATE TABLE specialty_sheet_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheet_id INTEGER NOT NULL,
    reviewer TEXT,
    review_date TEXT,
    result TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (sheet_id) REFERENCES specialty_sheets(id)
);

CREATE TABLE specialty_fichas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    especialidade_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    ramo_id INTEGER NOT NULL,
    descricao_curta TEXT,
    descricao_longa TEXT,
    fonte_pdf TEXT,
    fonte_md TEXT,
    fonte_pagina TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE specialty_ficha_passos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id INTEGER NOT NULL,
    posicao INTEGER NOT NULL,
    titulo TEXT,
    texto TEXT NOT NULL,
    obrigatorio INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (ficha_id) REFERENCES specialty_fichas(id)
);

CREATE TABLE specialty_ficha_observacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passo_id INTEGER NOT NULL,
    autor TEXT,
    texto TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY (passo_id) REFERENCES specialty_ficha_passos(id)
);

CREATE TABLE specialty_ficha_evidencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passo_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    descricao TEXT,
    created_at TEXT,
    FOREIGN KEY (passo_id) REFERENCES specialty_ficha_passos(id)
);

CREATE TABLE specialty_ficha_revisoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ficha_id INTEGER NOT NULL,
    avaliador TEXT,
    resultado TEXT NOT NULL DEFAULT 'pending',
    observacao TEXT,
    created_at TEXT,
    FOREIGN KEY (ficha_id) REFERENCES specialty_fichas(id)
);

CREATE TABLE sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    label TEXT,
    family TEXT,
    version_id INTEGER,
    branch_id INTEGER,
    FOREIGN KEY (version_id) REFERENCES versions(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE source_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    related_path TEXT NOT NULL,
    relation TEXT NOT NULL,
    FOREIGN KEY (source_id) REFERENCES sources(id)
);
