# Ficha manual de especialidades

## Objetivo

Transformar o catalogo plano de especialidades em fichas de acompanhamento para uso no app principal.

## Base de entrada

- `conhecimento/bd/especialidades_guia.sqlite`
- `docs/biblioteca/libpaxtubasico2/Guia de Especialidades 18a Edição - 2024-1/markdown.md`
- `docs/biblioteca/Guia de Especialidades 18a Edição - 2024-1.pdf`

## Estrutura desejada por especialidade

- nome
- ramo de conhecimento
- descricao curta
- descricao longa
- requisitos numerados
- passos de acompanhamento
- observacoes do jovem
- evidencia anexada
- revisao do avaliador
- status de conclusao
- pagina oficial de origem

## Regra de montagem

1. O requisito numerado do guia vira passo da ficha.
2. A ficha deve manter a ordem original do guia.
3. Se houver observacao ou excecao no OCR, o PDF original vence.
4. Nao duplicar a especialidade apenas porque ela aparece em mais de um contexto.
5. Quando a especialidade tiver relacao com progressao ou insignia, registrar essa relacao sem misturar as camadas.

## Estados possiveis

- nao iniciada
- em andamento
- aguardando revisao
- concluida
- concluida com observacao

## Uso no app

- A tela do app deve abrir a ficha em um painel lateral ou pagina dedicada.
- O usuario deve conseguir marcar passos, registrar observacoes e concluir a revisao.
- A pesquisa textual deve apontar para a ficha e para a pagina do PDF original.

## Proximo passo

- Definir o schema relacional da ficha manual em cima do catalogo de especialidades.
- Depois gerar a camada de dados a partir do `especialidades_guia.sqlite`.
