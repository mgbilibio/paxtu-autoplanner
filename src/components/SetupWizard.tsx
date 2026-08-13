import React, { useState } from 'react';
import { AppConfig, DataSyncMode, LlmProviderId } from '../types';
import { normalizeOllamaBaseUrl } from '../services/ollamaUrlSecurity';
import { isCloudModel, sortModelsCloudFirst } from '../services/ollamaService';
import { isWebApp } from '../services/platform';

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
  const [dataFolder, setDataFolder] = useState('Meus Documentos/PaxtuData');
  const [syncMode, setSyncMode] = useState<DataSyncMode>('local');
  // Profile State
  const [groupName, setGroupName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [city, setCity] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hasFileSystem, setHasFileSystem] = useState(false);
  // V6: erros inline em vez de alert()
  const [errors, setErrors] = useState<{ apiKey?: string; ollama?: string }>({});

  React.useEffect(() => {
    setHasFileSystem(!!window.fileSystem);
  }, []);

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
    const url = `${baseUrl}/api/tags`;

    // Prefere IPC do Electron (sem CORS); fallback para fetch direto em browser puro.
    const pickModels = (raw: any[]): string[] =>
      sortModelsCloudFirst((raw || []).map((m: any) => m.name as string).filter(Boolean));

    if (window.fileSystem?.ollamaRequest) {
      const r = await window.fileSystem.ollamaRequest('GET', url);
      if (r.ok) {
        const data = JSON.parse(r.body);
        const models = pickModels(data?.models || []);
        status = { ok: true, models };
        if (models.length > 0) setSelectedOllamaModel(models[0]);
      } else {
        status = { ok: false, error: r.error === 'timeout' ? 'Timeout — Ollama não está rodando?' : (r.error || `HTTP ${r.status}`) };
      }
    } else {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) status = { ok: false, error: `HTTP ${r.status}` };
        else {
          const data = await r.json();
          const models = pickModels(data?.models || []);
          status = { ok: true, models };
          if (models.length > 0) setSelectedOllamaModel(models[0]);
        }
      } catch (e: any) {
        status = { ok: false, error: e?.name === 'AbortError' ? 'Timeout — Ollama não está rodando?' : (e?.message || 'Falha de conexão (CORS? defina OLLAMA_ORIGINS=*)') };
      } finally {
        clearTimeout(timer);
      }
    }
    setOllamaTestStatus(status);
    setTestingOllama(false);
  };

  const canAdvanceFromStep1 = (): boolean => {
    if (provider === 'gemini') return isWebApp() || !!apiKey.trim();
    if (provider === 'xai-oauth') return isWebApp() || !!xaiKey.trim();
    if (isWebApp() && (provider === 'ollama' || provider === 'ollama-local')) return true;
    return !!ollamaTestStatus?.ok && !!selectedOllamaModel;
  };

  const handleFinish = () => {
    const next: typeof errors = {};
    if (provider === 'gemini' && !apiKey.trim() && !isWebApp()) next.apiKey = 'A Chave API do Gemini é obrigatória.';
    if ((provider === 'ollama' || provider === 'ollama-local') && !isWebApp() && !selectedOllamaModel) next.ollama = 'Selecione um modelo Ollama disponível.';
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
      dataFolder: dataFolder.trim(),
      isConfigured: true,
      llmProvider: resolvedProvider,
      ollamaBaseUrl: normalizeOllamaBaseUrl(ollamaUrl) || 'http://localhost:11434',
      ollamaModel: resolvedProvider === 'ollama-local' ? selectedOllamaModel : undefined,
      ollamaGenerationContext: 262144,
      ollamaGenerationOutput: 12288,
      xaiApiKey: xaiKey.trim() || undefined,
      syncMode,
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
                {isWebApp()
                  ? <>Padrão: <strong>Gemini Flash-Lite</strong> (barato e rápido). A chave do AI Studio é opcional agora — cole depois em Configurações. xAI é extra com chave colada. Ollama local só no app desktop.</>
                  : <>Padrão: <strong>Gemini Flash-Lite</strong> (barato e rápido). Escolha 3.6 ou 3.7 Flash no seletor se precisar de mais capacidade. Ollama fica na máquina.</>}
              </p>

              <div className={`grid gap-2 mb-6 ${isWebApp() ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  onClick={() => setProvider('gemini')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'gemini' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-sm">☁️ Gemini</div>
                  <div className="text-[11px] text-gray-500 mt-1">Flash-Lite · AI Studio</div>
                </button>
                {isWebApp() && (
                  <button
                    onClick={() => setProvider('xai-oauth')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'xai-oauth' ? 'border-slate-800 bg-slate-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-bold text-sm">⚡ xAI</div>
                    <div className="text-[11px] text-gray-500 mt-1">Extra · chave api.x.ai</div>
                  </button>
                )}
                <button
                  onClick={() => setProvider('ollama')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${provider === 'ollama' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="font-bold text-sm">💻 Ollama</div>
                  <div className="text-[11px] text-gray-500 mt-1">{isWebApp() ? 'Só no app desktop' : 'Local · privacidade total'}</div>
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
                  {isWebApp() && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 border border-slate-200 rounded p-2">
                      Na web a chave Gemini é opcional e fica só neste navegador — nunca no repositório público.
                      Sem chave, a geração por Gemini permanece disponível nas mesmas telas e avisa na hora de usar.
                    </p>
                  )}
                </>
              )}

              {provider === 'xai-oauth' && (
                <>
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 mb-3 leading-relaxed">
                    Cole a chave da API xAI (fica só neste navegador). O site escolhe um modelo barato/rápido do catálogo (hoje <code>grok-4.3</code>).
                    Não há login OAuth xAI — isso exigiria SuperGrok e um Client ID oficial.
                  </p>
                  <input
                    type="password"
                    value={xaiKey}
                    onChange={(e) => setXaiKey(e.target.value)}
                    placeholder="Chave xAI (opcional agora)"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </>
              )}

              {provider === 'ollama' && isWebApp() && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-3 mb-3 leading-relaxed">
                  Ollama local não roda neste site (GitHub Pages). Use Gemini ou xAI aqui, ou o aplicativo desktop para localhost:11434.
                  Você pode avançar; a geração avisa se este provedor estiver selecionado.
                </p>
              )}

              {provider === 'ollama' && !isWebApp() && (
                <>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-4 text-xs text-emerald-900">
                    <p className="font-bold mb-2">💻 Setup do Ollama (recomendado: cloud):</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>
                        Baixe e instale: {' '}
                        <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="bg-emerald-700 text-white px-2 py-0.5 rounded font-bold">ollama.com/download</a>
                      </li>
                      <li>Login cloud: <code className="bg-white px-1 border rounded">ollama signin</code></li>
                      <li>Puxe um modelo cloud (sem GB locais): <code className="bg-white px-1 border rounded">ollama pull minimax-m3:cloud</code></li>
                      <li>Volte aqui e clique <strong>Testar</strong></li>
                    </ol>
                  </div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL do Ollama</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <button
                      onClick={testOllama}
                      disabled={testingOllama}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold disabled:bg-slate-400 text-sm"
                    >
                      {testingOllama ? '...' : 'Testar'}
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
                      Nenhum modelo. Ex.: <code className="bg-gray-100 px-1">ollama pull minimax-m3:cloud</code> e Testar de novo.
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
                      {errors.ollama && <p role="alert" className="text-xs text-red-600 mt-1">{errors.ollama}</p>}
                      {isCloudModel(selectedOllamaModel) && (
                        <p className="text-[11px] text-emerald-800 mt-2 bg-emerald-50 border border-emerald-200 rounded p-2">
                          Modelo cloud: o app gera o roteiro em partes e usa contexto ≥256k. Requer conta Ollama logada.
                        </p>
                      )}
                      {!isCloudModel(selectedOllamaModel) && /^[^:]+:(0\.5|1|1\.7|2|3)b/i.test(selectedOllamaModel) && (
                        <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                          ⚠️ Modelos locais muito pequenos podem falhar no JSON. Prefira <code>:cloud</code> ou local ≥7B.
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
                Onde seus roteiros, fichas e configurações devem ser salvos? Escolha uma pasta segura.
              </p>
              {isWebApp() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-[11px] text-amber-900 leading-relaxed">
                  Neste site os dados ficam no <strong>localStorage deste navegador</strong> (sem servidor).
                  O seletor de pasta e o modo compartilhado continuam visíveis como no desktop: use-os como referência
                  ou, se o navegador oferecer, escolha uma pasta local. A gravação efetiva permanece neste browser até existir backend.
                </div>
              )}
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Caminho da Pasta</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setSyncMode('local')}
                  className={`p-3 rounded-lg border-2 text-left ${syncMode === 'local' ? 'border-slate-800 bg-slate-50' : 'border-gray-200'}`}
                >
                  <span className="block text-sm font-bold">Uso local</span>
                  <span className="block text-[11px] text-gray-500 mt-1">Uma máquina principal, menor risco.</span>
                </button>
                <button
                  onClick={() => setSyncMode('sharedFolder')}
                  className={`p-3 rounded-lg border-2 text-left ${syncMode === 'sharedFolder' ? 'border-blue-700 bg-blue-50' : 'border-gray-200'}`}
                >
                  <span className="block text-sm font-bold">Pasta compartilhada</span>
                  <span className="block text-[11px] text-gray-500 mt-1">Google Drive/OneDrive, sem servidor.</span>
                </button>
              </div>
              {syncMode === 'sharedFolder' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-[11px] text-blue-900 leading-relaxed">
                  Use uma pasta sincronizada do Google Drive e aguarde o Drive concluir a sincronização antes de outra chefia editar. Esta versão não garante edição simultânea livre.
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-3.5 text-gray-400">📁</span>
                  <input
                    type="text"
                    value={dataFolder}
                    onChange={(e) => setDataFolder(e.target.value)}
                    readOnly={hasFileSystem}
                    placeholder={hasFileSystem ? "Clique em 'Escolher' →" : "Caminho da pasta ou navegador-localStorage"}
                    className={`w-full pl-10 p-3 border border-gray-300 rounded-lg outline-none ${hasFileSystem ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500'}`}
                  />
                </div>
                <button
                  onClick={async () => {
                    if (window.fileSystem) {
                      const path = await window.fileSystem.selectFolder();
                      if (path) setDataFolder(path);
                      return;
                    }
                    if (typeof window.showDirectoryPicker === 'function') {
                      try {
                        const handle = await window.showDirectoryPicker();
                        setDataFolder(`navegador:${handle.name}`);
                      } catch {
                        // cancelado pelo usuário
                      }
                      return;
                    }
                    setDataFolder('navegador-localStorage');
                  }}
                  className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 text-sm"
                >
                  Escolher
                </button>
              </div>
              {hasFileSystem && dataFolder === 'Meus Documentos/PaxtuData' && (
                <p role="alert" className="text-[11px] text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Você ainda não escolheu uma pasta. Clique em <strong>Escolher</strong> para selecionar onde salvar os dados.
                </p>
              )}
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
