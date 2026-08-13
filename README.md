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
- Dados: no desktop, pasta local ou compartilhada; no site ScoutsAuto, Firestore por seção (tropa/alcateia), ligado ao login.

As fontes normativas ficam em `docs/biblioteca/` e a base estruturada, auditável, em `conhecimento/`.

## Dois tipos de acesso (não misturar)

| O quê | Onde | Para quem |
| --- | --- | --- |
| Colaborar no **código** | GitHub (fork + pull request para `main`) | Quem mexe no programa |
| Usar o **planejador** na web | Login no ScoutsAuto (Google, X se habilitado, ou e-mail e senha; cadastro próprio, o admin libera) | Escotista usuário |

Não existe tipo “escotista colaborador” dentro do app. Contribuição de código é só pelo GitHub.

## Site no GitHub Pages

URL: `https://mgbilibio.github.io/paxtu-autoplanner/`

Publicação: Actions em push para `main` (`npm run build:web`, sem Electron e **sem** `GEMINI_API_KEY`). Ative uma vez em **Settings → Pages → Source: GitHub Actions**.

### Backend web (Firebase `scoutsauto`)

O site ScoutsAuto usa **Firebase Auth + Cloud Firestore** (plano Spark, gratuito). O projeto chama-se `scoutsauto` e fica na conta Google pessoal de quem mantém o repositório — o grupo **não** tem e-mail compartilhado. Cada escotista entra com o **próprio** endereço (Gmail, Google Workspace, `@escoteiros` ou outro domínio). Não há lista de domínios permitidos.

Não existe cadastro aberto na tropa. Qualquer pessoa com o link do site pode entrar (Google ou e-mail e senha) e fica **pendente** até o administrador liberar seção e papel. Convites prévios são opcionais. Sem as variáveis `VITE_FIREBASE_*`, a tela de login aparece, mas o acesso falha fechado (não há assistente de “primeiro admin” só neste navegador).

1. No [Firebase Console](https://console.firebase.google.com/) crie o projeto **scoutsauto** (Spark).
2. Authentication → ative **Google** e **E-mail/senha**. Opcional: Twitter/X, e então defina `VITE_FIREBASE_AUTH_X=true`.
3. Authorized domains: `mgbilibio.github.io` e `localhost`.
4. Firestore Database → criar (modo produção) e publicar as regras do repo: `firebase deploy --only firestore:rules` (arquivos `firestore.rules` e `firestore.indexes.json`).
5. Project settings → seus apps → copie os campos públicos para as **Variables** do GitHub Actions (não são service account):

| Variable | Exemplo |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | chave pública do app Web |
| `VITE_FIREBASE_AUTH_DOMAIN` | `scoutsauto.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `scoutsauto` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `scoutsauto.appspot.com` |
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

### IA na web

- **Gemini é o padrão**, na classe **Flash-Lite** (barata/rápida). O id padrão é `gemini-3.5-flash-lite` (GA); o seletor também lista `gemini-flash-lite-latest`, **Gemini 3.6 Flash** e **Gemini 3.7 Flash** (mais capaz, 13 ago 2026). A escolha fica no localStorage. Não usamos Pro por omissão.
- Cada escotista cola a própria chave do [AI Studio](https://aistudio.google.com/app/apikey) (conta Google, sem cartão). A chave fica **só no localStorage**. Sem chave, a UI permanece e avisa na hora de gerar.
- Se o login Google conseguir um token OAuth da API Gemini (`generative-language`), o site tenta usar; se CORS, app OAuth não verificado ou escopo faltar, volta para “colar chave do AI Studio”.
- **xAI/Grok** é extra opcional: chave colada no localStorage. O site escolhe um modelo barato/rápido do catálogo atual (hoje `grok-4.3`; não há mais `grok-3-mini`). “Continuar com X” no login do ScoutsAuto é o provedor Twitter/X do Firebase (se `VITE_FIREBASE_AUTH_X` estiver ligado), não o OAuth da API xAI.
- **Ollama local** só no desktop. Na web o controle aparece (paridade), com aviso.

Nenhuma chave de API entra no repositório nem no bundle do Pages.

### Dados da seção no site

No ScoutsAuto web, tropa/alcateia, jovens, reuniões, progressão, presença e agenda ficam no Firestore, por seção. Chefe e assistentes da mesma seção vêem os mesmos dados em máquinas diferentes. Chaves de IA continuam só neste navegador. O desktop (`npm run dev`) segue com pasta no disco.

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
