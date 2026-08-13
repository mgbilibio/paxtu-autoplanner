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
- Dados: no desktop, pasta local ou compartilhada; na web, Firestore por seção.

As fontes normativas ficam em `docs/biblioteca/` e a base estruturada, auditável, em `conhecimento/`.

## Dois tipos de acesso (não misturar)

| O quê | Onde | Para quem |
| --- | --- | --- |
| Colaborar no **código** | GitHub (fork + pull request para `main`) | Quem mexe no programa |
| Usar o **planejador** na web | Login no site (Google / X / e-mail) | Escotista cadastrado pelo admin do grupo |

Não existe tipo “escotista colaborador” dentro do app. Contribuição de código é só pelo GitHub.

## Site no GitHub Pages

URL: `https://mgbilibio.github.io/paxtu-autoplanner/`

Publicação: Actions em push para `main` (`npm run build:web`, sem Electron e **sem** `GEMINI_API_KEY`). Ative uma vez em **Settings → Pages → Source: GitHub Actions**.

### Login web (Firebase)

O site usa **Firebase Auth + Cloud Firestore** (plano Spark). Dados da tropa/alcateia **não** ficam no localStorage — dois chefes em dois aparelhos veem a mesma seção.

1. Crie um projeto Firebase, ative Authentication (Google; Twitter/X se quiser; e-mail/senha) e Firestore.
2. Cole as regras de `firestore.rules` no console.
3. Em Authentication → Settings → Authorized domains: `mgbilibio.github.io` e `localhost`.
4. Copie os valores **públicos** do app (Project settings) para as variáveis de repositório:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
5. Opcional: `VITE_FIREBASE_ENABLE_X=true` para mostrar **Continuar com X** (o provedor precisa estar ativo no Firebase).
6. Sem essas variáveis o site mostra um aviso em português e **não** inventa dados no navegador.
7. Nunca coloque JSON de service account no repositório.

Tela de entrada: **Continuar com Google**, opcionalmente **Continuar com X**, e e-mail + senha com olho de mostrar/ocultar. Não há “criar conta” público.

A primeira pessoa que entrar, se ainda não houver administrador no Firestore, vira admin do grupo (uma vez). Depois disso, e-mail desconhecido ouve: *Peça ao administrador do grupo para te cadastrar.*

O admin cadastra usuários por e-mail, nome, seção e papel (Chefe, Assistente, Diretoria, Leitura, ADMINISTRADOR) e pode desativar contas.

Chaves de IA (Gemini/xAI) continuam só no navegador de cada chefia.

### IA na web

- **Gemini é o padrão**, na classe **Flash-Lite** (barata/rápida). O id padrão é `gemini-3.5-flash-lite` (GA); o seletor também lista `gemini-flash-lite-latest`, **Gemini 3.6 Flash** e **Gemini 3.7 Flash** (mais capaz, 13 ago 2026). A escolha fica no localStorage. Não usamos Pro por omissão.
- Cada escotista cola a própria chave do [AI Studio](https://aistudio.google.com/app/apikey) (conta Google, sem cartão). A chave fica **só no localStorage**. Sem chave, a UI permanece e avisa na hora de gerar.
- Se o login Google conseguir um token OAuth da API Gemini (`generative-language`), o site tenta usar; se CORS, app OAuth não verificado ou escopo faltar, volta para “colar chave do AI Studio”.
- **xAI/Grok** é extra opcional: chave colada no localStorage. O site escolhe um modelo barato/rápido do catálogo atual (hoje `grok-4.3`; não há mais `grok-3-mini`). **Não** há “entrar com X” — OAuth xAI não é equivalente ao Google e exigiria SuperGrok/X Premium+ e um Client ID oficial nosso.
- **Ollama local** só no desktop. Na web o controle aparece (paridade), com aviso.

Nenhuma chave de API entra no repositório nem no bundle do Pages.

### Dados da seção

Na web, jovens, reuniões, progressão e agenda da seção ficam no **Firestore**, por `sections/{id}/...`. No desktop, o filesystem (pasta local ou compartilhada) continua valendo (`npm run dev`).

## Desktop

Pré-requisitos: Node.js para interface/empacotamento e Python para ferramentas de validação e geração dos bancos.

```powershell
git clone https://github.com/mgbilibio/paxtu-autoplanner.git
cd paxtu-autoplanner
npm install
npm run dev
```

O picker de perfis local (tela “Quem está usando hoje?”) permanece. O seletor Gemini (3.7 / 3.6 / Lite) é o mesmo da web; o padrão é Flash-Lite.

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
