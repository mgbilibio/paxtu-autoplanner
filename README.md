# Paxtu AutoPlanner

Aplicação para planejamento de atividades, acompanhamento da progressão e especialidades escoteiras. Mantida por **Margus, Grupo Unisselva, Cuiabá/MT**.

Há dois jeitos de usar o mesmo programa:

- **Desktop (Electron):** `npm run dev` na sua máquina. Perfis locais, pasta de dados, Ollama em `localhost:11434`.
- **Site (GitHub Pages):** [https://mgbilibio.github.io/paxtu-autoplanner/](https://mgbilibio.github.io/paxtu-autoplanner/) — o mesmo UI no navegador, para o **escotista usuário**.

O repositório é público. Quem controla `main` é o Margus (PRs, sem push direto).

## Escopo vigente

- Prioridade: Lobinho e Escoteiro no POR 2025+.
- Progressão: 18 blocos, 80 ações fixas, 230 ações variáveis e reconhecimentos de ramo.
- Especialidades POR 2025+: base pública UEB 2026, com 208 especialidades e 1.385 requisitos.
- Especialidades 2024-1: preservadas para histórico/transição, separadas do fluxo atualizado.
- POR 2020: compatibilidade histórica, separada do fluxo atual.
- Dados: armazenamento local ou pasta compartilhada, segregada por seção e pessoa.

As fontes normativas ficam em `docs/biblioteca/` e a base estruturada, auditável, em `conhecimento/`.

## Dois tipos de acesso (não misturar)

| O quê | Onde | Para quem |
| --- | --- | --- |
| Colaborar no **código** | GitHub (fork + pull request para `main`) | Quem mexe no programa |
| Usar o **planejador** na web | Login no site (Google, ou usuário/senha se o Client ID ainda não estiver configurado) | Escotista usuário |

Não existe tipo “escotista colaborador” dentro do app. Contribuição de código é só pelo GitHub.

## Site no GitHub Pages

URL: `https://mgbilibio.github.io/paxtu-autoplanner/`

Publicação: Actions em push para `main` (`npm run build:web`, sem Electron e **sem** `GEMINI_API_KEY`). Ative uma vez em **Settings → Pages → Source: GitHub Actions**.

### Login web (preferido: Google)

1. Crie no Google Cloud um **OAuth client ID do tipo aplicativo Web** (JavaScript origin). Sem client secret no repo.
2. Origins: `https://mgbilibio.github.io` e `http://localhost:5173` (dev).
3. Coloque o Client ID (público) na variável de repositório `VITE_GOOGLE_CLIENT_ID` (Actions → Variables). O workflow injeta no build.
4. Depois do Google, e-mail/nome viram o `UserProfile` da sessão. A sessão fica em `sessionStorage` (atualizar a página mantém; sair limpa).
5. Sem Client ID, o site continua com **usuário e senha** (PBKDF2 no navegador). Contas ficam no `localStorage` deste browser até existir backend. Exporte/importe JSON só com hashes, nunca senha em texto.

O primeiro Google (ou a primeira senha) neste navegador vira administrador do planejador.

### IA na web

- **Gemini é o padrão**, na classe **Flash-Lite** (barata/rápida). O id padrão é o alias `gemini-flash-lite-latest`, com fallbacks pinados (`gemini-3.5-flash-lite`, etc.). Não usamos Pro por omissão. O seletor de provedor continua visível.
- Cada escotista cola a própria chave do [AI Studio](https://aistudio.google.com/app/apikey) (conta Google, sem cartão). A chave fica **só no localStorage**. Sem chave, a UI permanece e avisa na hora de gerar.
- Se o login Google conseguir um token OAuth da API Gemini (`generative-language`), o site tenta usar; se CORS, app OAuth não verificado ou escopo faltar, volta para “colar chave do AI Studio”.
- **xAI/Grok** é extra opcional: chave colada no localStorage. O site escolhe um modelo barato/rápido do catálogo atual (hoje `grok-4.3`; não há mais `grok-3-mini`). **Não** há “entrar com X” — OAuth xAI não é equivalente ao Google e exigiria SuperGrok/X Premium+ e um Client ID oficial nosso.
- **Ollama local** só no desktop. Na web o controle aparece (paridade), com aviso.

Nenhuma chave de API entra no repositório nem no bundle do Pages.

### Limite do navegador

Grupos, seções, jovens e contas web ficam no **localStorage** deste browser (sem servidor). Não é sincronização entre aparelhos. Faça backup em Configurações → Avançado.

## Desktop

Pré-requisitos: Node.js para interface/empacotamento e Python para ferramentas de validação e geração dos bancos.

```powershell
git clone https://github.com/mgbilibio/paxtu-autoplanner.git
cd paxtu-autoplanner
npm install
npm run dev
```

O picker de perfis local (tela “Quem está usando hoje?”) permanece. Modelos Gemini no desktop continuam os de sempre (`gemini-2.5-flash`, etc.).

Para Gemini no desktop, copie `.env.example` para `.env.local` e informe a chave **só na sua máquina**. Nunca publique `.env.local`.

Só a SPA, sem Electron:

```powershell
npm run dev:web
npm run build:web
```

## Distribuição

O release `20260709-1904` gera em `release/20260709-1904/`:

- `Paxtu AutoPlanner_Setup_20260709-1904.exe`: instalador.
- `Paxtu AutoPlanner_Portable_20260709-1904.exe`: executável portátil.
- `Paxtu AutoPlanner_20260709-1904_x64.zip`: pacote para descompactar e executar.

As três opções dispensam Node.js e Python na máquina da chefia. O arquivo `INICIAR_APP.bat` é apenas para desenvolvimento.

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
