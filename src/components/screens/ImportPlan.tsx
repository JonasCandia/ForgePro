import React, { useState, useMemo } from 'react';
import { FileDown, FileUp, CheckCircle, AlertCircle, Copy, AlertTriangle, Plus } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { JSON_EXEMPLO, PROMPT_ESPC } from '../../constants';
import { useExercises } from '../../hooks/useExercises';

interface ImportPlanProps {
  onBack: () => void;
}

interface ImportPreview {
  semanas: number[];
  totalDias: number;
  totalExercicios: number;
  newExercises: { id: string; nome: string }[];
  warnings: string[];
  errors: string[];
}

function buildPreview(jsonStr: string, catalogIds: Set<string>): ImportPreview | null {
  if (!jsonStr.trim()) return null;
  let data: any;
  try { data = JSON.parse(jsonStr); } catch { return null; }
  if (!data.plano || !Array.isArray(data.plano)) return null;

  const semanasSet = new Set<number>();
  let totalDias = 0;
  let totalExercicios = 0;
  const newExercises: { id: string; nome: string }[] = [];
  const newExIds = new Set<string>();
  const errors: string[] = [];
  let stringRepCount = 0;
  let noModalidadeCount = 0;
  let noBlocoCount = 0;
  const noTipoSessaoDias: string[] = [];

  for (const semana of data.plano) {
    if (semana.semana != null) semanasSet.add(semana.semana);
    if (!semana.bloco) noBlocoCount++;
    if (!Array.isArray(semana.dias)) {
      errors.push(`Semana ${semana.semana}: "dias" deve ser um array.`);
      continue;
    }
    for (const dia of semana.dias) {
      totalDias++;
      if (!dia.tipoSessao && dia.dia) noTipoSessaoDias.push(`Sem. ${semana.semana} · ${dia.dia}`);
      if (!Array.isArray(dia.exercicios)) {
        errors.push(`Sem. ${semana.semana} / ${dia.dia}: "exercicios" deve ser um array.`);
        continue;
      }
      for (const ex of dia.exercicios) {
        totalExercicios++;
        const exId = String(ex.id);
        if (!catalogIds.has(exId) && !newExIds.has(exId)) {
          if (!ex.nome) {
            errors.push(`ID "${exId}" não existe no catálogo e não tem campo "nome" — a importação falhará.`);
          } else {
            newExercises.push({ id: exId, nome: ex.nome });
            newExIds.add(exId);
          }
        }
        if (typeof ex.repeticoes === 'string') stringRepCount++;
        if (!ex.modalidade) noModalidadeCount++;
      }
    }
  }

  const warnings: string[] = [];
  if (noBlocoCount > 0) warnings.push(`${noBlocoCount} semana(s) sem campo "bloco" — diferenciação de blocos não funcionará.`);
  if (noTipoSessaoDias.length > 0) {
    if (noTipoSessaoDias.length <= 5) {
      warnings.push(`"tipoSessao" ausente em: ${noTipoSessaoDias.join(', ')}.`);
    } else {
      warnings.push(`${noTipoSessaoDias.length} sessões sem "tipoSessao" — filtros e modo circuito não funcionarão.`);
    }
  }
  if (stringRepCount > 0) warnings.push(`${stringRepCount} campo(s) "repeticoes" com valor texto — serão salvos como 0.`);
  if (noModalidadeCount > 0) warnings.push(`${noModalidadeCount} exercício(s) sem "modalidade" — o app usará o padrão força dinâmica.`);

  return {
    semanas: [...semanasSet].sort((a, b) => a - b),
    totalDias,
    totalExercicios,
    newExercises,
    warnings,
    errors,
  };
}

export default function ImportPlan({ onBack }: ImportPlanProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data: exercises = [] } = useExercises();

  const catalogIds = useMemo(
    () => new Set(exercises.map(ex => String(ex.id))),
    [exercises]
  );

  const preview = useMemo(
    () => buildPreview(jsonInput, catalogIds),
    [jsonInput, catalogIds]
  );

  const canImport = !!preview && preview.errors.length === 0;

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(JSON_EXEMPLO, null, 2));
    setMessage('Exemplo copiado para a área de transferência!');
    setStatus('idle');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_ESPC);
    setMessage('Prompt copiado! Cole em uma IA e descreva seu treino.');
    setStatus('idle');
    setTimeout(() => setMessage(''), 4000);
  };

  const handleImport = async () => {
    if (!jsonInput.trim() || !canImport) return;
    setStatus('loading');
    setMessage('');
    try {
      const data = JSON.parse(jsonInput);
      await workoutService.importPlanMerge(data);
      setStatus('success');
      setMessage('Plano importado com sucesso! As semanas foram mescladas sem apagar outros dados existentes.');
      setJsonInput('');
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Falha ao importar o plano.');
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
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-secondary w-full min-h-[48px]"
      >
        {exporting ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
        ) : (
          <FileUp size={18} />
        )}
        {exporting ? 'Exportando...' : 'Exportar Plano Atual (JSON)'}
      </button>

      <section className="card p-6 space-y-4">
        <div className="flex justify-between items-center mb-1">
          <label className="input-label !mb-0">Cole o JSON do Plano</label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-400 hover:text-white transition-colors"
              title="Copia um prompt ESPC completo para colar em uma IA (ChatGPT, Gemini, etc.)"
            >
              <Copy size={12} />
              Prompt IA
            </button>
            <button
              onClick={handleCopyExample}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand hover:text-white transition-colors"
            >
              <Copy size={12} />
              Copiar Exemplo
            </button>
          </div>
        </div>
        <textarea
          className="w-full h-80 bg-surface-hover border border-input-border rounded-xl px-4 py-3 text-xs font-mono focus:border-brand focus:ring-0 transition-colors resize-none"
          placeholder='{ "plano": [ ... ] }'
          value={jsonInput}
          onChange={(e) => { setJsonInput(e.target.value); setStatus('idle'); setMessage(''); }}
        />

        {/* ── Preview de Importação ─────────────────────────────────────── */}
        {preview && (
          <div className="rounded-xl border border-outline overflow-hidden text-sm">
            {/* Summary header */}
            <div className="bg-brand/10 border-b border-outline px-4 py-3 flex flex-wrap gap-x-5 gap-y-1 items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand">Preview</span>
              <span className="text-xs text-gray-300">
                <span className="font-bold text-white">{preview.semanas.length}</span> semana(s)
                {preview.semanas.length > 0 && ` (${preview.semanas[0]}–${preview.semanas[preview.semanas.length - 1]})`}
              </span>
              <span className="text-xs text-gray-300"><span className="font-bold text-white">{preview.totalDias}</span> sessões</span>
              <span className="text-xs text-gray-300"><span className="font-bold text-white">{preview.totalExercicios}</span> exercícios</span>
            </div>

            {/* New exercises to be created */}
            {preview.newExercises.length > 0 && (
              <div className="px-4 py-3 border-b border-outline space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                  <Plus size={11} /> Serão criados no catálogo
                </p>
                <ul className="space-y-1">
                  {preview.newExercises.map(ex => (
                    <li key={ex.id} className="text-xs text-gray-300 flex items-center gap-2">
                      <code className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{ex.id}</code>
                      {ex.nome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="px-4 py-3 border-b border-outline space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> Avisos (não bloqueiam a importação)
                </p>
                <ul className="space-y-1.5">
                  {preview.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-yellow-500/80 leading-snug">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                  <AlertCircle size={11} /> Erros críticos — importação bloqueada
                </p>
                <ul className="space-y-1.5">
                  {preview.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-400 leading-snug">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All clear */}
            {preview.errors.length === 0 && (
              <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-brand">
                <CheckCircle size={13} /> Pronto para importar
              </div>
            )}
          </div>
        )}

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
          disabled={status === 'loading' || !canImport}
          className="btn-primary w-full disabled:opacity-50 min-h-[48px]"
        >
          {status === 'loading' ? (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
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
