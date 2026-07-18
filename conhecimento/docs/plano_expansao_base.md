# Plano de Expansao da Base

## Premissas

- A fonte normativa principal e a biblioteca oficial em `docs/biblioteca/libpaxtubasico/`.
- PDFs oficiais mandam sobre OCR e sobre qualquer derivado.
- `conhecimento/` e `conhecimento/bd/` sao bases derivadas e organizadas.
- 2020 e legado comparativo.
- 2025 e base nova, com prioridade de evolucao e modelagem.
- 2020 permanece como legado comparativo e de referencia historica.
- A granularidade alvo e: ramo -> etapa -> tema -> item -> requisitos.
- O POR 2025 pode usar blocos tematicos e nomes diferentes; isso nao quebra a modelagem, apenas exige mapeamento.
- A estrutura 2025+ deve seguir o recorte: simbolo -> etapa -> tema -> item -> requisitos -> reconhecimento.

## Sequencia

### 1. Fixar a hierarquia de fontes

- Objetivo: impedir nova mistura entre fonte oficial, OCR e derivado.
- O que: manter a precedencia documental em todo o projeto.
- Como: registrar a regra nos indices e usar essa ordem em toda revisao.
- Motivo: sem isso, qualquer complemento vira divergencia.
- Regra de foco: 2025+ e o alvo principal do app; 2020 fica como legado mantido.

### 2. Ler os livros oficiais por tema

- Objetivo: extrair a estrutura real dos manuais.
- O que: revisar Lobinho, Escoteiro, POR, Guia de Insignias e Distintivos.
- Como: varrer capitulos, secoes, listas, tabelas e observacoes.
- Motivo: os livros sao a base para nomes, descricoes e requisites.

### 3. Montar um mapa tematico mestre

- Objetivo: organizar o conhecimento por assunto e utilidade.
- O que: construir uma taxonomia geral para progressao, simbolos, atividades, seguranca e papel do adulto.
- Como: ampliar `indice_tematico_geral.md`.
- Motivo: facilita busca, revisao e expansao.

### 3.1 Registrar a estrutura 2025+

- Objetivo: capturar como a norma e os manuais organizaram a progressao a partir de 2025.
- O que: criar uma camada separada para simbolos, etapas, blocos e reconhecimentos.
- Como: usar `estruturas_2025.md` como referencia operacional.
- Motivo: o recorte 2025 nao e so lista de itens, e uma organizacao simbolica e pedagogica propria.
- Resultado esperado: Lobinho com caminho/acolhida/progressao; Escoteiro com caminho/progressao/reconhecimento; ambos com eixos, blocos e requisitos ordenados.

### 4. Revisar Lobinho primeiro

- Objetivo: fechar o ramo mais sensivel e ainda mais resumido.
- O que: nomes oficiais, descricoes, sequencia, itens e requisitos.
- Como: comparar a arvore atual com o manual oficial.
- Motivo: Lobinho ainda e o ramo com maior risco de desvio.

### 5. Revisar Escoteiro em seguida

- Objetivo: confirmar e enriquecer a modelagem atual.
- O que: etapas, blocos, progressao, patrulhas e atividades.
- Como: comparar base derivada, planilha e manual oficial.
- Motivo: Escoteiro ja tem mais granularidade e permite validar a metodologia.

### 6. Separar nome normativo de alias interno

- Objetivo: evitar que rotulos operacionais virem norma sem marcação.
- O que: registrar o que e titulo oficial e o que e apelido de organizacao.
- Como: adicionar anotacoes nos arquivos e no banco.
- Motivo: preserva rastreabilidade.

### 7. Definir o modelo canônico

- Objetivo: padronizar o formato de dados da progressao.
- O que: campos para ramo, versao, etapa, tema, item, requisitos, fonte e pagina.
- Como: documentar o schema operacional e a regra de mapeamento.
- Motivo: sem esse contrato, a base cresce de forma inconsistente.

### 8. Expandir a progressao por temas e subitens

- Objetivo: aumentar a granularidade real da base.
- O que: decompor cada etapa em itens e cada item em requisitos observaveis.
- Como: extrair dos livros e complementar com a planilha.
- Motivo: a base atual ainda e pequena frente ao acervo disponivel.

### 9. Revisar especialidades e insignias

- Objetivo: consolidar o catalogo detalhado.
- O que: nome, ramo de conhecimento, descricao e quantidade de requisitos.
- Como: usar a planilha como espelho e validar com os livros.
- Motivo: e a maior massa de conteudo detalhado.

### 10. Ligar cada bloco ao PDF de origem

- Objetivo: manter trilha e auditoria.
- O que: cada item derivado deve saber de qual PDF e pagina veio.
- Como: gravar referencia de origem no markdown e no SQLite.
- Motivo: facilita conferencia e correcao.

### 11. Ampliar o SQLite

- Objetivo: deixar consulta rapida e consistente.
- O que: camadas para tema, fonte, ramo, versao, capitulo, etapa, item, requisito e alias interno.
- Como: ajustar schema, importador e registros de origem.
- Motivo: o banco precisa refletir a estrutura real.

### 12. Criar validacoes automaticas

- Objetivo: detectar lacunas e divergencias.
- O que: consultas para itens sem origem, duplicatas e incompatibilidades entre fontes.
- Como: scripts sobre o SQLite e a arvore de markdown.
- Motivo: reduz regressao manual.

### 13. Normalizar a navegacao documental

- Objetivo: tornar a base simples de usar.
- O que: indices por tema, ramo e utilidade.
- Como: expandir os arquivos de indice e status.
- Motivo: a navegacao tem de acompanhar a granularidade nova.

### 14. Atualizar o snapshot do projeto

- Objetivo: manter um espelho estavel do estado corrente.
- O que: documentacao, indices e referencias principais.
- Como: sincronizar `AutoPaxtu042026`.
- Motivo: reduz confusao durante a evolucao.

### 15. Integrar ao app principal por ultimo

- Objetivo: usar a base limpa na interface da raiz.
- O que: busca FTS5, trechos, links e atalho ao PDF.
- Como: implementar no app que entra por `INICIAR_APP.bat`.
- Motivo: a interface so faz sentido com a base consolidada.

## Ordem de trabalho sugerida

1. Lobinho 2025+
2. Escoteiro 2025+
3. Definir o modelo canônico 2025+
4. Especialidades 2025+
5. SQLite
6. Buscas e indices
7. Legado 2020
8. App principal

## Entregaveis esperados

- Base canonica ampliada
- Indice tematico consistente
- Banco SQLite atualizado
- Trilha de origem por PDF
- App principal pronto para busca e consulta

## Modelo canônico alvo

- `branch`: Lobinho, Escoteiro
- `version`: 2020, 2025
- `focus`: `2025+` principal, `2020` legado
- `chapter`: capitulo ou bloco editorial da fonte oficial
- `symbol`: simbolo do ramo
- `stage`: etapa operacional de progressao
- `theme`: tema pedagógico ou utilidade pratica
- `block`: bloco da progressao ou da especialidade
- `item_code`: codigo do item de progressao
- `item_title`: titulo do item
- `item_description`: resumo normativo
- `requirements`: lista ordenada de requisitos/subitens
- `recognitions`: reconhecimentos associados
- `source_kind`: PDF oficial, OCR MD ou derivado
- `source_path`: caminho do arquivo de origem
- `source_page`: pagina do PDF quando aplicavel
- `alias_of`: nome operacional quando houver divergencia de nome

## Regra de mapeamento

- Quando o livro oficial tiver a mesma estrutura da base derivada, usar equivalencia direta.
- Quando o livro oficial usar outra divisao, mapear para `chapter` e `theme`, sem inventar equivalencia falsa.
- Quando o OCR estiver duvidoso, validar no PDF antes de consolidar.
- Quando o nome operacional diferir do oficial, manter os dois com marcação clara.
