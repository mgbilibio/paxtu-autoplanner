# Ajustes do gerador em 2026-05-15

## Pedido
- Ollama estava truncando respostas com contexto 16k.
- Botao de regerar nao estava confiavel.
- Feedback visual de processamento era insuficiente.
- Atividade personalizada precisava ser amarrada a progressao ou especialidade.
- Roteiros precisam incluir IBOA, hidratacao/banheiro e encerramento da bandeira.
- HTML mobile precisava ficar mais proximo do layout visual do roteiro.

## Implementado
- Ollama passou a usar `num_ctx=32768`, `num_predict=12000` e `keep_alive=20m` na geracao de roteiro.
- Ajuda local manteve contexto menor e resposta curta para nao desperdiçar memoria.
- Regerar agora chama `handleGenerate` por prop direta em `PlanDisplay`, sem evento global com estado antigo.
- Geracao mostra mensagem persistente com tempo decorrido.
- Atividade personalizada passa por `customObjectiveMatcher.ts`, que localiza possiveis vinculos no catalogo e envia esses vinculos no prompt.
- `meetingScheduleService.ts` injeta blocos operacionais: IBOA/abertura, intervalos de banheiro/hidratacao e encerramento da bandeira.
- Horario padrao do roteiro ficou `15:30`, editavel no gerador.
- HTML exportado ganhou hero colorido, cards com bordas coloridas, horarios reais e blocos operacionais destacados.
- Configuracoes de IA agora permitem ajustar contexto e saida maxima do Ollama.
- Banner de geracao ganhou cancelamento; no Electron, chamadas Ollama ativas sao abortadas pelo processo principal.
- Exportacoes HTML agora abrem previa interna antes de baixar o arquivo.
- Ciclo, agenda e backups/importacoes emitem feedback de processamento com tempo decorrido.

## Validacao
- `npm run build` executado em `E:\PY\paxtuplanner\PaxtuAP` e aprovado.
- Tela inicial carregada em `http://127.0.0.1:5173/` no navegador local.
- Release autorizado pelo usuario nesta rodada.

## Pontos ainda recomendados
- Testar modelos Ollama diferentes para definir limite seguro por maquina.
- Mostrar aviso quando `num_ctx=32768` falhar por memoria.
- Fazer teste operacional real com uma chefia usando pasta sincronizada.
