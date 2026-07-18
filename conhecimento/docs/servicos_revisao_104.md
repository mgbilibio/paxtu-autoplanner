# Revisao dos 104 Servicos

Base valida de trabalho:

- Banco: `conhecimento/bd/conhecimento_db_v19.sqlite`
- Total de fichas: 104
- Total de passos: 1083
- Total de observacoes: 1083
- Total de revisoes: 104

## Resultado da auditoria estrutural

- Slugs unicos: 104
- Titulos unicos: 104
- Fontes oficiais com pagina marcada: 104
- Arquivos markdown correspondentes: 104
- Registros faltando arquivo local: 0

## Casos de fronteira

### Socorrismo

- Slug: `socorrismo`
- Requisitos: 13
- Pagina oficial: exata
- Observacao: e uma ficha de fronteira, porque conversa com a progressao de primeiros socorros e com pratica de atendimento. Deve ser exibida separada das fichas comuns.

### Primeiros Socorros

- Slug: `primeiros-socorros`
- Requisitos: 18
- Pagina oficial: exata
- Observacao: e uma ficha separada de Socorrismo e precisa aparecer como especialidade distinta no painel.

## Casos checados e coerentes

- Barismo
- Garçom
- Licenciatura
- Lides Campeiras
- Liturgia Católica
- Missionário Católico
- Serralheria

## Leitura pratica

O ramo `Serviços` já está pronto estruturalmente. O trabalho restante agora é:

1. Dar destaque visual aos casos de fronteira.
2. Revisar semântica fina dos títulos mais delicados.
3. Depois expandir o mesmo padrão para as outras áreas de especialidade.

## Próximo corte

- Consolidar a apresentação de `Primeiros Socorros` e `Socorrismo` como fichas distintas.
- Revisar os outros 102 itens apenas por amostragem, porque a integridade já bateu.
