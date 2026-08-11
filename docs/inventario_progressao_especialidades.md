# Inventário de Progressão e Especialidades

Atualizado em 2026-08-11. A fonte de verdade do POR 2025+ é a base `conhecimento/bd/` e a captura pública UEB 2026 em `conhecimento/especialidades/`, auditadas contra fontes oficiais.

## Fonte vigente

| Área | Fonte operacional | Conteúdo | Consumidor principal |
|---|---|---|---|
| Progressão Lobinho e Escoteiro | `conhecimento/bd/progressao_2025.sqlite` | 18 blocos, 80 fixas, 230 variáveis, substituições e reconhecimentos | `progressao_2025.ts`, `BlocoTracker` |
| Especialidades UEB 2026 | `conhecimento/especialidades/2026_ueb_atualizado/especialidades_ueb_2026.json` | 208 especialidades, 1.385 requisitos, eixos, níveis e links públicos | `especialidades_ueb_2026.ts`, `SpecialtyEncyclopedia` |
| Catálogo POR 2025+ | `src/data/updatedSpecialtyCatalog.ts` | Códigos `ESP-UEB26-<id>` e texto de requisitos | Gerador, ciclo, mapa e relatórios |
| Especialidades 2024-1 | `conhecimento/bd/especialidades_guia.sqlite` | 274 especialidades, 2.741 requisitos, níveis e fonte | Histórico/transição |
| Busca documental | `conhecimento/bd/biblioteca_fts.sqlite` | Índice FTS5 da biblioteca local | Busca global e biblioteca |

## Compatibilidade histórica

| Caminho | Papel |
|---|---|
| `src/data/catalog/lobinho_2020.json`, `escoteiro_2020.json` | Catálogo POR 2020 |
| `src/data/catalog/specs_*.json` | Especialidades históricas com código `SP-*` |
| `src/data/officialSpecialtyCatalog.ts` | Compatibilidade com especialidades 2024-1 `ESP-GUIA-*` |
| `src/data/details/legacy_2020_details.ts` | Orientações do modelo anterior |
| `src/data/awardsRules.ts` | Regras históricas, não usadas no reconhecimento POR 2025+ |

## Estado individual

- `MemberBlocoState`: ações fixas, variáveis, substituição, notas e conclusão de bloco.
- `MemberSpecialtyState`: requisitos concluídos, status, evidências, avaliador, notas e nível.
- `MemberReconhecimentoState`: checklist e homologação de Cruzeiro do Sul ou Lis de Ouro.
- `ProgressionRecord`: registros herdados do POR 2020.

## Critério de uso

1. Para planejamento e acompanhamento atual, use somente itens `B#.F#`, `B#.V#` e `ESP-UEB26-<id>`.
2. Não conclua especialidade pela presença ou por uma atividade isolada; avalie seus requisitos.
3. Consulte PDFs e Markdown da biblioteca se houver dúvida de redação ou fonte.
4. Preserve os arquivos legados para consultar a trajetória de jovens em transição.

