# Arquitetura de Progressão e Especialidades

Atualizado em 2026-08-09. A granularidade é aplicada nos bancos e estados individuais, evitando duplicar regras oficiais em arquivos manuais.

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

- Cada ficha atualmente importada tem um `especialidadeId` do Guia 18ª Ed. 2024-1 e requisitos por posição.
- O catálogo usa `ESP-GUIA-<id>` apenas como referência estável de planejamento, consulta e transição.
- A página oficial da UEB em 2026-08-09 separa as especialidades do Programa Educativo Atualizado em quatro eixos novos. Portanto, a base 2024-1 não deve ser tratada como importação integral dos Guias de Especialidades e Insígnias 2025.
- `MemberSpecialtyState` registra cada requisito, status, evidência e avaliador.
- O nível é calculado pelos limites da ficha 2024-1 importada; uma atividade no calendário apenas pode iniciar a ficha.

## Manutenção

1. Corrija a fonte estrutural em `conhecimento/`.
2. Regenere SQLite e os arquivos em `src/data/generated/`.
3. Rode auditoria, build e release check.
4. Nunca altere os arquivos gerados manualmente.
