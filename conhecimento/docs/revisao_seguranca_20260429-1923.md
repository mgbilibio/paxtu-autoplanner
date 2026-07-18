# Revisao de Seguranca - 20260429-1923

Data da revisao: 2026-04-30

## Escopo

Foram revisados os pontos de entrada do app desktop:

- IPC Electron
- leitura e escrita de arquivos
- abertura de PDFs
- busca FTS5
- proxy local do Ollama
- importacao de backups
- renderizacao de conteudo no React

## Correcoes aplicadas

- Removida exposicao generica de `ipcRenderer` no `window`.
- `BrowserWindow` agora usa `sandbox`, `webSecurity` e bloqueio de permissoes.
- Navegacao externa e `window.open` sao negados por padrao; links web abrem fora do app.
- Caminhos de arquivo no IPC agora bloqueiam path traversal, caminho absoluto em nome de arquivo e bytes nulos.
- Escrita de arquivo cria apenas o diretorio final validado.
- Busca FTS limita query e quantidade de resultados.
- Proxy Ollama aceita apenas `GET`/`POST`, path `/api/*` e hosts de loopback.
- URL do Ollama no renderer tambem foi limitada a `localhost`, `127.0.0.1` ou `::1`.
- Importacao de backup agora limita tamanho, valida estrutura basica e trata JSON invalido sem quebrar a tela.
- Backup completo nao exporta a chave Gemini.

## Resultado da varredura

- Nao foi encontrado uso de `dangerouslySetInnerHTML`, `innerHTML`, `eval` ou `new Function` em `src`.
- Abertura de PDF permanece com whitelist de nomes autorizados.
- `npm run build` passou apos as mudancas.

## Riscos residuais

- Dados locais nao sao criptografados em repouso. Quem tiver acesso ao computador, pendrive ou pasta compartilhada pode copiar os arquivos.
- O modo Gemini envia prompts e dados usados na geracao para servico externo. Para maxima privacidade, usar Ollama local.
- O app nao implementa login com senha forte ou controle criptografico de identidade; os perfis sao operacionais.
- Pasta em Google Drive/OneDrive depende de disciplina de uso e sincronizacao correta.

## Recomendacao operacional

- Para dados reais de jovens, usar pasta de dados em local confiavel e com acesso limitado.
- Evitar enviar backups completos em grupos abertos.
- Preferir backup de progressao quando a finalidade for auditoria ou suporte.
- Usar Ollama local quando houver informacao sensivel no prompt.
