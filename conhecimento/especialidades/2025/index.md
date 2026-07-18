# Especialidades 2025

## Fonte canonica (desde 2026-04-27)

Banco: `conhecimento/bd/especialidades_guia.sqlite`
Gerado por: `conhecimento/tools/build_especialidades_db.py`
Origem: `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`

## Contagens confirmadas (banco do guia)

| Ramo | Especialidades | Banco | Indice |
|------|---------------|-------|--------|
| Ciencia e Tecnologia | 46 | 46/46 | ok |
| Cultura | 55 | 55/55 | ok |
| Desportos | 54 | 54/54 | ok |
| Servicos | 105 | 105/105 | ok |
| Habilidades Escoteiras | 14 | 14/14 | ok |
| **Total** | **274** | **274/274** | **ok** |

Total de requisitos: 2741. Sem duplicatas. Sem entradas sem nome ou sem requisitos.

## Arvore derivada da planilha (fonte de apoio)

Fonte original: `planilhaprogressao.xlsx` aba `Especialidades`
Subtotal: 2747 linhas de conteudo
Arquivos gerados: 278

### Ramos (arvore de apoio)

- `ciencia-e-tecnologia` - Ciência e Tecnologia - 492 requisitos
- `cultura` - Cultura - 492 requisitos
- `desportos` - Desportos - 518 requisitos
- `habilidades-escoteiras` - Habilidades Escoteiras - 162 requisitos
- `servicos` - Serviços - 1083 requisitos

## Tabela `especialidade_alias` (mapeamentos Manual → Guia)

A tabela `especialidade_alias` em `progressao_2025.sqlite` contém 38 mapeamentos para resolver divergencias entre Manual 2025 e Guia 18ª Edição 2024-1:

- Alguns nomes de especialidades foram renomeados entre versoes
- Alguns códigos foram alterados
- Alguns requisitos foram consolidados ou expandidos

O app usa esta tabela no `progressao_2025_catalog.ts` para resolver automaticamente qual ficha mostrar ao clicar em uma especialidade de um bloco.

Acesso: `SELECT * FROM especialidade_alias WHERE manual_nome LIKE '%...%'`

## Regra de precedencia

1. `especialidades_guia.sqlite` (gerado do Guia 18a Edicao 2024-1) — fonte canonica.
2. PDF original do guia (prevalece sobre OCR em caso de duvida).
3. OCR `.md` em `libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`.
4. Mapeamentos `especialidade_alias` para resolver divergencias Manual × Guia.
5. Arvore derivada da planilha (apoio e conferencia).
6. `conhecimento_db_v19.sqlite` — fichas manuais de Servicos (referencia de transicao).
