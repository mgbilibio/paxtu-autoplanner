# Arquitetura de Progressão e Especialidades

Atualizado em 2026-08-11. A granularidade é aplicada nos bancos e estados individuais, evitando duplicar regras oficiais em arquivos manuais.

```text
PDF e Markdown oficiais
        ↓
conhecimento/bd/progressao_2025.sqlite
conhecimento/especialidades/2026_ueb_atualizado/especialidades_ueb_2026.json
        ↓ exportadores
src/data/generated/*.ts
        ↓ adaptadores
progressao_2025_catalog.ts / updatedSpecialtyCatalog.ts
        ↓
CatalogService, gerador, ciclo, ficha e relatórios
        ↓
MemberBlocoState / MemberSpecialtyState / MemberReconhecimentoState
```

## Progressão POR 2025+

- Um bloco possui identificador global, eixo, intencionalidade e metadados por ramo.
- Ações fixas e variáveis usam índices 1-baseados dentro do bloco.
- `MemberBlocoState` guarda cada ação concluída de forma granular.
- O reconhecimento somente é homologado pela checklist oficial depois dos blocos exigidos.

## Especialidades

- Cada ficha ativa tem um `especialidadeId` da base pública UEB 2026 e requisitos por posição.
- O catálogo atualizado usa `ESP-UEB26-<id>` como referência estável de planejamento, consulta e transição para o Programa Educativo Atualizado.
- A base 2024-1 continua preservada como `ESP-GUIA-<id>` para histórico/transição, sem substituir o catálogo atualizado.
- `MemberSpecialtyState` registra cada requisito, status, evidência e avaliador.
- O nível é calculado pelos limites publicados na ficha UEB quando existirem; uma atividade no calendário apenas pode iniciar a ficha.

## Manutenção

1. Corrija a fonte estrutural em `conhecimento/`.
2. Regenere JSON/SQLite e os arquivos em `src/data/generated/`.
3. Rode auditoria, build e release check.
4. Nunca altere os arquivos gerados manualmente.
