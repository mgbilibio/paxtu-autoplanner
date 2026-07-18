# Arquitetura de Progressão e Especialidades

Atualizado em 2026-07-09. A granularidade é aplicada nos bancos e estados individuais, evitando duplicar regras oficiais em arquivos manuais.

```text
PDF e Markdown oficiais
        ↓
conhecimento/bd/progressao_2025.sqlite
conhecimento/bd/especialidades_guia.sqlite
        ↓ exportadores
src/data/generated/*.ts
        ↓ adaptadores
progressao_2025_catalog.ts / officialSpecialtyCatalog.ts
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

- Cada ficha tem um `especialidadeId` do Guia e requisitos por posição.
- O catálogo usa `ESP-GUIA-<id>` apenas como referência estável de planejamento.
- `MemberSpecialtyState` registra cada requisito, status, evidência e avaliador.
- O nível é calculado pelos limites oficiais da própria especialidade; uma atividade no calendário apenas pode iniciar a ficha.

## Manutenção

1. Corrija a fonte estrutural em `conhecimento/`.
2. Regenere SQLite e os arquivos em `src/data/generated/`.
3. Rode auditoria, build e release check.
4. Nunca altere os arquivos gerados manualmente.
