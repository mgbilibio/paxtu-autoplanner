# Paxtu AutoPlanner

Aplicação web para planejamento de atividades, acompanhamento da progressão e especialidades escoteiras. Mantida por **Margus, Grupo Unisselva, Cuiabá/MT**.

O produto é o **site**: [https://mgbilibio.github.io/paxtu-autoplanner/](https://mgbilibio.github.io/paxtu-autoplanner/) — o mesmo UI no navegador, para o **escotista usuário**. Não há outro cliente para instalar.

O repositório é público. Quem controla `main` é o Margus (PRs, sem push direto).

## Escopo vigente

- Prioridade: Lobinho e Escoteiro no POR 2025+.
- Progressão: 18 blocos, 80 ações fixas, 230 ações variáveis e reconhecimentos de ramo.
- Especialidades POR 2025+: base pública UEB 2026, com 208 especialidades e 1.385 requisitos.
- Especialidades 2024-1: preservadas para histórico/transição, separadas do fluxo atualizado.
- POR 2020: compatibilidade histórica, separada do fluxo atual.
- Dados: no site ScoutsAuto, Firestore por seção (tropa/alcateia), ligado ao login.

As fontes normativas ficam em `docs/biblioteca/` e a base estruturada, auditável, em `conhecimento/`.

## Dois tipos de acesso (não misturar)

| O quê | Onde | Para quem |
| --- | --- | --- |
| Colaborar no **código** | GitHub (fork + pull request para `main`) | Quem mexe no programa |
| Usar o **planejador** | Login no ScoutsAuto (Google, X se habilitado, ou e-mail e senha; cadastro próprio, o admin libera) | Escotista usuário |

Não existe tipo “escotista colaborador” dentro do app. Contribuição de código é só pelo GitHub.

## Site no GitHub Pages

URL: `https://mgbilibio.github.io/paxtu-autoplanner/`

Publicação: Actions em push para `main` (`npm run build:web`, **sem** `GEMINI_API_KEY`). Ative uma vez em **Settings → Pages → Source: GitHub Actions**.

### Backend web (Firebase `scoutsauto-d3068`)

O site ScoutsAuto usa **Firebase Auth + Cloud Firestore** (plano Spark, gratuito). O **nome de exibição** no console é `scoutsauto`; o **project ID** (CLI, IAM, `.firebaserc`) é `scoutsauto-d3068`. O projeto fica na conta Google pessoal de quem mantém o repositório — o grupo **não** tem e-mail compartilhado. Cada escotista entra com o **próprio** endereço (Gmail, Google Workspace, `@escoteiros` ou outro domínio). Não há lista de domínios permitidos.

`firebase deploy` sem `--project` usa `scoutsauto-d3068`. O alias `scoutsauto` no `.firebaserc` aponta para o mesmo ID — não crie outro projeto só pelo nome curto.

Não existe cadastro aberto na tropa. Qualquer pessoa com o link do site pode entrar (Google ou e-mail e senha) e fica **pendente** até o administrador liberar seção e papel. Convites prévios são opcionais. Sem as variáveis `VITE_FIREBASE_*`, a tela de login aparece, mas o acesso falha fechado (não há assistente de “primeiro admin” só neste navegador).

1. No [Firebase Console](https://console.firebase.google.com/) o projeto de produção já é **scoutsauto-d3068** (exibição `scoutsauto`, Spark). Não troque o ID.
2. Authentication → ative **Google** e **E-mail/senha**. Opcional: Twitter/X, e então defina `VITE_FIREBASE_AUTH_X=true`.
3. Authorized domains: `mgbilibio.github.io` e `localhost`.
4. Firestore Database → criar (modo produção) e publicar as regras do repositório: `firebase deploy --only firestore:rules` (arquivos `firestore.rules` e `firestore.indexes.json`).
5. Project settings → seus apps → copie os campos públicos para as **Variables** do GitHub Actions (não são service account):

| Variable | Exemplo |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | chave pública do app Web |
| `VITE_FIREBASE_AUTH_DOMAIN` | `scoutsauto.firebaseapp.com` (ou o domínio do projeto `scoutsauto-d3068`) |
| `VITE_FIREBASE_PROJECT_ID` | `scoutsauto-d3068` |
| `VITE_FIREBASE_STORAGE_BUCKET` | bucket do projeto `scoutsauto-d3068` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | número do projeto |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` |
| `VITE_FIREBASE_AUTH_X` | `true` só se o provedor X estiver ligado |

Nunca commitar JSON de service account nem chaves privadas. O workflow `deploy-pages.yml` injeta essas variáveis no `npm run build:web`.

### Login no ScoutsAuto

Tela única: **Continuar com Google**, **Continuar com X** (se habilitado) e **e-mail + senha** com botão de mostrar/ocultar senha. Quem ainda não tem conta usa **Criar conta** (nome de exibição, e-mail e senha).

- Google funciona para Gmail e Google Workspace. Quem tem `@escoteiros` (ou outro) **sem** conta Google usa e-mail e senha.
- Se o Firestore ainda não tem administrador, o **primeiro** login Google ou e-mail bem-sucedido vira admin do grupo (uma vez).
- Depois disso, conta nova fica pendente: “Cadastro enviado. Aguarde o administrador liberar seu acesso.” O administrador libera em Acessos (seção tropa/alcateia + papel) ou recusa. Convite prévio é extra opcional.
- Quem entra com Google para a API Gemini ainda pode usar `VITE_GOOGLE_CLIENT_ID` (OAuth do AI Studio); isso é separado do login Firebase.

### IA no site

- **Gemini é o padrão**, priorizando **Flash-Lite**. Com credencial, o app consulta o catálogo da conta (`models.list`) e prefere um Flash-Lite disponível. **Sem chave, ou se a listagem falhar**, o seletor não fica em branco: usa o padrão `gemini-3.5-flash-lite` e um fallback curto (não é o inventário completo da Gemini). A geração ainda exige chave/token e avisa na hora.
- Cada escotista cola a própria chave do [AI Studio](https://aistudio.google.com/app/apikey) (conta Google, sem cartão). A chave fica **só no localStorage**. Sem chave, a UI permanece e avisa na hora de gerar.
- Se o login Google conseguir um token OAuth da API Gemini (`generative-language`), o site tenta usar; se CORS, app OAuth não verificado ou escopo faltar, volta para “colar chave do AI Studio”.
- **xAI/Grok (Device OAuth):** no site publicado, “Entrar com X / Grok” inicia o Device OAuth no navegador. Device, token e userinfo passam pelo proxy deste app `https://paxtu-xai-proxy.margusbilibio.workers.dev`. Depois do token no `sessionStorage`, catálogo e chat chamam `https://api.x.ai/v1` direto. Não é preciso instalar nada, Vite, npm nem variável de build. Tokens ficam na aba (`sessionStorage`), nunca no Firestore. O Client ID do Device OAuth é público; **não** há client secret no repositório. Uma chave xAI continua sendo alternativa.
- **Sem IA:** em Gerar, “Salvar planejamento” grava o rascunho à mão mesmo incompleto (avisos não bloqueiam). A IA é opcional (“Completar com IA”).
- **Ollama local** no próprio site: sem chave. “Listar modelos” consulta a URL do daemon (padrão `http://127.0.0.1:11434`, também aceita localhost). Se o daemon estiver parado, o CORS bloquear ou o navegador bloquear conteúdo misto, o aviso pede que o Ollama aceite a origem `https://mgbilibio.github.io` — nunca que o usuário abra outro aplicativo. **Ollama Cloud** lista os modelos da chave colada em `https://ollama.com` (Authorization Bearer). IDs Gemini não entram nesses seletores.

Nenhuma chave de API entra no repositório nem no bundle do Pages.

### Dados da seção no site

No ScoutsAuto, tropa/alcateia, jovens, reuniões, progressão, presença e agenda ficam no Firestore, por seção. Chefe e assistentes da mesma seção vêem os mesmos dados em máquinas diferentes. Chaves de IA continuam só neste navegador.

## Backup e troca de dono

O administrador, no site, pode **baixar e restaurar um JSON** em Configurações → Acessos (ou em Gerenciar Perfis): usuários, convites, grupos, seções e documentos da seção. Sem senhas, hashes do Auth nem chaves de API. Funciona no plano Spark, sem Cloud Storage.

**Trocar propriedade**

- O projeto Firebase é um projeto Google Cloud. No [IAM do Google Cloud](https://console.cloud.google.com/iam-admin/iam?project=scoutsauto-d3068), adicione a conta Google da outra pessoa como **Owner**. Ela aceita. Depois o dono original pode ser removido.
- Inclua a mesma pessoa como Owner em Firebase Console → Project settings → Users and permissions.
- A troca **não** exige exportar dados se o projeto continuar o mesmo. Usuários do Auth e o Firestore permanecem.
- Não há e-mail compartilhado do grupo; convide a conta Google pessoal.

**Export oficial (opcional, depois)**

- `gcloud firestore export` para um bucket GCS é o dump oficial; em geral precisa de Blaze e de um bucket. Não é necessário para o uso atual.
- `firebase auth:export accounts.json --project scoutsauto-d3068` exporta contas do Auth (hashes de senha, não texto puro), se o Firebase CLI estiver instalado.

## Desenvolvimento local

Pré-requisitos: Node.js para a interface; Python só para ferramentas de validação e geração dos bancos.

```powershell
git clone https://github.com/mgbilibio/paxtu-autoplanner.git
cd paxtu-autoplanner
npm install
npm run dev
```

`npm run dev` e `npm run dev:web` sobem a mesma SPA no navegador (`vite --mode web`). Para o build publicado:

```powershell
npm run build:web
```

Para Gemini em desenvolvimento, copie `.env.example` para `.env.local` e informe a chave **só na sua máquina**. Nunca publique `.env.local`.

## Validação e release

```powershell
npm test
npm run build:web
python conhecimento/tools/audit_dados_operacionais.py
```

A publicação do produto é o GitHub Pages (`deploy-pages.yml` em push para `main`).

## Estrutura

```text
PaxtuAP/
├── src/                         Interface React, serviços e regras de fluxo
├── workers/xai-proxy            Proxy CORS xOAuth deste app (wrangler name: paxtu-xai-proxy)
├── conhecimento/
│   ├── bd/                      SQLite: progressão, especialidades e biblioteca
│   └── tools/                   Geração, auditoria e checklist
├── docs/                        Manual, versões e instruções de manutenção
└── docs/biblioteca/             PDFs e fontes normativas para auditoria
```

## Documentação

- `docs/usersmanual.html`: uso operacional.
- `docs/codeinstructions.html`: arquitetura, fontes e regras de manutenção.
- `docs/versions.html`: histórico das mudanças.
- `conhecimento/docs/diagnostico_base_operacional.md`: auditoria granular da base.

## Licença

Uso, cópia, modificação, redistribuição e comercialização livres, sem restrições. Consulte `LICENSE.md` quando presente no pacote.
