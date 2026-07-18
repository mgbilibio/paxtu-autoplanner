# Plano de Acao da Base de Conhecimento

Data: 2026-04-26

Escopo atual: Lobinho e Escoteiro.

Objetivo geral: criar uma base local, granular e segregada de progressao, especialidades, insignias e requisitos, antes de continuar a interface do aplicativo.

## 1. Congelar o escopo inicial

**Objetivo:** evitar dispersao entre todos os ramos.

**O que:** trabalhar somente com Lobinho e Escoteiro nesta fase.

**Como:** manter Senior e Pioneiro nas pastas existentes, mas sem populacao detalhada agora.

**Motivo:** Lobinho e Escoteiro ja tem mais fontes cruzadas, mais granularidade e maior volume util para consolidar primeiro.

## 2. Definir a fonte canonica local

**Objetivo:** separar fonte final de fonte de apoio.

**O que:** usar `conhecimento/` como base final editavel.

**Como:** manter arquivos pequenos por versao, ramo, etapa e item.

**Motivo:** a base precisa ser privada, local, revisavel e independente de Git.

## 3. Classificar as fontes existentes

**Objetivo:** saber de onde cada informacao vem.

**O que:** separar as fontes em quatro grupos.

**Como:**
- `planilhaprogressao.xlsx`: fonte granular principal para progressao, especialidades e insignias.
- `src/data/catalog/*.json`: fonte consolidada ativa e legada.
- `sempre-alerta/constants/**`: fonte paralela granular e complementar.
- `docs/biblioteca/*`: fonte normativa para validacao.

**Motivo:** ha dados complementares e duplicados; sem classificacao, a fusao vira chute.

## 4. Criar matriz de sobreposicao

**Objetivo:** identificar duplicidade e complemento real.

**O que:** montar tabela por ramo, versao, etapa, item e origem.

**Como:** gerar um arquivo em `conhecimento/docs/matriz_sobreposicao_lobinho_escoteiro.md`.

**Motivo:** antes de migrar conteudo, precisamos saber o que aparece em cada fonte e o que falta em cada uma.

## 5. Importar progressao 2020

**Objetivo:** criar a base legada de comparacao.

**O que:** importar Lobinho 2020 e Escoteiro 2020.

**Como:**
- origem Lobinho: `src/data/catalog/lobinho_2020.json`
- origem Escoteiro: `src/data/catalog/escoteiro_2020.json`
- destino: `conhecimento/por/2020/{ramo}/`

**Motivo:** o legado permite comparar mudancas de etapa, linguagem e requisitos.

## 6. Importar progressao 2025

**Objetivo:** criar a base ativa do programa novo.

**O que:** importar Lobinho 2025 e Escoteiro 2025.

**Como:**
- origem Lobinho: `src/data/catalog/lobinho_2025.json`
- origem Escoteiro: `src/data/catalog/escoteiro_2025.json`
- fonte complementar: `src/data/catalog/branch_lobinho.json`
- fonte complementar: `src/data/catalog/branch_escoteiro.json`
- destino: `conhecimento/por/2025/{ramo}/`

**Motivo:** estes arquivos ja trazem a divisao por grupos e itens do POR novo.

## 7. Integrar blocos granulares do Sempre Alerta

**Objetivo:** aproveitar a granularidade ja criada em outro projeto.

**O que:** cruzar os blocos `b1` a `b18` e `acolhida`.

**Como:**
- Lobinho: `sempre-alerta/constants/progression/lob/*.ts`
- Escoteiro: `sempre-alerta/constants/progression/esc/*.ts`
- converter cada bloco para etapa ou subetapa em `conhecimento/por/2025/{ramo}/`

**Motivo:** estes arquivos estao mais fatiados que os JSONs principais e ajudam a cumprir o limite de 150 a 200 linhas por arquivo.

## 8. Processar a planilha de progressao

**Objetivo:** usar a fonte mais rica encontrada ate agora.

**O que:** extrair `Rumo-Pista`, `Especialidades` e `Insignias`.

**Como:**
- `Rumo-Pista`: separar progressao pessoal e insignias especiais.
- `Especialidades`: separar por ramo de conhecimento e especialidade.
- `Insignias`: separar por sub-insignia e requisito.

**Motivo:** a planilha tem cerca de 3015 linhas brutas e contem requisitos detalhados que os JSONs nao carregam no mesmo nivel.

## 9. Normalizar nomes e codigos

**Objetivo:** permitir busca e cruzamento sem ambiguidades.

**O que:** padronizar ramos, etapas, areas e codigos.

**Como:**
- usar slugs em minusculo e sem acento para nomes de arquivo.
- manter titulo original dentro do arquivo.
- registrar fonte e versao em cada item.

**Motivo:** fontes diferentes usam nomes semelhantes com grafia diferente.

## 10. Criar arquivos de itens

**Objetivo:** atingir granularidade real.

**O que:** criar arquivos por etapa e, quando necessario, por item.

**Como:**
- `etapas/{slug}.md` para resumo da etapa.
- `itens/{slug}.md` para item detalhado.
- `requisitos/{slug}.md` para requisitos longos.

**Motivo:** arquivos pequenos facilitam revisao manual e reduzem risco de quebrar conteudo.

## 11. Criar indices por ramo

**Objetivo:** tornar a base navegavel sem depender de sistema.

**O que:** atualizar `index.md` de cada ramo.

**Como:** listar etapas, itens, totalizadores e fontes usadas.

**Motivo:** a base deve funcionar em disco, mesmo antes da interface ou do banco.

## 12. Criar espelho SQLite

**Objetivo:** permitir consulta, filtro e relatorio.

**O que:** criar `conhecimento/bd/conhecimento.sqlite`.

**Como:** usar `conhecimento/bd/schema.sql` e importar a fonte canonica em arquivos.

**Motivo:** SQLite e util para buscas por ramo, versao, etapa, item, area, requisito e origem, mas nao deve substituir os arquivos pequenos.

## 13. Validar consistencia

**Objetivo:** evitar perda de conteudo na migracao.

**O que:** comparar contagens antes e depois.

**Como:** gerar relatorio com:
- totais por origem.
- totais por destino.
- itens sem fonte.
- itens duplicados.
- itens com requisito vazio.

**Motivo:** a base so fica confiavel se a migracao for auditavel.

## 14. Marcar pendencias normativas

**Objetivo:** separar conteudo pronto de conteudo que precisa conferencia.

**O que:** registrar duvidas e lacunas.

**Como:** criar `conhecimento/docs/pendencias_normativas.md`.

**Motivo:** livros e PDFs devem validar pontos incertos, nao reiniciar toda a pesquisa.

## 15. Liberar base para interface

**Objetivo:** permitir que o app use a nova base sem depender das fontes antigas.

**O que:** definir API local de leitura.

**Como:** criar uma camada futura que leia o SQLite ou os indices gerados.

**Motivo:** a interface deve consumir uma base limpa, nao a mistura atual de planilha, JSONs e projetos paralelos.

