# Mapa de `Serviços` - Fichas Esparsas

Este mapa registra a origem mais provavel dos itens de `Serviços` que ainda estavam sem pista direta no guia oficial OCR.

Regra:
- `2025` continua como base ativa
- `2020` fica como legado comparativo
- fontes paralelas servem como apoio de consolidacao, nao como norma acima da biblioteca oficial

## Itens com rastro forte em fontes paralelas

| Item | Origem mais provavel | Arquivos | Status |
|---|---|---|---|
| Alfabetização | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-servicos.ts`, `constants/requirements/sp-common-vol42.ts`, `sp-common-vol92.ts` | Parcial, consolidavel |
| Barismo | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Carpintaria | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-hobbies.ts`, `sp-common-vol14.ts`, `sp-common-vol37.ts` | Parcial, consolidavel |
| Churrasco | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-hobbies.ts`, `sp-common-vol75.ts` | Parcial, consolidavel |
| Civismo | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-servicos.ts`, `sp-common-vol9.ts`, `sp-common-vol93.ts` | Parcial, consolidavel |
| Compostagem | `appMappa/src/data/especialidades.json` | `sp-common-vol4.ts`, `sp-common-vol52.ts`, `sp-common-vol65.ts`, `sp-common-vol109.ts` | Parcial, consolidavel |
| Contabilidade | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-servicos.ts`, `sp-common-vol24.ts`, `sp-common-vol108.ts` | Parcial, consolidavel |
| Garçom | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Investigação | `appMappa/src/data/especialidades.json` | `sp-common-vol43.ts` | Parcial, consolidavel |
| Licenciatura | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Lides Campeiras | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Liturgia Católica | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Minhocultura | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-hobbies.ts`, `sp-common-vol65.ts` | Parcial, consolidavel |
| Missionário Católico | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Reciclagem | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-servicos.ts`, `sp-common-vol30.ts`, `sp-common-vol45.ts`, `sp-common-vol54.ts`, `sp-common-vol63.ts`, `sp-common-vol73.ts`, `sp-common-vol112.ts` | Parcial, consolidavel |
| Secretariado | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-servicos.ts`, `sp-common-vol24.ts` | Parcial, consolidavel |
| Serralheria | `appMappa/src/data/especialidades.json` | nenhum rastro forte no zip | Parcial, precisa consolidacao manual |
| Socorrismo | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/progression/esc/b16.ts` | Parcial, fronteira com progressao |
| Topografia | `appMappa/src/data/especialidades.json` e `sempre-alerta` | `constants/specialties-ct.ts`, `sp-common-vol30.ts`, `sp-common-vol36.ts`, `sp-common-vol81.ts`, `sp-common-vol114.ts` | Parcial, consolidavel |

## Leitura pratica

- Os itens com melhor rastro sao `Alfabetização`, `Carpintaria`, `Churrasco`, `Civismo`, `Contabilidade`, `Minhocultura`, `Reciclagem`, `Secretariado` e `Topografia`.
- Os itens mais fracos continuam sendo `Barismo`, `Garçom`, `Licenciatura`, `Lides Campeiras`, `Liturgia Católica`, `Missionário Católico` e `Serralheria`.
- `Socorrismo` tem rastro duplo: especialidade e progressao, entao precisa de tratamento separado.

## Proximo passo

- Consolidar os itens fortes no conjunto canônico de `conhecimento/especialidades/2025/servicos`.
- Criar fichas manuais para os itens fracos, sem inventar fonte normativa que nao apareceu ainda.
- Separar `Socorrismo` em especialidade e progressao para evitar mistura de camadas.
