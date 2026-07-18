# Indice Tematico Geral

## Regra de leitura

- A referencia primaria e a biblioteca oficial em `docs/biblioteca/libpaxtubasico/`.
- A base `conhecimento/` e uma modelagem operacional derivada.
- Quando houver divergencia, prevalece o livro oficial.

## Eixos tematicos de alto nivel

### 1. Fundamentos do Escotismo

- Missao e metodo
- Promessa e Lei
- Marco simbolico
- Valores e educacao
- Organização do movimento

### 2. Desenvolvimento por faixa etaria

- Lobinho: infancias, crescimento, linguagem simbolica e acolhida
- Escoteiro: adolescencia inicial, autonomia, patrulhas e progressao
- Sênior e Pioneiro: transicao, maior autonomia e projeto de vida

### 3. Progressao pessoal

- Caminho de ingresso
- Etapas e blocos de aprendizagem
- Eixos educativos
- Avaliacao e acompanhamento
- Reconhecimentos de ramo

### 4. Especialidades e insignias

- Especialidades por ramo de conhecimento
- Insignias de interesse especial
- Iniciativas globais
- Distintivos e marcas

### 5. Vida de grupo

- Alcateia
- Patrulhas
- Tropa
- Conselho e participacao
- Lideranca jovem

### 6. Atividades educativas

- Jogos
- Historias e dramatizacao
- Canções e danças
- Atividades ao ar livre
- Acoes comunitarias

### 7. Ciclo de programa

- Planejar
- Fazer
- Avaliar
- Calendario
- Feedback e melhoria

### 8. Protecao e seguranca

- Espaços seguros
- Gestao de riscos
- Cuidado emocional e fisico
- Responsabilidade legal

### 9. Funcao do adulto

- Papel do escotista
- Acompanhamento educativo
- Relacao com familias
- Formacao continuada

## Indice por utilidade

### Para operar atividades

- Atividades educativas
- Ciclo de programa
- Protecao e seguranca

### Para acompanhar progresso

- Progressao pessoal
- Avaliacao
- Reconhecimentos

### Para consultar requisitos

- Especialidades
- Insignias
- Distintivos e marcas

### Para orientar a equipe adulta

- Papel do escotista
- Familias
- Espacos seguros

## Fontes principais por tema

- Lobinho: `2025.10.Manual do Escotista - Lobinho_COMPACTO_OCR.pdf`
- Escoteiro: `2025.10.Manual do Escotista - Escoteiro_COMPACTO_OCR.pdf`
- Norma geral: `POR 2026.02.pdf`
- Insignias: `2025.12 Guia de Insignias Lobinho Escoteiro_COMPACTO_OCR.pdf`
- Distintivos: `2026 Distintivos e Marcas.pdf`

## Aplicacao na base

- `conhecimento/por/2020/` vira comparacao historica.
- `conhecimento/por/2025/` vira base operacional nova.
- `conhecimento/especialidades/2025/` vira catalogo detalhado de consulta.
- `conhecimento/bd/` espelha as consultas por tema, ramo e requisito.

## Modelo canônico alvo

- `branch`
- `version`
- `chapter`
- `stage`
- `theme`
- `item_code`
- `item_title`
- `item_description`
- `requirements`
- `source_kind`
- `source_path`
- `source_page`
- `alias_of`

## Pendencia futura do app

- Criar indice pesquisavel com FTS5 sobre os arquivos `.md`.
- A busca deve localizar termos nos arquivos oficiais e derivados.
- Cada resultado deve mostrar um trecho textual curto para visualizacao.
- Cada resultado deve ter um link direto para o bloco correspondente.
- Quando o bloco vier da biblioteca oficial, o resultado deve incluir atalho direto para a pagina do PDF original.
- O indice deve respeitar a separacao entre fonte oficial, OCR e base derivada.
