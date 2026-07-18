# Estrategia de Especialidades 2024-1

## Objetivo

Reconstruir a base de especialidades do projeto a partir do guia novo de 2024-1, mantendo a base antiga como transicao e comparacao.

## Fonte principal

- `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`
- `docs/biblioteca/Guia de Especialidades 18a Edição - 2024-1.pdf`

## Hierarquia de uso

1. PDF original.
2. OCR `.md` da biblioteca `libpaxtubasico2`.
3. Base derivada em `conhecimento/`.
4. Base historica em `conhecimento_db_v19.sqlite`.

## Escopo imediato

- Reconstruir as especialidades por ramo de conhecimento.
- Reaproveitar apenas como referencia o que existir em `v19`.
- Priorizar a leitura e a ficha manual de cada especialidade.

## Regra de transicao

- Nada de misturar o cadastro antigo de `Servicos` com o novo guia sem marcar origem.
- Se o titulo, numero de passos ou requisito divergir, o guia 2024-1 vence.
- Quando a OCR for duvidosa, consultar o PDF original antes de registrar a ficha.

## Saida esperada

- Fichas manuais em Markdown.
- Estrutura compatível com SQLite.
- Painel com ficha individual e rastreio de origem.

## Resultado obtido (2026-04-27)

Banco `conhecimento/bd/especialidades_guia.sqlite` gerado via parser OCR `conhecimento/tools/build_especialidades_db.py`.

### Contagens finais

| Ramo | Banco | Indice |
|------|-------|--------|
| Ciencia e Tecnologia | 46 | 46 |
| Cultura | 55 | 55 |
| Desportos | 54 | 54 |
| Servicos | 105 | 105 |
| Habilidades Escoteiras | 14 | 14 |
| **Total** | **274** | **274** |

Total de requisitos: 2741. Sem duplicatas. Sem especialidades sem nome ou sem requisitos.

### Schema do banco

Tabelas: `ramos`, `especialidades`, `requisitos`.

Campos de especialidade: `ramo_id`, `nome`, `slug`, `revisada`, `nova`, `versao`, `proponentes`, `avaliadores`, `nota_tecnica`, `nivel1_itens`, `nivel2_itens`, `nivel3_itens`, `total_itens`, `fonte`, `linha_inicio`.

### Tecnica do parser

- Extrai `ramo_map` e `ordered_toc` (fila ordenada) do indice do livro.
- Detecta especialidades por heading `# Titulo`, por nome plain-text antes de itens (com ou sem current ativo), ou por restart de item `1` apos marcadores NIVEL.
- `slug_match` usa `difflib.SequenceMatcher.ratio() >= 0.75` para tolerar variacoes de OCR sem falsos positivos em slugs longos.
- Geracao usa `:memory:` + `conn.backup()` para evitar lock do Windows.
- Encoding UTF-8 declarado no schema.

### Pendencias restantes

- FTS5 sobre o banco e a base textual.
- Integracao ao app principal (tela de especialidade, busca, rastreio de origem).
