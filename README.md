# Paxtu AutoPlanner

Aplicação desktop local para planejamento de atividades, acompanhamento da progressão e especialidades escoteiras. Mantida por **Margus, Grupo Unisselva, Cuiabá/MT**.

## Escopo vigente

- Prioridade: Lobinho e Escoteiro no POR 2025+.
- Progressão: 18 blocos, 80 ações fixas, 230 ações variáveis e reconhecimentos de ramo.
- Especialidades POR 2025+: base pública UEB 2026, com 208 especialidades e 1.385 requisitos.
- Especialidades 2024-1: preservadas para histórico/transição, separadas do fluxo atualizado.
- POR 2020: compatibilidade histórica, separada do fluxo atual.
- Dados: armazenamento local ou pasta compartilhada, segregada por seção e pessoa.

As fontes normativas ficam em `docs/biblioteca/` e a base estruturada, auditável, em `conhecimento/`.

## Distribuição

O release `20260709-1904` gera em `release/20260709-1904/`:

- `Paxtu AutoPlanner_Setup_20260709-1904.exe`: instalador.
- `Paxtu AutoPlanner_Portable_20260709-1904.exe`: executável portátil.
- `Paxtu AutoPlanner_20260709-1904_x64.zip`: pacote para descompactar e executar.

As três opções dispensam Node.js e Python na máquina da chefia. O arquivo `INICIAR_APP.bat` é apenas para desenvolvimento.

## Desenvolvimento

Pré-requisitos: Node.js para interface/empacotamento e Python para ferramentas de validação e geração dos bancos.

```powershell
npm install
npm run dev
```

Para usar Gemini, copie `.env.example` para `.env.local` e informe a chave localmente. Nunca publique `.env.local`.

Para clonar:

```powershell
git clone https://github.com/mgbilibio/paxtu-autoplanner.git
cd paxtu-autoplanner
npm install
npm run dev
```

## Validação e release

```powershell
npm run build
python conhecimento/tools/audit_dados_operacionais.py
python conhecimento/tools/run_release_check.py --dist
```

## Estrutura

```text
PaxtuAP/
├── src/                         Interface React, serviços e regras de fluxo
├── electron/                    Processo Electron e IPC
├── conhecimento/
│   ├── bd/                      SQLite: progressão, especialidades e biblioteca
│   └── tools/                   Geração, auditoria e checklist de release
├── docs/                        Manual, versões e instruções de manutenção
├── docs/biblioteca/             PDFs e fontes normativas para auditoria
└── release/                     Artefatos distribuíveis por data e hora
```

## Documentação

- `docs/usersmanual.html`: uso operacional e distribuição.
- `docs/codeinstructions.html`: arquitetura, fontes e regras de manutenção.
- `docs/versions.html`: histórico das mudanças.
- `conhecimento/docs/diagnostico_base_operacional.md`: auditoria granular da base.

## Licença

Uso, cópia, modificação, redistribuição e comercialização livres, sem restrições. Consulte `LICENSE.md` quando presente no pacote.

