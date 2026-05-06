import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { useExercises } from '../../hooks/useExercises';
import { useProfile } from '../../hooks/useProfile';
import { useInvalidateWorkouts } from '../../hooks/useWorkouts';

interface SeriesEntry {
  series: number;
  repeticoes: number;
  pesoKg: number;
  observacoes: string;
}

interface LogEntry {
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular: string;
  seriesData: SeriesEntry[];
}

interface LogWorkoutProps {
  onBack: () => void;
}

export default function LogWorkout({ onBack }: LogWorkoutProps) {
  const { data: exercises = [], isLoading: loadingExercises } = useExercises();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const invalidateWorkouts = useInvalidateWorkouts();
  const loading = loadingExercises || loadingProfile;
  const objetivo = profile?.objetivo;
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addEntry() {
    if (!selectedExId) return;
    const ex = exercises.find(e => e.id === selectedExId);
    if (!ex) return;
    if (entries.find(e => e.exercicioId === selectedExId)) return;
    setEntries(prev => [...prev, {
      exercicioId: ex.id!,
      exercicioNome: ex.nome,
      grupoMuscular: ex.grupoMuscular,
      seriesData: [{ series: 1, repeticoes: 10, pesoKg: 0, observacoes: '' }]
    }]);
    setSelectedExId('');
  }

  function removeEntry(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function addSeries(entryIdx: number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : {
      ...e,
      seriesData: [...e.seriesData, { series: e.seriesData.length + 1, repeticoes: 10, pesoKg: 0, observacoes: '' }]
    }));
  }

  function removeSeries(entryIdx: number, seriesIdx: number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : {
      ...e,
      seriesData: e.seriesData.filter((_, j) => j !== seriesIdx).map((s, j) => ({ ...s, series: j + 1 }))
    }));
  }

  function updateSeries(entryIdx: number, seriesIdx: number, field: keyof SeriesEntry, value: string | number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : {
      ...e,
      seriesData: e.seriesData.map((s, j) => j !== seriesIdx ? s : { ...s, [field]: value })
    }));
  }

  async function handleFinish() {
    if (entries.length === 0) return;
    setSaving(true);
    try {
      const data = {
        entries: entries.map(e => ({
          exercicioId: e.exercicioId,
          exercicioNome: e.exercicioNome,
          grupoMuscular: e.grupoMuscular,
          series: e.seriesData.reduce((max, s) => Math.max(max, s.series), 0),
          repeticoes: e.seriesData[0]?.repeticoes ?? 0,
          pesoKg: Math.max(...e.seriesData.map(s => s.pesoKg)),
          observacoes: e.seriesData.map(s => s.observacoes).filter(Boolean).join('; ')
        }))
      };
      await workoutService.saveManualWorkout(data, objetivo);
      invalidateWorkouts();
      setSaved(true);
      setEntries([]);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 pt-8">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
          <Check size={32} className="text-brand" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Treino Salvo!</h2>
          <p className="text-gray-400 text-sm mt-2">Seu treino foi registrado com sucesso.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSaved(false)} className="btn-secondary">Novo Treino</button>
          <button onClick={onBack} className="btn-primary">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      <header className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Registro Manual</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Registrar Treino</h1>
        </div>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            className="form-input appearance-none pr-8"
            value={selectedExId}
            onChange={e => setSelectedExId(e.target.value)}
          >
            <option value="">Selecione um exercício</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.nome}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <button onClick={addEntry} disabled={!selectedExId} className="btn-primary disabled:opacity-40 px-4">
          <Plus size={16} />
        </button>
      </div>

      {entries.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-sm">Adicione exercícios acima para começar.</p>
        </div>
      )}

      {entries.map((entry, entryIdx) => (
        <div key={entryIdx} className="card overflow-hidden border-l-4 border-brand">
          <div className="p-4 flex items-center justify-between border-b border-outline">
            <div>
              <p className="font-bold text-sm">{entry.exercicioNome}</p>
              <p className="text-xs text-gray-500">{entry.grupoMuscular}</p>
            </div>
            <button onClick={() => removeEntry(entryIdx)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-600 uppercase tracking-wider font-black px-1">
              <span>Série</span><span>Reps</span><span>Peso (kg)</span><span></span>
            </div>
            {entry.seriesData.map((s, sIdx) => (
              <div key={sIdx} className="grid grid-cols-4 gap-2 items-center">
                <span className="text-sm font-bold text-brand text-center">S{s.series}</span>
                <input
                  type="number" min="1" className="form-input text-center"
                  value={s.repeticoes}
                  onChange={e => updateSeries(entryIdx, sIdx, 'repeticoes', parseInt(e.target.value) || 0)}
                />
                <input
                  type="number" min="0" step="0.5" className="form-input text-center"
                  value={s.pesoKg}
                  onChange={e => updateSeries(entryIdx, sIdx, 'pesoKg', parseFloat(e.target.value) || 0)}
                />
                <button
                  onClick={() => removeSeries(entryIdx, sIdx)}
                  disabled={entry.seriesData.length <= 1}
                  className="p-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 mx-auto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => addSeries(entryIdx)} className="btn-secondary w-full text-xs">
              <Plus size={14} /> Adicionar Série
            </button>
          </div>
        </div>
      ))}

      {entries.length > 0 && (
        <button onClick={handleFinish} disabled={saving} className="btn-primary w-full">
          {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
          {saving ? 'Salvando...' : 'Finalizar e Salvar'}
        </button>
      )}
    </div>
  );
}