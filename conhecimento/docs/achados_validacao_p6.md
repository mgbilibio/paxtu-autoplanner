# Achados da validação P6 (2026-04-27)

Script `conhecimento/tools/validate_progressao.py` rodado pela primeira vez.

## Resumo

- **343 erros** detectados, **0 avisos**.
- 274 dos 343 erros são **falso positivo da validação 10** (ver abaixo).
- Os 69 erros restantes são da validação 6: especialidades referenciadas em `bloco_especialidades` que não existem em `especialidades_guia`. Investigação reduziu para **40 órfãs reais** quando se aplica normalização de acento/caso (o validador faz comparação literal). Reportar como bug do validador.

## Validação 10 é falso positivo

A validação 10 verifica `total_itens == nivel1_itens + nivel2_itens + nivel3_itens`. Isso está semanticamente errado: nas tabelas de `especialidades_guia.sqlite`, `nivel1_itens` é o **threshold cumulativo** de itens necessários para conquistar o nível 1, não a contagem de itens exclusivos do nível. Exemplo: especialidade com 12 requisitos pode ter `nivel1=4, nivel2=8, nivel3=12, total_itens=12`. A soma 4+8+12=24 não tem significado.

**Ação**: remover a validação 10 do script `validate_progressao.py` (ou reescrevê-la como `total_itens >= nivel3_itens`).

## Validação 6 é parcialmente verdadeira (40 órfãs reais)

Causa raiz: os nomes em `progressao_2025.sqlite.bloco_especialidades.especialidade_nome` foram extraídos do Manual do Escotista 2025.10 (Lobinho/Escoteiro), que diverge do Guia de Especialidades 18ª Ed. 2024-1 em vários nomes. Exemplos:

| Manual do Escotista (em progressao_2025) | Guia de Especialidades (em especialidades_guia) |
|------------------------------------------|------------------------------------------------|
| Animais Venenosos e Peçonhentos          | Animais Peçonhentos                            |
| Aquarismo                                | Aquariofilia                                   |
| Arquitetura e Urbanismo                  | Arquitetura                                    |
| Aeronáutica                              | Engenharia Aeronáutica                         |
| Botânica                                 | (não existe no guia — provável Zoobotânica?)   |
| Insígnia do Aprender                     | (é insígnia, não especialidade — erro de schema na referência)|

**Ação 1**: criar coluna `especialidade_id` (FK) em `bloco_especialidades` para vincular por id, com fallback para `especialidade_nome` quando não houver match. Atualizar `build_progressao_db.py` para resolver o nome contra o guia na geração e gravar tanto o id quanto o nome canônico.

**Ação 2**: separar referências a insígnias do `bloco_especialidades` para `bloco_insignias` (já existe a tabela). Hoje "Insígnia do Aprender" aparece em `bloco_especialidades` com `tipo='substitui'` — está errado.

**Ação 3**: 1 entrada parser-bug no guia: `## Matemática` foi indexada com o prefixo `## ` no nome. Corrigir no `build_especialidades_db.py`.

## Próximos passos

1. Corrigir o validador (validação 10).
2. Refatorar `build_progressao_db.py` para resolver nomes contra `especialidades_guia.sqlite` no momento de inserção (com tabela de aliases manuais para casos sem match exato).
3. Reexecutar validador. Meta: 0 erros / 0 avisos.

## Bug colateral encontrado

Especialidade `## Matemática` em `especialidades_guia` (id provável em C&T) tem prefixo `## ` no nome — falha de parsing OCR no `build_especialidades_db.py`. Corrigir no parser.
