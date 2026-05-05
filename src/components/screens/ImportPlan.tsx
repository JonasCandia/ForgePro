import React, { useState } from 'react';
import { FileDown, CheckCircle, AlertCircle, ArrowLeft, Copy, Info } from 'lucide-react';
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

      await workoutService.importPlan(data);
      
      setStatus('success');
      setMessage('Plano importado com sucesso! Exercícios novos foram catalogados e a agenda foi atualizada.');
      setJsonInput('');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Falha ao importar o plano. Verifique a sintaxe do JSON.');
    }
  };

  return (
    <div className="space-y-8 pt-4 pb-24">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-muted)] hover:text-brand transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-brand text-[10px] font-black uppercase tracking-widest">Configurações</h2>
          <h1 className="font-display text-3xl font-black uppercase tracking-tighter italic">Importar Plano</h1>
        </div>
      </header>

      <section className="card p-8 space-y-8">
        <div className="flex justify-between items-center">
          <label className="input-label !mb-0">Estrutura JSON</label>
          <button 
            onClick={handleCopyExample}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand hover:text-brand/80 transition-colors"
          >
            <Copy size={14} />
            Copiar Exemplo
          </button>
        </div>

        <textarea 
          className="form-input min-h-[300px] font-mono text-[11px] leading-relaxed resize-none bg-[var(--color-background)]"
          placeholder='{ "plano": [ ... ] }'
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />

        {message && (status === 'success' || status === 'idle') && (
          <div className="flex items-center gap-4 p-5 bg-brand/10 border border-brand/20 rounded-2xl text-brand text-xs font-bold uppercase tracking-tight animate-in zoom-in-95 duration-300">
            <CheckCircle size={20} />
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-tight">
            <AlertCircle size={20} />
            <p>{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <button 
            onClick={handleImport}
            disabled={status === 'loading' || !jsonInput.trim()}
            className="btn-primary"
          >
            {status === 'loading' ? (
              <div className="w-5 h-5 border-4 border-black border-t-transparent animate-spin"></div>
            ) : (
              <FileDown size={20} />
            )}
            {status === 'loading' ? 'PROCESSANDO...' : 'EXECUTAR IMPORTAÇÃO'}
          </button>

          <button 
            onClick={async () => {
              const data = await workoutService.exportPlan();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'forge-plano-exportado.json';
              a.click();
            }}
            className="btn-secondary"
          >
            <Copy size={20} />
            EXPORTAR ATUAL
          </button>
        </div>
      </section>

      <div className="card bg-[var(--color-surface-hover)] border-dashed border border-brand/20 p-8 space-y-5 rounded-3xl">
        <div className="flex items-center gap-4 text-brand">
          <div className="p-2 bg-brand/10 rounded-lg">
            <Info size={20} />
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo de Sincronia</h4>
        </div>
        <ul className="space-y-3 text-xs text-[var(--color-text-muted)] font-medium list-none">
          <li className="flex gap-3"><span className="text-brand">•</span> Novos exercícios são mapeados automaticamente ao catálogo.</li>
          <li className="flex gap-3"><span className="text-brand">•</span> Semanas conflitantes serão substituídas pela nova matriz.</li>
          <li className="flex gap-3"><span className="text-brand">•</span> IDs de exercícios devem ser únicos na base global.</li>
        </ul>
      </div>
    </div>
  );
}
