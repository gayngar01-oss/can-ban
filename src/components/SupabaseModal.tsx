import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  getLocalTasks,
  apiCreateTask,
} from '../lib/supabase.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tableExists?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      setUrl(config.url || '');
      setAnonKey(config.anonKey || '');
      setTestResult(null);
      setSyncMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSyncMessage(null);
    try {
      const res = await testSupabaseConnection({ url, anonKey });
      setTestResult(res);
      if (res.success) {
        saveSupabaseConfig({ url, anonKey });
        onConfigUpdated();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        message: `Falha ao testar conexão: ${errMsg}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    onConfigUpdated();
    onClose();
  };

  const handleDisconnect = () => {
    if (window.confirm('Deseja desconectar as credenciais do Supabase? As tarefas salvas localmente permanecerão no seu navegador.')) {
      saveSupabaseConfig({ url: '', anonKey: '' });
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      onConfigUpdated();
    }
  };

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSyncLocalTasksToSupabase = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const local = getLocalTasks();
      if (local.length === 0) {
        setSyncMessage('Nenhuma tarefa local para sincronizar.');
        return;
      }

      let count = 0;
      for (const t of local) {
        await apiCreateTask(t);
        count++;
      }
      setSyncMessage(`${count} tarefas foram enviadas com sucesso para o Supabase!`);
      onConfigUpdated();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncMessage(`Erro ao sincronizar tarefas: ${errMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const isConnected = testResult?.success;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Conexão com o Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Armazene suas tarefas e dados do CRM diretamente no seu banco de dados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status info box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Status da Conexão
              </span>
              {url && anonKey ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Credenciais Configuradas
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Armazenamento Local Ativo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema armazena suas tarefas localmente e sincroniza em tempo real com o{' '}
              <strong>Supabase</strong> assim que as credenciais forem fornecidas.
            </p>
          </div>

          {/* Form Credentials */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project URL do Supabase
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Encontrado em: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Anon Public Key (chave anônima do cliente)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Encontrado em: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys (anon public)
              </span>
            </div>
          </div>

          {/* Test & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={testing || !url || !anonKey}
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testando Conexão...' : 'Testar Conexão com Supabase'}</span>
            </button>

            {url && anonKey && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              >
                Desconectar
              </button>
            )}

            <button
              type="button"
              disabled={syncing || !url || !anonKey}
              onClick={handleSyncLocalTasksToSupabase}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors ml-auto"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Sincronizar Tarefas Locais</span>
            </button>
          </div>

          {/* Test result display */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? testResult.tableExists
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.tableExists === false && (
                  <p className="mt-1 text-[11px] opacity-90">
                    Copie o script SQL abaixo e execute no menu <strong>SQL Editor</strong> do seu painel Supabase.
                  </p>
                )}
              </div>
            </div>
          )}

          {syncMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg">
              {syncMessage}
            </div>
          )}

          {/* SQL Script Accordion / Copy */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  Script SQL para criar a tabela no Supabase
                </h3>
                <p className="text-[11px] text-slate-500">
                  Execute no SQL Editor do seu projeto Supabase para criar a estrutura completa
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySQL}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 bg-slate-900 text-slate-200 text-[11px] font-mono rounded-lg overflow-x-auto max-h-48 leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Como conectar ao Supabase:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
              <li>Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> e crie um projeto gratuito;</li>
              <li>No menu <strong>SQL Editor</strong>, cole o script acima e clique em <strong>Run</strong>;</li>
              <li>Vá em <strong>Project Settings &gt; API</strong> e copie o <strong>Project URL</strong> e a <strong>anon key</strong>;</li>
              <li>Cole os dois campos aqui e clique em <strong>Testar Conexão</strong>!</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
