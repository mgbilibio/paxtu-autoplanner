# Cruzamento entre planilha e base gerada

## Progressao

### Rumo-Pista

- Linhas uteis na planilha: 258
- Progressao Pessoal: 221
- Insignias Especiais: 37
- Eixos principais:
  - Pista e Trilha: 108
  - Rumo e Travessia: 113
  - Cone Sul: 14
  - Lusofonia: 13
  - Aprender: 3
  - Energia Solar: 3
  - Ação Comunitária: 2
  - Campeões da Natureza: 1
  - Plastic Tide Turners: 1

### Leitura operacional

- A planilha nao substitui os JSONs do POR.
- Ela complementa o detalhamento de Escoteiro 2025.
- Ela tambem fornece a divisao fina de itens e requisitos que a arvore atual ainda nao representa por completo.

## Especialidades 2024-1 em transição

### Volume bruto por ramo de conhecimento

- Serviços: 1083
- Desportos: 518
- Ciência e Tecnologia: 492
- Cultura: 492
- Habilidades Escoteiras: 162

### Leitura operacional

- A planilha de especialidades e a melhor fonte granular local da base 2024-1.
- A base em `conhecimento/especialidades/2025` deve ser tratada como fonte implementada de detalhe para consulta/transição, nao como importação integral dos Guias de Especialidades e Insígnias 2025.
- O conteudo em `src/` e `sempre-alerta/` serve como apoio de comparacao e validacao.

## Pendencias objetivas

1. Mapear os itens de Lobinho que ainda estao apenas resumidos.
2. Normalizar a diferenca entre a arvore de Escoteiro gerada e a planilha.
3. Separar os arquivos implementados de especialidades por ramo de conhecimento e especialidade.
4. Reduzir duplicacao entre a planilha e os arquivos consolidados de apoio.
