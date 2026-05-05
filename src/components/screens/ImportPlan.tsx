import React, { useState } from 'react';
import { FileDown, CheckCircle, AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { JSON_EXEMPLO } from '../../constants';

interface ImportPlanProps {
  onBack: () => void;
}

export default function ImportPlan({ onBack }: ImportPlanProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(JSON_EXEMPLO, null, 2));
    setMessage('Exemplo copiado para a área de transferência!');
    setStatus('idle'); // Clear previous status
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    
    setStatus('loading');
    setMessage('');

    try {
      const data = JSON.parse(jsonInput);
      
      // Basic validation
      if (!data.plano || !Array.isArray(data.plano)) {
        throw new Error('Formato JSON inválido. O objeto raiz deve conter a chave "plano" como um array.');
      }

      await workoutService.importPlan(data);
      
      setStatus('success');
      setMessage('Plano importado com sucesso! Os dados foram sincronizados na nuvem.');
      setJsonInput('');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Falha ao importar o plano. Verifique a sintaxe do JSON.');
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
        <div className="space-y-1.5">
          <textarea 
            className="w-full h-80 bg-surface-hover border border-input-border rounded-xl px-4 py-3 text-xs font-mono focus:border-brand focus:ring-0 transition-colors resize-none"
            placeholder='{ "plano": [ ... ] }'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
        </div>

        {message && (status === 'success' || status === 'idle') && (
          <div className="flex items-center gap-3 p-4 bg-brand/10 border border-brand/20 rounded-lg text-brand text-sm animate-in fade-in slide-in-from-top-1">
            <CheckCircle size={18} />
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            <AlertCircle size={18} />
            <p>{message}</p>
          </div>
        )}

        <button 
          onClick={handleImport}
          disabled={status === 'loading' || !jsonInput.trim()}
          className="btn-primary w-full disabled:opacity-50"
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
          A importação substituirá qualquer plano existente para as mesmas semanas mencionadas no JSON. 
          Certifique-se de que os IDs dos exercícios correspondem ao catálogo atual.
        </p>
      </div>
    </div>
  );
}
