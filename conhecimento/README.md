# Conhecimento Escoteiro

Base segregada de progressao, especialidades, insignias e regras por ramo e versao do POR.

## Objetivo

Organizar o conhecimento em arquivos pequenos, com separacao clara entre:

- ramo
- versao do POR
- etapa
- item
- requisitos detalhados

## Estrutura alvo

```text
conhecimento/
  por/
    2020/
      lobinho/
      escoteiro/
      senior/
      pioneiro/
    2025/
      lobinho/
      escoteiro/
      senior/
      pioneiro/
  especialidades/
    2020/
    2025/
  bd/
  docs/
```

## Regra de arquivo

- Um arquivo deve representar um bloco pequeno e coeso.
- Arquivos de item devem conter somente um item ou um conjunto muito curto de itens relacionados.
- Arquivos de etapa devem agrupar os itens da etapa.
- Arquivos de ramo devem consolidar as etapas.
- Arquivos de versao devem consolidar os ramos.

## SQLite

SQLite e uma boa opçao se:

- houver consulta filtrada por ramo, versao, etapa e item
- houver necessidade de busca rapida e relatorios
- a base crescer para muitas entradas e revisoes

Arquivos JSON/MD continuam melhores se:

- a prioridade for editar manualmente
- o conteudo estiver em revisao frequente
- o versionamento por git for o principal fluxo

## Recomendacao pratica

Usar abordagem dupla:

1. Fonte canônica em arquivos pequenos.
2. Espelho em SQLite para consulta, busca e cruzamento.

