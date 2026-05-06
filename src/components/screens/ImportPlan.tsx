import React, { useState } from 'react';
import { FileDown, FileUp, CheckCircle, AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { JSON_EXEMPLO } from '../../constants';

interface ImportPlanProps {
  onBack: () => void;
}

export default function ImportPlan({ onBack }: ImportPlanProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(JSON_EXEMPLO, null, 2));
    setMessage('Exemplo copiado para a área de transferência!');
    setStatus('idle');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const data = JSON.parse(jsonInput);
      if (!data.plano || !Array.isArray(data.plano)) {
        throw new Error('Formato JSON inválido. O objeto raiz deve conter a chave "plano" como um array.');
      }
      await workoutService.importPlanMerge(data);
      setStatus('success');
      setMessage('Plano importado com sucesso! As semanas foram mescladas sem apagar outros dados existentes.');
      setJsonInput('');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Falha ao importar o plano. Verifique a sintaxe do JSON.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const planData = await workoutService.exportPlan();
      if (!planData) {
        setStatus('error');
        setMessage('Nenhum plano encontrado para exportar.');
        return;
      }
      const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forge-plano-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatus('error');
      setMessage('Falha ao exportar o plano.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Configurações</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Importar Plano</h1>
        </div>
      </header>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-secondary w-full min-h-[48px]"
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <FileUp size={18} />
        )}
        {exporting ? 'Exportando...' : 'Exportar Plano Atual (JSON)'}
      </button>

      <section className="card p-6 space-y-4">
        <div className="flex justify-between items-center mb-1">
          <label className="input-label !mb-0">Cole o JSON do Plano</label>
          <button
            onClick={handleCopyExample}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand hover:text-white transition-colors"
          >
            <Copy size={12} />
            Copiar Exemplo
          </button>
        </div>
        <textarea
          className="w-full h-80 bg-surface-hover border border-input-border rounded-xl px-4 py-3 text-xs font-mono focus:border-brand focus:ring-0 transition-colors resize-none"
          placeholder='{ "plano": [ ... ] }'
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {message && (status === 'success' || status === 'idle') && (
          <div className="flex items-center gap-3 p-4 bg-brand/10 border border-brand/20 rounded-lg text-brand text-sm animate-in fade-in slide-in-from-top-1">
            <CheckCircle size={18} />
            <p>{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{message}</p>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={status === 'loading' || !jsonInput.trim()}
          className="btn-primary w-full disabled:opacity-50 min-h-[48px]"
        >
          {status === 'loading' ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FileDown size={18} />
          )}
          {status === 'loading' ? 'Importando...' : 'Processar Importação'}
        </button>
      </section>

      <div className="p-4 bg-surface-hover rounded-xl border border-outline space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Instruções</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          A importação <strong className="text-gray-300">mescla</strong> as semanas sem apagar outras já existentes. Se um ID não existir no catálogo, inclua{' '}
          <code className="text-brand font-mono text-[10px]">"nome"</code> e{' '}
          <code className="text-brand font-mono text-[10px]">"grupoMuscular"</code> no objeto — o exercício será criado automaticamente.
        </p>
      </div>
    </div>
  );
}
