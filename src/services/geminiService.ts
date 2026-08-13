import { GoogleGenAI } from "@google/genai";
import { MeetingPlan, GeneratorParams, GroundingSource } from "../types";
import { getStoredApiKey } from "./storageService";
import { SectionAnalysis } from "./recommendationService";
import { buildManuaisContextForBranch } from '../data/manuaisReferencia';
import { normalizePlanForUse } from './planNormalizationService';
import { getProgressionDetail } from './progressionDetailService';
import { extractJson } from './llmJson';
import { isWebApp } from './platform';
import { getGeminiOAuthAccessToken } from './googleAuth';

// Remove possiveis segredos (api key) de mensagens de erro da SDK antes de
// exibir/logar — a SDK as vezes ecoa a URL da request com a chave.
const sanitizeLlmError = (error: any): string =>
  String(error?.message || error || 'Desconhecido')
    .replace(/key=[\w-]+/gi, 'key=***')
    .replace(/AIza[\w-]{10,}/g, '***');

const GEMINI_MISSING_KEY =
  'Chave Gemini não configurada. Obtenha uma chave grátis em https://aistudio.google.com/app/apikey (conta Google, sem cartão) e cole em Configurações.';

// Resolve a chave Gemini. Producao usa SOMENTE getStoredApiKey() — nunca embute
// VITE_GEMINI_API_KEY no bundle. Em dev (import.meta.env.DEV) aceita a env como
// conveniencia local; nunca em build de producao.
const resolveApiKey = (): string | undefined => {
  if (import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY as string;
  }
  return getStoredApiKey() ?? undefined;
};

// Web: classe Flash-Lite barata/rápida. O alias -latest acompanha o id vigente
// no @google/genai / Gemini API; os demais são fallbacks pinados (jul/2026).
export const WEB_GEMINI_LITE_CANDIDATES = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
];

export const DESKTOP_DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const getDefaultGeminiModel = (): string =>
  isWebApp() ? WEB_GEMINI_LITE_CANDIDATES[0] : DESKTOP_DEFAULT_GEMINI_MODEL;

const geminiVersionScore = (id: string): number => {
  const match = id.match(/gemini-(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
};

export const pickPreferredGeminiModel = (models: string[], current?: string): string => {
  if (models.length === 0) return getDefaultGeminiModel();
  if (isWebApp()) {
    const lite = models.filter(id => /flash-lite/i.test(id) && !/pro/i.test(id) && !/image/i.test(id));
    if (current && lite.includes(current)) return current;
    const latestAlias = lite.find(id => /flash-lite-latest/i.test(id));
    if (latestAlias) return latestAlias;
    if (lite.length > 0) {
      return [...lite].sort((a, b) => geminiVersionScore(b) - geminiVersionScore(a) || b.localeCompare(a))[0];
    }
    for (const candidate of WEB_GEMINI_LITE_CANDIDATES) {
      if (models.includes(candidate)) return candidate;
    }
    const flash = models.find(id => /flash/i.test(id) && !/pro/i.test(id) && !/image/i.test(id));
    return flash || WEB_GEMINI_LITE_CANDIDATES[0];
  }
  const prefOrder = [
    'gemini-2.5-flash',
    'gemini-3.1-flash-live-preview',
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  return prefOrder.find(id => models.includes(id)) || (current && models.includes(current) ? current : models[0]);
};

export const hasGeminiCredentials = (): boolean =>
  Boolean(resolveApiKey() || (isWebApp() && getGeminiOAuthAccessToken()));

const generateGeminiText = async (modelId: string, prompt: string, temperature = 0.5): Promise<{ text: string; finishReason?: string }> => {
  const apiKey = resolveApiKey();
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature },
    });
    return { text: res.text || '', finishReason: (res as { candidates?: Array<{ finishReason?: string }> })?.candidates?.[0]?.finishReason };
  }
  const oauth = isWebApp() ? getGeminiOAuthAccessToken() : undefined;
  if (oauth) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature },
        }),
      },
    );
    const body = await response.json() as {
      error?: { message?: string };
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!response.ok) {
      throw new Error(body.error?.message || `Gemini OAuth HTTP ${response.status}. Cole uma chave do AI Studio em Configurações.`);
    }
    const text = body.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
    return { text, finishReason: body.candidates?.[0]?.finishReason };
  }
  throw new Error(GEMINI_MISSING_KEY);
};

export interface SmartSuggestion {
  theme: string;
  rationale: string;
  recommendedItemCodes: string[];
}

// Q&A genérico para Painel de Ajuda — sem JSON, resposta livre em português.
// A geração principal usa o modelo escolhido no dropdown; na web o padrão é Flash-Lite.

export const askGemini = async (question: string, context: string, modelId?: string): Promise<string> => {
    if (!hasGeminiCredentials()) throw new Error(GEMINI_MISSING_KEY);
    const model = modelId || getDefaultGeminiModel();
    const system = 'Você é um assistente experiente em escotismo (UEB) e no app Paxtu AutoPlanner. Responda em português brasileiro, de forma direta e prática, em até 3 parágrafos. Use o contexto fornecido para fundamentar a resposta. Se a pergunta sair do escopo do app ou escotismo, diga isso de forma cordial.';
    const user = `CONTEXTO DO APP:\n${context}\n\nPERGUNTA DO CHEFE:\n${question}`;
    try {
      const result = await generateGeminiText(model, `${system}\n\n${user}`);
      return result.text;
    } catch (e) {
      throw new Error('Erro na IA: ' + sanitizeLlmError(e));
    }
};

const callGeminiSimple = async (_apiKey: string, modelId: string, systemPrompt: string, userPrompt: string): Promise<string> => {
    const result = await generateGeminiText(modelId, systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt);
    return result.text;
};

export const generateSmartSuggestions = async (analysis: SectionAnalysis, branch: string): Promise<SmartSuggestion[]> => {
  if (!hasGeminiCredentials()) throw new Error(GEMINI_MISSING_KEY);

  const catSummary = analysis.categorySummaries.slice(0, 5).map(c => 
    `- ${c.name}: Apenas ${c.completionAverage}% concluído (Prioridade Alta)`
  ).join('\n');

  const topItems = analysis.topMissingItems.slice(0, 20).map(i => 
    `- ${i.itemCode}: ${i.description} (${i.percentageMissing}% precisam)`
  ).join('\n');

  const prompt = `
    Você é um Gestor de Programa Educativo experiente. Analise o estado da seção (Ramo ${branch}).
    
    RESUMO POR ÁREA/BLOCO:
    ${catSummary}

    ITENS MAIS URGENTES (Gargalos):
    ${topItems}

    SUA MISSÃO:
    Sugira 3 temas de atividades que equilibrem a progressão da seção.
    
    RETORNE APENAS JSON:
    [
      {
        "theme": "Nome da Atividade",
        "rationale": "Explicação: Esta atividade foca em [Área X] que está com apenas [Y]% de conclusão.",
        "recommendedItemCodes": ["COD1", "COD2", "COD3"]
      }
    ]
  `;

  try {
    const text = await callGeminiSimple('', getDefaultGeminiModel(), "", prompt);
    const parsed = extractJson<SmartSuggestion[]>(text);
    if (!parsed) throw new Error("JSON invalido");
    return parsed;
  } catch (e) {
    console.error("Erro ao gerar sugestões inteligentes:", sanitizeLlmError(e));
    throw new Error("Falha ao analisar dados da seção.");
  }
};

const parseGeminiModelList = (raw: Array<{ name?: string; supportedGenerationMethods?: string[]; supportedActions?: string[] }>): string[] =>
  raw
    .map(model => (model.name || '').replace(/^models\//, ''))
    .filter(name =>
      name.includes('gemini')
      && !name.includes('vision')
      && !/image|tts|embed/i.test(name),
    );

export const getAvailableModels = async (): Promise<string[]> => {
  const fallbacks = isWebApp()
    ? [...WEB_GEMINI_LITE_CANDIDATES, 'gemini-2.5-flash']
    : ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  if (!hasGeminiCredentials()) return fallbacks;

  const sortModels = (models: string[]) =>
    [...models].sort((a, b) => geminiVersionScore(b) - geminiVersionScore(a) || b.localeCompare(a));

  try {
    const apiKey = resolveApiKey();
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const models: string[] = [];
      const response = await ai.models.list();
      for await (const model of response) {
        if (model.name && model.name.includes('gemini') &&
            !model.name.includes('vision') &&
            model.supportedActions?.includes('generateContent')) {
          models.push(model.name.replace('models/', ''));
        }
      }
      return models.length > 0 ? sortModels(models) : fallbacks;
    }
    const oauth = isWebApp() ? getGeminiOAuthAccessToken() : undefined;
    if (!oauth) return fallbacks;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { Authorization: `Bearer ${oauth}` },
    });
    if (!response.ok) return fallbacks;
    const body = await response.json() as { models?: Array<{ name?: string }> };
    const models = parseGeminiModelList(body.models || []);
    return models.length > 0 ? sortModels(models) : fallbacks;
  } catch (e) {
    console.error('Erro ao listar modelos Gemini:', e);
    return fallbacks;
  }
};

export interface CycleMeeting {
  theme: string;
  generalNotes: string;
  progressionObjective: string;
  acompanhamento?: string;
  avaliacaoJovens?: string;
  avaliacaoChefia?: string;
  requisitosObservaveis?: string[];
  criteriosDeAceite?: string[];
}

export interface MeetingCycle {
  id: string;
  theme: string;
  rational: string;
  meetings: CycleMeeting[];
}

export const normalizeMeetingCycle = (cycle: MeetingCycle): MeetingCycle => ({
  ...cycle,
  meetings: (cycle.meetings || []).map(meeting => ({
    ...meeting,
    acompanhamento: meeting.acompanhamento || '',
    avaliacaoJovens: meeting.avaliacaoJovens || '',
    avaliacaoChefia: meeting.avaliacaoChefia || '',
    requisitosObservaveis: meeting.requisitosObservaveis || [],
    criteriosDeAceite: meeting.criteriosDeAceite || [],
  })),
});

export const analyzeIndividualProgress = async (params: { 
    branch: string, 
    system: string,
    completedCodes: string[],
    fullCatalog: any[] 
}): Promise<{ recommendation: string, items: string[] }> => {
  if (!hasGeminiCredentials()) throw new Error(GEMINI_MISSING_KEY);

  const missingItems = params.fullCatalog
    .filter(item => !params.completedCodes.includes(item.code))
    .slice(0, 40)
    .map(i => `${i.code}: ${i.description}`)
    .join('\n');

  const isAdult = params.branch === 'Adulto' || params.system.includes('Adulto');
  
  const prompt = `
    Você é um Chefe Escoteiro experiente.
    Analise o progresso de um ${isAdult ? 'Adulto' : 'Jovem do Ramo ' + params.branch}.
    
    ITENS JÁ CONQUISTADOS:
    ${params.completedCodes.join(', ') || 'Nenhum ainda'}

    ITENS PENDENTES (Amostra):
    ${missingItems}

    SUA MISSÃO: 
    Recomende os 3 próximos passos mais lógicos.
    
    RETORNE APENAS JSON:
    {
      "recommendation": "Texto curto de incentivo",
      "items": ["COD1", "COD2", "COD3"]
    }
  `;

  try {
    const text = await callGeminiSimple('', getDefaultGeminiModel(), "", prompt);
    const parsed = extractJson<{ recommendation: string, items: string[] }>(text);
    if (!parsed) throw new Error("JSON invalido");
    return parsed;
  } catch (e) {
    console.error("Erro ao analisar progresso individual:", sanitizeLlmError(e));
    throw new Error("Falha ao analisar progresso.");
  }
};

export const generateScoutCycle = async (params: { 
    branch: string, 
    cycleTheme: string, 
    meetingCount: number, 
    objectives: string[],
    modelId?: string,
    customInstruction?: string,
    planningMode?: 'from_selection' | 'auto_link',
    catalogDigest?: string,
}): Promise<MeetingCycle> => {
  if (!hasGeminiCredentials()) throw new Error(GEMINI_MISSING_KEY);

  const mode =
    params.planningMode === 'from_selection' || params.planningMode === 'auto_link'
      ? params.planningMode
      : ((params.objectives?.length || 0) > 0 ? 'from_selection' : 'auto_link');
  const objs = (params.objectives || []).join('\n');

  const prompt = `
    Você é um Chefe Escoteiro Sênior e Planejador Estratégico.
    SUA MISSÃO: Planejar um CICLO DE PROGRAMA para o Ramo ${params.branch}.
    Para cada reunião, inclua como acompanhar e avaliar os jovens, com requisitos e critérios observáveis.
    
    TEMA DO CICLO: ${params.cycleTheme}
    QUANTIDADE DE REUNIÕES: ${params.meetingCount}
    MODO: ${mode === 'from_selection' ? 'FROM_SELECTION (distribuir objetivos marcados)' : 'AUTO_LINK (criar reuniões pelo tema e amarrar códigos do catálogo)'}
    ${mode === 'from_selection' ? `OBJETIVOS A DISTRIBUIR:\n${objs || '(nenhum)'}` : `PREFERÊNCIAS (opcionais):\n${objs || '(nenhuma)'}`}
    ${mode === 'auto_link' && params.catalogDigest ? `\n${params.catalogDigest}\n` : ''}
    ${params.customInstruction ? `INSTRUÇÃO ESPECIAL: ${params.customInstruction}` : ''}

    RETORNE APENAS JSON neste formato:
    {
      "id": "random-id",
      "theme": "${params.cycleTheme}",
      "rational": "Explicação estratégica",
      "meetings": [
        {
          "theme": "Título da Reunião",
          "generalNotes": "Narrativa",
          "progressionObjective": "Código do Objetivo",
          "acompanhamento": "Como a chefia acompanha durante a reunião",
          "avaliacaoJovens": "Como os jovens fazem autoavaliação ou avaliação por pares",
          "avaliacaoChefia": "Como a chefia registra a avaliação",
          "requisitosObservaveis": ["requisito visível 1", "requisito visível 2"],
          "criteriosDeAceite": ["critério mínimo para considerar cumprido"]
        }
      ]
    }
  `;

  try {
    const text = await callGeminiSimple('', params.modelId || getDefaultGeminiModel(), "", prompt);
    const parsed = extractJson<MeetingCycle>(text);
    if (!parsed) throw new Error("JSON invalido");
    parsed.id = Date.now().toString();
    return normalizeMeetingCycle(parsed as MeetingCycle);
  } catch (e) {
    console.error("Erro ao gerar ciclo de programa:", sanitizeLlmError(e));
    throw new Error("Falha ao gerar ciclo de programa.");
  }
};

export const generateScoutPlan = async (params: GeneratorParams & { context?: { sectionName: string, groupName: string } }): Promise<MeetingPlan> => {
  if (!hasGeminiCredentials()) throw new Error(GEMINI_MISSING_KEY);

  const selectedModel = params.modelId || getDefaultGeminiModel();

  const planningMode =
    params.planningMode === 'from_selection' || params.planningMode === 'auto_link'
      ? params.planningMode
      : ((params.objectives?.length || 0) > 0 ? 'from_selection' : 'auto_link');

  const objectivesList = (params.objectives || []).map((obj, i) => {
    let codePrefix = obj.code ? `[CÓDIGO: ${obj.code}]` : `[Sem Código]`;
    let richContext = "";
    if (obj.requirementsContext) richContext += `\n   ⚠️ REQUISITOS: ${obj.requirementsContext}`;
    if (obj.specialtyData) {
        // @ts-ignore
        const s = obj.specialtyData;
        if (s.requirements) richContext += `\n   REQUISITOS GERAIS: ${s.requirements.join('; ')}`;
    }
    if (obj.isSpecialty) codePrefix += ` [ESPECIALIDADE NÍVEL ${obj.specialtyLevel || 1}]`;
    return `- Item ${i + 1}: ${codePrefix} ${obj.description} ${richContext}`;
  }).join("\n");

  const contextStr = params.context 
    ? `VOCÊ ESTÁ PLANEJANDO PARA: Seção "${params.context.sectionName}" do Grupo "${params.context.groupName}". Use esses nomes para personalizar a narrativa.` 
    : "";

  let bibliotecaContext = '';
  const manuaisText: string[] = [];
  (params.objectives || []).forEach(obj => {
      if (obj.code) {
          const detail = getProgressionDetail(obj.code);
          if (detail) manuaisText.push(`[${obj.code}]: ${detail}`);
      }
  });
  if (manuaisText.length > 0) {
      bibliotecaContext = `\n📚 BIBLIOTECA INTERNA (MANUAL UEB):\n${manuaisText.join('\n\n')}\n\nUSE AS INFORMAÇÕES ACIMA PARA EMBASAR AS ATIVIDADES E REGRAS!`;
  }

  let userPromptBase = `
    Planeje para o Ramo ${params.branch}.
    ${contextStr}
    Modo: ${planningMode === 'from_selection' ? 'FROM_SELECTION (partir dos itens marcados)' : 'AUTO_LINK (criar atividades e amarrar códigos do catálogo)'}.
    Duração total: ${params.totalDuration} min.
    Quantidade sugerida de atividades: ${params.activityCount || 3}.
    Quantidade de jovens (estimativa): ${params.participantsCount || 20}.
    Tema: ${params.narrativeTheme || (planningMode === 'auto_link' ? 'livre — invente tema criativo' : 'Padrão')}.
  `;

  if (planningMode === 'from_selection') {
    userPromptBase += `\nOBJETIVOS OBRIGATÓRIOS:\n${objectivesList || '(nenhum)'}\n`;
  } else {
    userPromptBase += `
MODO AUTO_LINK:
- Crie atividades a partir do TEMA e da INSTRUÇÃO ESPECIAL.
- Em cada activity.progressionObjective use um CÓDIGO EXATO do catálogo + descrição curta.
- Prefira códigos que realmente encaixem na atividade.
`;
    if (objectivesList) {
      userPromptBase += `\nPREFERÊNCIAS (opcionais):\n${objectivesList}\n`;
    }
    if (params.catalogDigest) {
      userPromptBase += `\n${params.catalogDigest}\n`;
    }
  }

  if (params.referenceUrls && params.referenceUrls.length > 0) {
      userPromptBase += `\nFONTES DE REFERÊNCIA:\n${params.referenceUrls.join('\n')}`;
  }

  if (params.customInstruction) {
      userPromptBase += `\nINSTRUÇÃO ESPECIAL:\n${params.customInstruction}`;
  }
  
  userPromptBase += bibliotecaContext;

  // Traduz finishReason problematico (MAX_TOKENS/SAFETY) em erro claro pro chefe.
  const checkFinishReason = (reason: string | undefined, etapa: string): void => {
    if (reason === 'MAX_TOKENS') {
      throw new Error(`A IA cortou a resposta por limite de tokens na etapa "${etapa}". Reduza a quantidade de objetivos/atividades e tente de novo.`);
    }
    if (reason === 'SAFETY') {
      throw new Error(`A IA bloqueou a resposta por filtros de segurança na etapa "${etapa}". Ajuste o tema/instrução e tente de novo.`);
    }
  };

  const callJson = async <T,>(prompt: string, etapa: string): Promise<T> => {
    let res = await generateGeminiText(selectedModel, prompt, 0.5);
    checkFinishReason(res.finishReason, etapa);
    let parsed = extractJson<T>(res.text || '');
    if (parsed === null) {
      const retryPrompt = `${prompt}\n\nIMPORTANTE: sua resposta anterior NAO era um JSON valido. Responda SOMENTE com o JSON pedido, sem texto extra nem markdown.`;
      res = await generateGeminiText(selectedModel, retryPrompt, 0.3);
      checkFinishReason(res.finishReason, etapa);
      parsed = extractJson<T>(res.text || '');
    }
    if (parsed === null) throw new Error(`A IA nao retornou JSON valido na etapa "${etapa}".`);
    return parsed;
  };

  try {
    // === ETAPA 1: ESTRUTURA ===
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 1/3: Gerando estrutura...' } }));
    
    const promptStep1 = `
      Você é um Chefe Escoteiro Sênior e Mentor no sistema PAXTU da UEB.
      Crie a ESTRUTURA de um roteiro de reunião.
      Retorne APENAS JSON puro no formato:
      {
        "theme": "Tema Criativo curto",
        "fundoDeCena": "Narrativa global",
        "preparacaoChefia": "Resumo preparacao",
        "generalNotes": "Dicas",
        "educationalRationale": "Justificativa pedagógica",
        "activities": [
          {
            "title": "Nome da atividade",
            "durationMinutes": 30,
            "educationalArea": "Físico",
            "progressionObjective": "[CÓDIGO]"
          }
        ]
      }
      \n\nCONTEXTO:\n${userPromptBase}
    `;

    const planStructure = await callJson<any>(promptStep1, 'estrutura');

    // === ETAPA 2: DETALHAMENTO ===
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 2/3: Detalhando atividades...' } }));
    
    const promptStep2 = `
      Aqui está a estrutura de uma reunião escoteira:
      ${JSON.stringify(planStructure, null, 2)}
      
      Para CADA atividade na lista "activities", preencha os detalhes que faltam.
      Use a BIBLIOTECA INTERNA se houver.
      Retorne APENAS um JSON sendo um array de atividades detalhadas:
      [
        {
          "title": "DEVE SER O MESMO TÍTULO",
          "description": "Regras detalhadas",
          "fundoDeCena": "Conexão com tema",
          "materials": ["item 1 com qtde"],
          "instrucaoChefia": "Passo-a-passo numerado",
          "objetivoEspecifico": "Ao final o jovem será capaz de...",
          "manualReferencia": "Nome do manual/fonte",
          "preparacaoPrevia": ["imprimir X"],
          "evaluation": {
            "acompanhamento": "como observar",
            "avaliacaoJovens": "perguntas",
            "avaliacaoChefia": "critério da chefia",
            "requisitosObservaveis": ["req 1"],
            "criteriosDeAceite": ["critério 1"],
            "evidenciasSugeridas": ["foto"]
          }
        }
      ]
      \n\nCONTEXTO:\n${userPromptBase}
    `;

    const activitiesDetails = await callJson<any[]>(promptStep2, 'detalhamento');
    const detailsArr = Array.isArray(activitiesDetails) ? activitiesDetails : [];

    // Mesclar etapa 2 na 1: casa por titulo; se o modelo renomeou, tenta casar
    // pelo progressionObjective/codigo. So cai no indice como ultimo recurso, e
    // loga quando isso acontece (pode casar a atividade errada).
    const usedDetails = new Set<number>();
    planStructure.activities = (planStructure.activities || []).map((act: any, idx: number) => {
       let detailIdx = detailsArr.findIndex((d: any, i: number) => !usedDetails.has(i) && d?.title === act.title);
       if (detailIdx < 0) {
         detailIdx = detailsArr.findIndex((d: any, i: number) =>
           !usedDetails.has(i) && d?.progressionObjective && d.progressionObjective === act.progressionObjective);
       }
       if (detailIdx < 0 && !usedDetails.has(idx) && detailsArr[idx]) {
         console.warn(`Merge etapa 2: fallback por indice para atividade "${act.title}" (titulo/objetivo nao casaram).`);
         detailIdx = idx;
       }
       if (detailIdx < 0) return act;
       usedDetails.add(detailIdx);
       return { ...act, ...detailsArr[detailIdx] };
    });

    // === ETAPA 3: GUIA DE ESTUDO ===
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Etapa 3/3: Gerando guia de estudo...' } }));
    
    const promptStep3 = `
      Crie o GUIA DE ESTUDO para a chefia baseado nas atividades geradas:
      ${JSON.stringify(planStructure.activities.map((a: any) => a.title))}
      
      Retorne APENAS um JSON sendo um array:
      [
        {
          "activityTitle": "NOME EXATO DA ATIVIDADE",
          "conceptExplainer": "Explicação teórica aprofundada",
          "teachingTips": "Dicas práticas",
          "searchQueriesUsed": ["termo"]
        }
      ]
      \n\nCONTEXTO:\n${userPromptBase}
    `;

    planStructure.studyGuide = await callJson<any[]>(promptStep3, 'guia de estudo');

    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Plano gerado com sucesso!' } }));

    planStructure.totalDuration = params.totalDuration;
    planStructure.branch = params.branch;
    planStructure.sources = [];
    planStructure.createdAt = new Date().toISOString();
    planStructure.id = Date.now().toString();

    return normalizePlanForUse(planStructure as MeetingPlan);

  } catch (error: any) {
    const safe = sanitizeLlmError(error);
    console.error("GEMINI API ERROR:", safe);
    window.dispatchEvent(new CustomEvent('paxtu:llm-progress', { detail: { message: 'Erro na geração.' } }));
    throw new Error("Erro na IA: " + safe);
  }
};
