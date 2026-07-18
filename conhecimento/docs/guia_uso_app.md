# Guia de Uso do PaxTuPlanner

> **Versão**: 20260429-1923 | **Data**: 2026-04-29 19:23 | **Público-alvo**: chefia, assistentes e diretoria
> **Autor principal**: Margus, Grupo Unisselva, Cuiabá-MT

## 1. Objetivo
Este guia resume o uso diário do app na rotina da seção. A ideia e mostrar o caminho mais curto para configurar, registrar, acompanhar e consultar os dados sem depender da conversa de desenvolvimento.

## 2. Pré-requisitos
- Ter o app aberto pelo `INICIAR_APP.bat`.
- Ter configurado a pasta de dados.
- Ter criado ao menos um grupo, uma seção e um usuário.
- Para uso compartilhado, combinar previamente quem edita e quem consulta.

## 3. Passo a passo

### 3.1 Primeiro acesso
1. Abra o app.
2. No assistente inicial, escolha o provedor de IA.
3. Defina a pasta de dados.
4. Escolha `local` ou `pasta compartilhada`.
5. Salve a configuração.

### 3.2 Estrutura da seção
1. Entre em `Gerenciar Perfis`.
2. Crie o grupo.
3. Crie a seção.
4. Crie as equipes.
5. Crie os usuários da chefia.

### 3.3 Login e operação
1. Faça login com o perfil correto.
2. Chefia e assistentes entram no painel operacional.
3. Diretoria e leitura entram na visão de relatórios.
4. Use o painel da chefia para abrir membros, gerar atividade e planejar ciclo.

### 3.4 Efetivo e ficha individual
1. Abra `Efetivo`.
2. Selecione um jovem.
3. Abra a ficha consolidada.
4. Registre dados de acompanhamento, presença, progressão e observações.
5. Abra a ficha de especialidades quando necessário.

### 3.5 Progressão 2025+
1. Abra a ficha do jovem.
2. Marque ações fixas e variáveis dos blocos.
3. Registre substituições quando houver equivalência aprovada.
4. Use o reconhecimento de ramo quando a progressão estiver completa.

### 3.6 Especialidades
1. Abra `Fichas de especialidades`.
2. Pesquise a especialidade.
3. Marque o status de cada requisito.
4. Registre evidência, avaliador e notas.
5. Imprima a ficha quando for homologar.

### 3.7 Reuniões e ciclo
1. Abra `Gerar`.
2. Selecione ramo, objetivos e tema.
3. Gere o roteiro.
4. Salve no catálogo se o plano servir.
5. Use `Ciclo` para distribuir temas e pendências em semanas.
6. Use `Exportar HTML` para salvar roteiro ou ciclo em página responsiva para leitura em celular.
7. Ajuste o horário de início, por padrão `15:30`, e marque se o roteiro deve incluir IBOA, intervalos de banheiro/hidratação e encerramento da bandeira.
8. Para atividade personalizada, use `Amarrar`; o app sugere vínculos com progressão, especialidades ou insígnias para a IA considerar.

### 3.7.1 Exportação HTML em campo
1. No roteiro gerado, clique em `Exportar HTML` para salvar o roteiro detalhado.
2. No `Catálogo`, use o botão `HTML` do card do roteiro.
3. No `Ciclo`, use `HTML` para salvar o ciclo completo com semanas, critérios e avaliação.
4. No `Calendário`, abra o evento e clique em `Exportar HTML`.
5. Se o evento tiver roteiro vinculado, o HTML traz o roteiro completo; se for evento avulso, traz data, notas e presença.

### 3.8 Busca e consulta
1. Use `Ctrl+K`.
2. Pesquise por progressão, especialidades, requisitos, agenda ou biblioteca.
3. Abra o resultado para navegar direto na origem.

### 3.9 Compartilhamento sem servidor
1. Em equipe, use a mesma pasta sincronizada.
2. Uma pessoa por vez edita a mesma seção.
3. Se houver conflito, o app entra em modo consulta.
4. Use `Assumir edição` apenas quando tiver certeza de que o outro acesso ficou aberto.

## 4. Exemplos reais
- Chefia abre o painel, vê jovens com pendências e monta a reunião do sábado.
- Assistente marca progresso e registra evidências de especialidades.
- Diretoria entra em relatórios para ver frequência média, avanço médio e jovens sem progresso.

## 5. Alertas e boas práticas
> ⚠️ Use backup antes de mexer em muita coisa.
> ✅ Prefira pasta compartilhada com disciplina de edição, não edição simultânea livre.
> ❌ Não assuma edição de uma seção sem combinar com a outra chefia.
> ❌ Não trate ficha de especialidade como checklist solto; ela precisa de evidência e avaliação.

## 6. Próximos passos
- Ler o manual do usuário para visão geral.
- Ler o guia técnico para manutenção.
- Revisar o checklist de release antes de distribuir.

## Glossário
| Termo | Definição |
|-------|-----------|
| Ficha consolidada | Tela que resume o acompanhamento completo de um jovem. |
| Lock de edição | Trava temporária que evita gravação simultânea na mesma seção. |
| Modo consulta | Estado em que a seção fica visível, mas sem edição. |

## Histórico de revisões
| Versão | Data | Mudança |
|--------|------|---------|
| 20260429-1923 | 2026-04-29 19:23 | Revisão para o fluxo atual do app, com compartilhamento, ficha consolidada e especialidades por requisito. |
| 20260429-1923 | 2026-04-29 21:05 | Restaurada exportação HTML responsiva para roteiro, catálogo, ciclo e calendário. |
| 20260515 | 2026-05-15 | Gerador revisado com Ollama 32k, feedback com tempo decorrido, regeração corrigida, atividade personalizada amarrada ao catálogo e blocos operacionais com horário. |

## Fontes e Créditos

As fontes oficiais e os créditos de autoria ficam em
`conhecimento/docs/creditos_autoria_fontes_2026-04-29.md`.
