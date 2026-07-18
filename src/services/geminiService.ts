import { GoogleGenAI } from "@google/genai";
import { MeetingPlan, GeneratorParams, GroundingSource } from "../types";
import { getStoredApiKey } from "./storageService";
import { SectionAnalysis } from "./recommendationService";
import { buildManuaisContextForBranch } from '../data/manuaisReferencia';
import { normalizePlanForUse } from './planNormalizationService';
import { getProgressionDetail } from './progressionDetailService';
import { extractJson } from './llmJson';

// Remove possiveis segredos (api key) de mensagens de erro da SDK antes de
// exibir/logar — a SDK as vezes ecoa a URL da request com a chave.
const sanitizeLlmError = (error: any): string =>
  String(error?.message || error || 'Desconhecido')
    .replace(/key=[\w-]+/gi, 'key=***')
    .replace(/AIza[\w-]{10,}/g, '***');

// Resolve a chave Gemini. Producao usa SOMENTE getStoredApiKey() — nunca embute
// VITE_GEMINI_API_KEY no bundle. Em dev (import.meta.env.DEV) aceita a env como
// conveniencia local; nunca em build de producao.
const resolveApiKey = (): string | undefined => {
  if (import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY as string;
  }
  return getStoredApiKey() ?? undefined;
};

export interface SmartSuggestion {
  theme: string;
  rationale: string;
  recommendedItemCodes: string[];
}

// Q&A genérico para Painel de Ajuda — sem JSON, resposta livre em português.
// Modelo Gemini padrao para chamadas internas (quando o usuario nao escolheu um).
// 2.5-flash e gratuito e vigente (jun/2026). Evitar 2.0-flash/1.5 (descontinuados/legado).
// A geracao principal usa o modelo escolhido no dropdown, populado por getAvailableModels().
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const askGemini = async (question: string, context: string, modelId?: string): Promise<string> => {
    const apiKey = getStoredApiKey();
    if (!apiKey) throw new Error('Chave Gemini não configurada.');
    const model = modelId || DEFAULT_GEMINI_MODEL;
    const system = 'Você é um assistente experiente em escotismo (UEB) e no app Paxtu AutoPlanner. Responda em português brasileiro, de forma direta e prática, em até 3 parágrafos. Use o contexto fornecido para fundamentar a resposta. Se a pergunta sair do escopo do app ou escotismo, diga isso de forma cordial.';
    const user = `CONTEXTO DO APP:\n${context}\n\nPERGUNTA DO CHEFE:\n${question}`;
    // Sanitiza erro cru da SDK para nao vazar key=... ao chamador/log.
    try {
      return await callGeminiSimple(apiKey, model, system, user);
    } catch (e) {
      throw new Error('Erro na IA: ' + sanitizeLlmError(e));
    }
};

const callGeminiSimple = async (apiKey: string, modelId: string, systemPrompt: string, userPrompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: modelId,
        contents: [
            { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
        ],
        config: {
            temperature: 0.5
        }
    });
    return response.text || "";
};

export const generateSmartSuggestions = async (analysis: SectionAnalysis, branch: string): Promise<SmartSuggestion[]> => {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API Key não configurada.");

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
    const text = await callGeminiSimple(apiKey, DEFAULT_GEMINI_MODEL, "", prompt);
    const parsed = extractJson<SmartSuggestion[]>(text);
    if (!parsed) throw new Error("JSON invalido");
    return parsed;
  } catch (e) {
    console.error("Erro ao gerar sugestões inteligentes:", sanitizeLlmError(e));
    throw new Error("Falha ao analisar dados da seção.");
  }
};

export const getAvailableModels = async (): Promise<string[]> => {
  const apiKey = resolveApiKey();
  // Fallback so quando nao ha chave ou a listagem via API falha. Mantido em
  // modelos Flash vigentes e gratuitos; a lista real vem de ai.models.list() abaixo.
  const fallbacks = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  if (!apiKey) return fallbacks;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const models: string[] = [];
    
    // @google/genai v1.x uses async iterator for list()
    const response = await ai.models.list();
    for await (const model of response) {
        if (model.name && model.name.includes("gemini") && 
            !model.name.includes("vision") &&
            model.supportedActions?.includes("generateContent")) {
            models.push(model.name.replace("models/", ""));
        }
    }
    
    if (models.length === 0) return fallbacks;
    return models.sort((a, b) => {
        // Ordem de preferência: 3.1 > 3 > 2.5 > 2.0 > 1.5
        const getVer = (s: string) => {
            if (s.includes('3.1')) return 3.1;
            if (s.includes('3')) return 3.0;
            if (s.includes('2.5')) return 2.5;
            if (s.includes('2.0')) return 2.0;
            if (s.includes('1.5')) return 1.5;
            return 0;
        };
        return getVer(b) - getVer(a) || b.localeCompare(a);
    });
  } catch (e) {
    console.error("Erro ao listar modelos Gemini:", e);
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
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API Key não configurada.");

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
    const text = await callGeminiSimple(apiKey, "gemini-2.5-flash", "", prompt);
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
    modelId?: string
}): Promise<MeetingCycle> => {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("API Key não configurada.");

  const prompt = `
    Você é um Chefe Escoteiro Sênior e Planejador Estratégico.
    SUA MISSÃO: Planejar um CICLO DE PROGRAMA para o Ramo ${params.branch}.
    Para cada reunião, inclua como acompanhar e avaliar os jovens, com requisitos e critérios observáveis.
    
    TEMA DO CICLO: ${params.cycleTheme}
    QUANTIDADE DE REUNIÕES: ${params.meetingCount}
    OBJETIVOS:
    ${params.objectives.join('\n')}

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
    const text = await callGeminiSimple(apiKey, params.modelId || 'gemini-2.5-flash', "", prompt);
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
  const apiKey = resolveApiKey();
  if (!apiKey) throw new Error("Chave de API não encontrada.");

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const selectedModel = params.modelId || 'gemini-2.5-flash';

  const objectivesList = params.objectives.map((obj, i) => {
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
  params.objectives.forEach(obj => {
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
    Duração total: ${params.totalDuration} min.
    Quantidade sugerida de atividades: ${params.activityCount || 3}.
    Quantidade de jovens (estimativa): ${params.participantsCount || 20}.
    Tema: ${params.narrativeTheme || "Padrão"}.
    
    OBJETIVOS OBRIGATÓRIOS:
    ${objectivesList}
  `;

  if (params.referenceUrls && params.referenceUrls.length > 0) {
      userPromptBase += `\nFONTES DE REFERÊNCIA:\n${params.referenceUrls.join('\n')}`;
  }

  if (params.customInstruction) {
      userPromptBase += `\nINSTRUÇÃO ESPECIAL:\n${params.customInstruction}`;
  }
  
  userPromptBase += bibliotecaContext;

  // Traduz finishReason problematico (MAX_TOKENS/SAFETY) em erro claro pro chefe.
  const checkFinishReason = (res: any, etapa: string): void => {
    const reason = res?.candidates?.[0]?.finishReason;
    if (reason === 'MAX_TOKENS') {
      throw new Error(`A IA cortou a resposta por limite de tokens na etapa "${etapa}". Reduza a quantidade de objetivos/atividades e tente de novo.`);
    }
    if (reason === 'SAFETY') {
      throw new Error(`A IA bloqueou a resposta por filtros de segurança na etapa "${etapa}". Ajuste o tema/instrução e tente de novo.`);
    }
  };

  // Chama o modelo e extrai JSON robustamente; 1 retry exigindo JSON puro se falhar.
  const callJson = async <T,>(prompt: string, etapa: string): Promise<T> => {
    let res = await ai.models.generateContent({
      model: selectedModel, contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.5 },
    });
    checkFinishReason(res, etapa);
    let parsed = extractJson<T>(res.text || '');
    if (parsed === null) {
      const retryPrompt = `${prompt}\n\nIMPORTANTE: sua resposta anterior NAO era um JSON valido. Responda SOMENTE com o JSON pedido, sem texto extra nem markdown.`;
      res = await ai.models.generateContent({
        model: selectedModel, contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
        config: { temperature: 0.3 },
      });
      checkFinishReason(res, etapa);
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
