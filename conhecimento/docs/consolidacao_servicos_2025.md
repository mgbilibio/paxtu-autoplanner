# Consolidacao de `Servicos` 2025

Base de trabalho para transformar as fichas esparsas em uma coleção canônica dentro de `conhecimento/especialidades/2025/servicos`.

## Regra de trabalho

1. Fontes oficiais da UEB têm prioridade.
2. OCR local e arquivos paralelos servem para completar lacunas e validar termos.
3. Quando houver divergencia, a pagina oficial vence.
4. Quando nao houver pagina oficial clara, o item fica como `manual_pending`.

## Status por item

### Confirmados na web e prontos para consolidacao

- Alfabetização
- Barismo
- Garçom
- Licenciatura
- Lides Campeiras
- Missionário Católico
- Serralheria
- Socorrismo

### Confirmados em fontes paralelas e prontos para consolidacao

- Carpintaria
- Churrasco
- Civismo
- Compostagem
- Contabilidade
- Investigação
- Minhocultura
- Reciclagem
- Secretariado
- Topografia

### Ainda pendentes de amarracao fina

- Barismo
- Garçom
- Licenciatura
- Lides Campeiras
- Liturgia Católica
- Missionário Católico
- Serralheria
- Socorrismo

## Diretriz de saida

Para cada especialidade consolidada, gerar:

- `conhecimento/especialidades/2025/ramos/servicos/<especialidade>.md`
- registro com fonte oficial
- subtotais por nivel, quando a fonte permitir
- lista de requisitos numerada
- pagina oficial provavel ou exata

## Diretriz de revisão

Os itens com origem dupla devem ser comparados linha a linha com:

- página oficial da UEB
- OCR local da biblioteca oficial
- JSON legado em `appMappa`
- blocos paralelos em `sempre-alerta`

## Observação

`Socorrismo` deve ser tratado com cuidado porque encosta em progressão e especialidade, e isso pode exigir separação de camadas na base canônica.
