# Mapa de Especialidades - libpaxtubasico2

## Fonte principal

- `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`
- `docs/biblioteca/Guia de Especialidades 18a Edição - 2024-1.pdf`

## Estrutura confirmada no guia

- Ciencias e Tecnologia
- Cultura
- Desportos
- Servicos
- Habilidades Escoteiras

## Regra de precedencia

1. PDF original
2. OCR `.md` do `libpaxtubasico2`
3. Base derivada em `conhecimento/`
4. Consolidados e espelhos anteriores

## Uso pratico

- O bloco de `Servicos` deve ser refeito a partir desta fonte.
- Os itens com correspondencia antiga em `conhecimento_db_v19.sqlite` servem apenas como referencia de transicao.
- Quando houver duvida sobre nome, descricao, contagem ou sequencia, o PDF original deve ser consultado.

## Estado atual

- [FEITO 2026-04-27] Banco `conhecimento/bd/especialidades_guia.sqlite` gerado via `conhecimento/tools/build_especialidades_db.py`.
- 274 especialidades | 2741 requisitos | sem duplicatas | sem entradas sem nome ou sem requisitos.
- Contagens por ramo conferem com o indice do guia:
  - Ciencia e Tecnologia: 46/46
  - Cultura: 55/55
  - Desportos: 54/54
  - Servicos: 105/105
  - Habilidades Escoteiras: 14/14
- Encoding declarado como UTF-8 no schema; dados armazenados corretamente.
- Gerador usa `:memory:` + `conn.backup()` para evitar lock do Windows.

## Bugs de parsing resolvidos

| Problema | Causa raiz | Correcao |
|----------|-----------|----------|
| Mergulho ausente de Desportos | Entrada bi-linha no OCR do TOC (nome na linha 277, `(revisada) ... 311` na 278) | `prev_non_empty` em `parse_toc`; linhas combinadas quando continuacao detectada |
| Acampamento ausente de Habilidades Escoteiras | Primeiro item estava 4 linhas apos o nome (metadado entre nome e item) | Peek extendido para 6 linhas quando `not current and is_queued` |
| Vendas ausente de Servicos (contagem correta, entrada errada) | Sem heading `# ` e sem marcadores NIVEL antes dela; plain-text ignorado porque `current` estava ativo | Deteccao de nome queued mesmo com current ativo; flush + reinicio |
| `slug_match` falso positivo entre slugs longos | Verificacao de presenca de caractere individualmente: `prevencao-ao-alcoolismo` x `vigilancia-epidemiologica` = 84% | Substituido por `difflib.SequenceMatcher.ratio() >= 0.75` |

## Proximos passos

- Preparar busca FTS5 sobre `especialidades_guia.sqlite` e base textual.
- Integrar ao app principal: tela de ficha de especialidade com busca e rastreio de origem.
