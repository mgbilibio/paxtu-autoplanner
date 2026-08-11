# Biblioteca de fontes web — UEB Especialidades 2026

Captura local dos materiais originais consultados para a integração das
especialidades públicas da UEB ao PaxtuAP.

## Conteúdo local

- `paginas_consultadas/`: páginas HTML consultadas diretamente.
  - página oficial de Especialidades da UEB;
  - página da Loja Escoteira do Guia de Especialidades e Insígnias dos Ramos Lobinho e Escoteiro;
  - página da Loja Escoteira do Guia de Especialidades e Insígnias dos Ramos Sênior e Pioneiro.
- `raw_html/`: fragmentos públicos do `admin-ajax` da UEB e páginas HTML de cada especialidade capturada.
- `manifest.json`: índice auditável com URLs, contagens, tamanhos e SHA-256.
- `hashes.sha256`: lista simples de hashes para conferência rápida.

## Política de versionamento

Os HTMLs originais ficam guardados localmente nesta pasta de biblioteca, mas
não são versionados no Git por tamanho e por serem regeneráveis. O repositório
versiona o manifesto, os hashes e a base estruturada usada pelo app.

## Regeneração

```powershell
python conhecimento\tools\scrape_ueb_especialidades_2026.py
```

O scraper usa esta biblioteca como cache de origem e gera:

- `conhecimento/especialidades/2026_ueb_atualizado/especialidades_ueb_2026.json`
- `src/data/generated/especialidades_ueb_2026.ts`

## Fontes principais

- https://www.escoteiros.org.br/especialidades/
- https://loja.escoteiros.org.br/guia-de-especialidades-e-insignias-ramos-lobinho-e-escoteiro-ebook/
- https://loja.escoteiros.org.br/guia-de-especialidades-e-insignias-ramos-senior-e-pioneiro-ebook/
