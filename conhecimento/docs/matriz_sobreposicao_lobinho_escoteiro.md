# Matriz de Sobreposicao - Lobinho e Escoteiro

Data: 2026-04-26

Escopo: somente Lobinho e Escoteiro.

## Fontes principais

| Fonte | Tipo | Papel |
|---|---|---|
| `planilhaprogressao.xlsx` | Planilha | Fonte mais granular encontrada para progressao, especialidades e insignias |
| `src/data/catalog/lobinho_2020.json` | JSON | Progressao legada do Lobinho |
| `src/data/catalog/escoteiro_2020.json` | JSON | Progressao legada do Escoteiro |
| `src/data/catalog/lobinho_2025.json` | JSON | Progressao consolidada nova do Lobinho |
| `src/data/catalog/escoteiro_2025.json` | JSON | Progressao consolidada nova do Escoteiro |
| `src/data/catalog/branch_lobinho.json` | JSON | Consolidado por ramo do Lobinho |
| `src/data/catalog/branch_escoteiro.json` | JSON | Consolidado por ramo do Escoteiro |
| `sempre-alerta/constants/progression/lob/*.ts` | TS | Fragmentacao granular do Lobinho |
| `sempre-alerta/constants/progression/esc/*.ts` | TS | Fragmentacao granular do Escoteiro |
| `src/data/catalog/specs_*.json` | JSON | Especialidades por area |
| `sempre-alerta/constants/specialties-*.ts` | TS | Especialidades por area em formato granular |
| `src/data/catalog/specialties.json` | JSON | Insignias especiais e cordoes |
| `sempre-alerta/constants/insignias.ts` | TS | Insignias consolidadas do projeto paralelo |

## Progressao - Lobinho

| Fonte | Etapas / Blocos | Itens | Observacao |
|---|---|---:|---|
| `src/data/catalog/lobinho_2020.json` | 4 | 40 | Base legada com Pata-Tenra, Saltador, Rastreador e Cacador |
| `src/data/catalog/lobinho_2025.json` | 18 | 46 | Base nova mais granular por blocos tematicos |
| `src/data/catalog/branch_lobinho.json` | 19 | 31 | Consolidado por ramo, menos granular que `lobinho_2025.json` |
| `sempre-alerta/constants/progression/lob/*.ts` | 19 | 31 | Blocos atomizados para importacao futura |

## Progressao - Escoteiro

| Fonte | Etapas / Blocos | Itens | Observacao |
|---|---|---:|---|
| `src/data/catalog/escoteiro_2020.json` | 4 | 37 | Base legada com Pistas, Trilha, Rumo e Travessia |
| `src/data/catalog/escoteiro_2025.json` | 7 | 27 | Base nova com blocos tematicos menores |
| `src/data/catalog/branch_escoteiro.json` | 19 | 56 | Consolidado por ramo, mais detalhado que `escoteiro_2025.json` |
| `sempre-alerta/constants/progression/esc/*.ts` | 19 | 56 | Blocos atomizados para importacao futura |

## Especialidades e insignias

| Fonte | Volume bruto | Observacao |
|---|---:|---|
| `src/data/catalog/specs_ciencia.json` | 63 | Especialidades de Ciencia e Tecnologia |
| `src/data/catalog/specs_cultura.json` | 57 | Especialidades de Cultura |
| `src/data/catalog/specs_desportos.json` | 64 | Especialidades de Desportos |
| `src/data/catalog/specs_habilidades.json` | 58 | Especialidades de Habilidades |
| `src/data/catalog/specs_servicos.json` | 55 | Especialidades de Servicos |
| `src/data/catalog/specialties.json` | 66 | Insignias especiais e cordoes |
| `sempre-alerta/constants/specialties-ct.ts` | 63 | Base paralela de especialidades CT |
| `sempre-alerta/constants/specialties-cultura.ts` | 57 | Base paralela de especialidades Cultura |
| `sempre-alerta/constants/specialties-desportos.ts` | 64 | Base paralela de especialidades Desportos |
| `sempre-alerta/constants/specialties-hobbies.ts` | 58 | Base paralela de Hobbies / Habilidades |
| `sempre-alerta/constants/specialties-servicos.ts` | 55 | Base paralela de Servicos |
| `sempre-alerta/constants/insignias.ts` | 22 | Insignias consolidadas do projeto paralelo |

## Sobreposicao observada

1. `src/data/catalog/lobinho_2025.json` e `branch_lobinho.json` tratam do mesmo ramo, mas com niveis diferentes de detalhamento.
2. `src/data/catalog/escoteiro_2025.json` e `branch_escoteiro.json` seguem a mesma logica.
3. Os arquivos de `sempre-alerta/constants/progression/**` repetem a materia de `src/data/catalog/*`, mas em blocos menores e mais reutilizaveis.
4. A planilha `planilhaprogressao.xlsx` tem o maior detalhe e deve funcionar como referencial de preenchimento e validacao.
5. `src/data/catalog/specs_*.json` e `sempre-alerta/constants/specialties-*.ts` apontam para o mesmo dominio, mas o projeto paralelo tende a estar mais fragmentado.

