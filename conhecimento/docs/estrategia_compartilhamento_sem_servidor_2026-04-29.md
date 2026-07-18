# Estrategia de compartilhamento sem servidor

Data: 2026-04-29  
Contexto: app privado, local, sem servidor dedicado  
Hipotese principal: pasta do Google Drive compartilhada entre chefias  

## 1. Problema real

O app nasceu local, mas a operacao real da secao envolve mais de uma chefia.
Se todos usarem apenas a propria maquina, os dados se fragmentam. Se todos
usarem a mesma pasta sincronizada sem cuidado, pode haver conflito de arquivos.

O Google Drive resolve distribuicao e backup basico, mas nao e banco de dados
multiusuario. Ele sincroniza arquivos. Quando duas pessoas editam o mesmo arquivo
ao mesmo tempo, pode gerar conflito, copia duplicada ou perda da ultima alteracao.

## 2. Opcoes possiveis

### Opcao A: um computador mestre

- **Como funciona**: uma pessoa opera o app e as demais enviam informacoes.
- **Vantagem**: menor risco tecnico.
- **Problema**: cria gargalo e nao atende bem assistentes.
- **Uso recomendado**: fase de teste ou reuniao pequena.

### Opcao B: pasta Google Drive compartilhada com turnos de edicao

- **Como funciona**: todos instalam o app, mas apontam para a mesma pasta do Drive.
- **Vantagem**: nao exige servidor e usa conta Google ja disponivel.
- **Problema**: nao pode haver edicao simultanea do mesmo conjunto de dados.
- **Uso recomendado**: melhor opcao inicial.

### Opcao C: pasta Google Drive compartilhada com area por chefia

- **Como funciona**: cada chefia grava rascunhos/evidencias em sua area; chefe consolida.
- **Vantagem**: reduz conflito.
- **Problema**: exige fluxo de consolidacao.
- **Uso recomendado**: quando varios assistentes registram evidencias.

### Opcao D: Google Sheets como camada comum

- **Como funciona**: dados principais ficam em planilhas compartilhadas.
- **Vantagem**: multiusuario real do Google.
- **Problema**: exige API, credenciais, mapeamento e aumenta complexidade.
- **Uso recomendado**: fase futura, se a pasta compartilhada ficar insuficiente.

### Opcao E: Firebase/Supabase/servidor

- **Como funciona**: app usa backend online.
- **Vantagem**: multiusuario adequado.
- **Problema**: foge da premissa atual de nao ter servidor dedicado.
- **Uso recomendado**: fora do escopo imediato.

## 3. Recomendacao

Adotar inicialmente a **Opcao B com salvaguardas**, evoluindo para a Opcao C se
mais de uma pessoa precisar registrar dados durante a mesma reuniao.

Regra operacional:

1. A pasta de dados fica dentro do Google Drive compartilhado.
2. Apenas uma pessoa faz edicoes estruturais por vez.
3. Assistentes podem consultar e preparar planos.
4. Durante atividade, se varios adultos registrarem evidencias, cada um usa area
   propria ou anota no app apos combinar quem esta editando.
5. Antes de reuniao importante, gerar backup completo.
6. Depois de edicoes grandes, aguardar sincronizacao do Drive concluir.

## 4. Estrutura recomendada da pasta compartilhada

```text
PaxtuPlanner_Dados/
  paxtu_workspace.json
  paxtu_members.json
  paxtu_calendar.json
  paxtu_sections.json
  paxtu_users.json
  paxtu_catalog.json
  progression/
  bloco_progress_2025/
  specialty_progress/
  backups/
  incoming/
    assistente_joao/
    assistente_maria/
  results/
```

Estrutura granular implementada para novos registros:

```text
PaxtuPlanner_Dados/
  sections/
    secao_ou_tropa_id/
      jovens/
        jovem_id/
          perfil.json
          progressao_2025/
            bloco_01.json
            bloco_02.json
            reconhecimento_1.json
          especialidades/
            especialidade_10.json
      adultos/
        adulto_id/
          perfil.json
```

Os arquivos globais continuam existindo como indice e compatibilidade. A pasta por
jovem/adulto reduz o risco de conflito em Google Drive, porque duas chefias tendem
a mexer em arquivos diferentes quando acompanham jovens diferentes.

## 5. O que o app deve implementar

### Fase 1: aviso e modo de pasta compartilhada

- Campo de configuracao: `syncMode = local | sharedFolder`.
- Aviso visual quando a pasta for Google Drive, OneDrive ou Dropbox.
- Manual interno explicando que nao ha edicao simultanea garantida.

### Fase 2: arquivo de identidade do workspace

- Criar `paxtu_workspace.json` com:
  - `workspaceId`
  - `groupName`
  - `createdAt`
  - `lastOpenedAt`
  - `lastOpenedBy`
  - `syncMode`
- Usar esse arquivo para detectar se varias maquinas estao abrindo a mesma base.

### Fase 3: lock leve de edicao

- Criar `paxtu_edit_lock.json` quando alguem entra em modo edicao.
- Conteudo:
  - `userId`
  - `userName`
  - `machineName` quando disponivel
  - `startedAt`
  - `expiresAt`
- Se outro usuario tentar editar com lock ativo, mostrar aviso e permitir somente leitura ou assumir lock manualmente.

Status inicial implementado:

- Ao entrar em uma secao com `syncMode = sharedFolder`, o app grava
  `sections/<secao>/paxtu_edit_lock.json`.
- O lock expira em 45 minutos.
- Ao sair do perfil, o app marca `releasedAt`.
- Se outra chefia abrir a mesma secao com lock ativo de outra pessoa, o app
  mostra um banner de aviso com nome e horario de expiracao.
- Quando ha conflito, a interface entra em modo consulta para a secao:
  caminhos de geracao, ciclo, agenda e efetivo deixam de aparecer.
- O usuario pode usar relatorios e consultas.
- O botao "Assumir edicao" sobrescreve o lock somente apos confirmacao explicita.

### Fase 4: revisoes por arquivo

- Todo arquivo gravado deve ter `lastUpdate`, `updatedBy` e `revisionId`.
- Antes de salvar, comparar a revisao em disco com a revisao carregada.
- Se divergir, mostrar conflito e preservar as duas versoes.

### Fase 5: importacao de contribuicoes

- Assistentes podem exportar contribuicoes para `incoming/`.
- Chefe importa e consolida evidencias, marcacoes e comentarios.

## 6. Decisoes para versao final

- Nao prometer colaboracao simultanea.
- Prometer compartilhamento por pasta sincronizada com seguranca operacional.
- Tratar Google Drive como transporte e backup, nao como banco multiusuario.
- Usar arquivos fatiados por jovem/bloco/especialidade para reduzir conflito.
- Manter backup completo simples antes de importacoes e consolidacoes.

## 7. Frase de produto

> O app funciona sem servidor, usando uma pasta compartilhada em nuvem. Para
> proteger os dados, ele usa arquivos locais, backups e avisos de conflito.
> A edicao simultanea livre nao e garantida nesta versao.
