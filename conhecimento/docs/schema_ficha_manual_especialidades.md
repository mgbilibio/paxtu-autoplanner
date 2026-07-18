# Schema da ficha manual de especialidades

## Tabelas sugeridas

### specialty_fichas

- id
- especialidade_id
- nome
- ramo_id
- descricao_curta
- descricao_longa
- fonte_pdf
- fonte_md
- fonte_pagina
- status
- created_at
- updated_at

### specialty_ficha_passos

- id
- ficha_id
- posicao
- titulo
- texto
- obrigatorio
- status

### specialty_ficha_observacoes

- id
- passo_id
- autor
- texto
- created_at

### specialty_ficha_evidencias

- id
- passo_id
- tipo
- caminho_arquivo
- descricao
- created_at

### specialty_ficha_revisoes

- id
- ficha_id
- avaliador
- resultado
- observacao
- created_at

## Implementacao no schema

As tabelas acima foram adicionadas ao schema local em `conhecimento/bd/schema.sql` para suportar a camada de ficha manual sem alterar o catalogo plano.

## Regras

- Cada especialidade deve ter uma unica ficha canônica.
- Os passos devem espelhar os requisitos numerados do catalogo.
- Observacoes e evidencias podem crescer sem alterar o catalogo mestre.
- A revisao final fecha a ficha sem apagar o historico.

## Beneficio

- Mantem o catalogo plano limpo.
- Permite a experiencia real de acompanhamento do jovem.
- Facilita a interface do app principal.
