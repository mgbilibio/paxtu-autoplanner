# Diagnostico de Lacunas e Duplicidades 2025+

## Base analisada

- Banco valido: `conhecimento/bd/conhecimento_db_v19.sqlite`
- Lobinho 2025: 46 itens
- Escoteiro 2025: 27 itens
- Total de itens de progressao 2025: 73
- Especialidades de `Servicos`: 104 fichas

## Resultado estrutural

- Itens de progressao com slug unico: 73
- Itens de progressao com titulo unico: 73
- Requisitos por item: 1 por item, sem duplicidade interna na espinha operacional
- Fichas de especialidade com slug unico: 104
- Fichas de especialidade com titulo unico: 104

## Duplicidades encontradas

- Nenhuma duplicidade estrutural entre os itens de progressao 2025.
- Nenhuma duplicidade estrutural entre as fichas de `Servicos`.
- `Socorrismo` e `Primeiros Socorros` sao fichas distintas, mas proximas por tema.

## Lacunas ainda abertas

### Progressao

- Item -> pagina oficial.
- Item -> tema pedagógico.
- Item -> reconhecimento, quando existir.
- Item -> alias interno, quando houver divergencia entre o nome operacional e o nome normativo.

### Lobinho 2025

- Validar a correspondencia entre os 46 itens e o manual oficial.
- Amarrar pagina por pagina.
- Separar de forma fechada caminho, acolhida, progressao e reconhecimento.

### Escoteiro 2025

- Cruzar os 27 itens com a planilha de 515 linhas.
- Garantir que a camada fina da planilha continue como apoio e nao vire norma por si.
- Separar progressao oficial, apoio de detalhe e especialidade.

### Especialidades

- Revisar os demais ramos de conhecimento fora de `Servicos`.
- Verificar se `Socorrismo` precisa de tratamento visual diferenciado.

## Leitura pratica

- O que é espinha de progressao ja está sem duplicidade estrutural.
- O que falta é amarrar essa espinha às fontes oficiais com pagina.
- O que falta nas especialidades é ampliar o mesmo modelo para os demais ramos.

## Proximo passo

1. Criar o mapa de pagina por item.
2. Fechar Lobinho e Escoteiro por validacao editorial.
3. Expandir especialidades para os demais ramos.
4. Preparar FTS5 com trechos e links.
