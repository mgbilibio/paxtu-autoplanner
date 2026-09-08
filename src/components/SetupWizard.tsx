import React, { useState } from 'react';
import { AppConfig, LlmProviderId } from '../types';
import { normalizeOllamaBaseUrl } from '../services/ollamaUrlSecurity';
import { belongsInOllamaSelector, isCloudModel, isReachable as ollamaIsReachable, listModels as ollamaListModels } from '../services/ollamaService';
import { XaiOAuthPanel } from './XaiOAuthPanel';
import { AiLoginStatusBar } from './AiLoginStatusBar';

interface Props {
  onComplete: (config: AppConfig) => void;
}

export const SetupWizard: React.FC<Props> = ({ onComplete }) => {
  const [provider, setProvider] = useState<LlmProviderId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaTestStatus, setOllamaTestStatus] = useState<{ ok: boolean; error?: string; models?: string[] } | null>(null);
  const [testingOllama, setTestingOllama] = useState(false);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
  // Profile State
  const [groupName, setGroupName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [city, setCity] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  // V6: erros inline em vez de alert()
  const [errors, setErrors] = useState<{ apiKey?: string; ollama?: string }>({});

  const testOllama = async () => {
    setTestingOllama(true);
    setOllamaTestStatus(null);
    const baseUrl = normalizeOllamaBaseUrl(ollamaUrl);
    let status: { ok: boolean; error?: string; models?: string[] } = { ok: false };
    if (!baseUrl) {
      setOllamaTestStatus({ ok: false, error: 'Use apenas http://localhost, 127.0.0.1 ou ::1.' });
      setTestingOllama(false);
      return;
    }
    const reachable = await ollamaIsReachable({ mode: 'local', baseUrl });
    if (!reachable.ok) {
      setOllamaTestStatus({ ok: false, error: reachable.error });
      setTestingOllama(false);
      return;
    }
    const models = (await ollamaListModels({ mode: 'local', baseUrl })).filter(belongsInOllamaSelector);
    status = { ok: true, models };
    if (models.length > 0) setSelectedOllamaModel(models[0]);
    setOllamaTestStatus(status);
    setTestingOllama(false);
  };

  const canAdvanceFromStep1 = (): boolean => {
    if (provider === 'gemini') return true;
    if (provider === 'xai-oauth') return true;
    if (provider === 'ollama' || provider === 'ollama-local') return true;
    return !!ollamaTestStatus?.ok && !!selectedOllamaModel;
  };

  const handleFinish = () => {
    const next: typeof errors = {};
    setErrors(next);
    if (Object.keys(next).length > 0) { setStep(1); return; }
    const resolvedProvider: LlmProviderId =
      provider === 'ollama' || provider === 'ollama-local'
        ? 'ollama-local'
        : provider === 'xai-oauth'
          ? 'xai-oauth'
          : 'gemini';
    const config: AppConfig = {
      apiKey: resolvedProvider === 'gemini' ? apiKey.trim() : '',
      dataFolder: 'firestore-grupo',
      isConfigured: true,
      llmProvider: resolvedProvider,
      ollamaBaseUrl: normalizeOllamaBaseUrl(ollamaUrl) || 'http://localhost:11434',
      ollamaModel: resolvedProvider === 'ollama-local' ? selectedOllamaModel : undefined,
      ollamaGenerationContext: 262144,
      ollamaGenerationOutput: 12288,
      xaiApiKey: xaiKey.trim() || undefined,
      syncMode: 'local',
      profile: { groupName, sectionName, city, defaultLocation, patrols: [] },
    };
    onComplete(config);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white text-center">
          <div className="text-5xl mb-4">⚜️</div>
          <h1 className="text-2xl font-bold">Bem-vindo ao Paxtu AutoPlanner</h1>
          <p className="text-slate-400 text-sm mt-2">Vamos configurar seu ambiente de trabalho.</p>
          <div className="mt-4 flex justify-center">
            <AiLoginStatusBar
              variant="dark"
              onOpenProvider={(id) => {
                setProvider(id);
                setStep(1);
              }}
            />
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          </div>

          {step === 1 && (
            <div className="animate-slide-in">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🔑 Provedor de IA</h2>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                <>Padrão: <strong>Gemini Flash-Lite</strong>. Sem chave, o seletor mantém esse padrão. Ollama local consulta o daemon na máquina (sem chave). xAI no site usa Device OAuth (precisa do Worker) ou uma chave API.</>
              </p>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  onClick={() => setProvider('gemini')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'gemini' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-sm">☁️ Gemini</div>
                  <div className="text-[11px] text-gray-500 mt-1">Flash-Lite · AI Studio</div>
                </button>
                <button
                  onClick={() => setProvider('xai-oauth')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'xai-oauth' ? 'border-slate-800 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-sm">⚡ xAI</div>
                  <div className="text-[11px] text-gray-500 mt-1">OAuth SuperGrok ou chave API</div>
                </button>
                <button
                  onClick={() => setProvider('ollama')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'ollama' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-sm">💻 Ollama</div>
                  <div className="text-[11px] text-gray-500 mt-1">Local · sem chave</div>
                </button>
              </div>

              {provider === 'gemini' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 text-xs text-blue-900">
                    <p className="font-bold mb-2">🔑 Como obter sua Chave Gemini:</p>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-700 mb-2">
                      Obter Chave Grátis
                    </a>
                    <ol className="list-decimal pl-4 space-y-0.5 opacity-80 mt-2">
                      <li>Clique em "Create API key".</li>
                      <li>Copie o código gerado.</li>
                      <li>Cole abaixo.</li>
                    </ol>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setErrors(s => ({ ...s, apiKey: undefined })); }}
                    placeholder="Cole sua chave Gemini aqui..."
                    aria-invalid={!!errors.apiKey}
                    aria-describedby={errors.apiKey ? 'apikey-error' : undefined}
                    className={`w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 outline-none ${errors.apiKey ? 'border-red-400 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'}`}
                  />
                  {errors.apiKey && <p id="apikey-error" role="alert" className="text-xs text-red-600 mt-1">{errors.apiKey}</p>}
                  <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 border border-slate-200 rounded p-2">
                    A chave Gemini é opcional e fica só neste navegador — nunca no repositório público.
                    Sem chave, a geração por Gemini permanece disponível nas mesmas telas e avisa na hora de usar.
                  </p>
                </>
              )}

              {provider === 'xai-oauth' && (
                <>
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 mb-3 leading-relaxed">
                    Conecte X/Grok pelo Device OAuth (Worker Cloudflare) ou cole uma chave API. Os modelos vêm da conta autenticada.
                  </p>
                  <div className="mb-3">
                    <XaiOAuthPanel />
                  </div>
                  <input
                    type="password"
                    value={xaiKey}
                    onChange={(e) => setXaiKey(e.target.value)}
                    placeholder="Chave xAI (opcional agora)"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </>
              )}

              {provider === 'ollama' && (
                <>
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 mb-3 leading-relaxed">
                    Sem chave. O daemon Ollama precisa estar rodando na URL abaixo. “Listar modelos” consulta essa URL.
                    Se o daemon estiver parado ou o navegador for bloqueado, o aviso pede que o Ollama aceite a origem do site.
                  </p>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL do Ollama</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { void testOllama(); }}
                      disabled={testingOllama}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold disabled:bg-slate-400 text-sm whitespace-nowrap"
                    >
                      {testingOllama ? '...' : 'Listar modelos'}
                    </button>
                  </div>
                  {ollamaTestStatus && (
                    <div className={`text-xs p-2 rounded mb-3 ${ollamaTestStatus.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      <span role={ollamaTestStatus.ok ? undefined : 'alert'}>
                        {ollamaTestStatus.ok
                          ? `✓ Conectado · ${ollamaTestStatus.models?.length || 0} modelo(s) disponível(eis)`
                          : `✗ ${ollamaTestStatus.error}`}
                      </span>
                    </div>
                  )}
                  {ollamaTestStatus?.ok && (ollamaTestStatus.models?.length || 0) === 0 && (
                    <p className="text-xs text-amber-700 mb-3">
                      O daemon respondeu, mas não devolveu modelos.
                    </p>
                  )}
                  {ollamaTestStatus?.ok && (ollamaTestStatus.models?.length || 0) > 0 && (
                    <>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Modelo</label>
                      <select
                        value={selectedOllamaModel}
                        onChange={(e) => setSelectedOllamaModel(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm"
                      >
                        {ollamaTestStatus.models?.map(m => (
                          <option key={m} value={m}>
                            {isCloudModel(m) ? `☁ ${m}` : m}
                          </option>
                        ))}
                      </select>
                      {isCloudModel(selectedOllamaModel) && (
                        <p className="text-[11px] text-emerald-800 mt-2 bg-emerald-50 border border-emerald-200 rounded p-2">
                          Modelo <code>:cloud</code> puxado pelo daemon local: o app gera o roteiro em partes.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceFromStep1()}
                className="w-full mt-8 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Próximo
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-in">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📂 Local dos Dados</h2>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                A tropa e a alcateia deste site ficam no Firestore, compartilhadas pela chefia da seção.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-4 text-[11px] text-sky-950 leading-relaxed">
                Cada pessoa entra com o <strong>próprio e-mail</strong> (Gmail, Google Workspace, @escoteiros ou outro).
                Não há e-mail único do grupo. Chaves de IA continuam neste navegador.
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-3 text-gray-500 font-medium hover:text-gray-800">Voltar</button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-all">Próximo</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slide-in">
              <h2 className="text-xl font-bold text-gray-800 mb-4">⚜️ Perfil da Unidade</h2>
              <p className="text-gray-600 text-sm mb-2">Tudo opcional agora — complete depois em Configurações / Estrutura.</p>
              <p className="text-[11px] text-slate-500 mb-4">Pode pular e já usar o app; cadastre seções e efetivo com lista rápida.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Grupo <span className="font-normal normal-case">(opcional)</span></label>
                  <input type="text" placeholder="Ex: G.E. Unisselva" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full p-2 border rounded bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seção <span className="font-normal normal-case">(opcional)</span></label>
                  <input type="text" placeholder="Ex: Tropa Titan" value={sectionName} onChange={e => setSectionName(e.target.value)} className="w-full p-2 border rounded bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                    <input type="text" placeholder="Cuiabá - MT" value={city} onChange={e => setCity(e.target.value)} className="w-full p-2 border rounded bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                    <input type="text" placeholder="Sede" value={defaultLocation} onChange={e => setDefaultLocation(e.target.value)} className="w-full p-2 border rounded bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-3 text-gray-500 font-medium hover:text-gray-800">Voltar</button>
                <button onClick={handleFinish} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all">Concluir e usar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
