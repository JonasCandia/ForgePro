import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Check, ChevronDown, Timer, Dumbbell, Activity } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { useExercises } from '../../hooks/useExercises';
import { useProfile } from '../../hooks/useProfile';
import { useInvalidateWorkouts } from '../../hooks/useWorkouts';
import type { ModalidadeExercicio } from '../../types';
import { getModalidade, COLUNAS_SERIE, LABEL_MODALIDADE, formatarTempo, calcularPace, formatarDistancia } from '../../lib/exercicioUtils';

interface SeriesEntry {
  series: number;
  // força dinâmica / peso corporal
  repeticoes: number;
  pesoKg: number;
  // corrida / cardio
  distanciaMetros: number;
  tempoSegundos: number;
  observacoes: string;
}

interface LogEntry {
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular: string;
  modalidade: ModalidadeExercicio;
  seriesData: SeriesEntry[];
}

interface LogWorkoutProps {
  onBack: () => void;
}

function defaultSerie(num: number, modalidade: ModalidadeExercicio): SeriesEntry {
  return { series: num, repeticoes: 10, pesoKg: 0, distanciaMetros: 0, tempoSegundos: 0, observacoes: '' };
}

// Formata tempo parcial "MM:SS" durante a digitação
function tempoDisplay(segundos: number): string {
  if (!segundos) return '';
  return formatarTempo(segundos);
}

// Input de tempo que aceita segundos e mostra "MM:SS"
function InputTempo({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [texto, setTexto] = useState(value > 0 ? String(value) : '');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setTexto(raw);
    const n = parseInt(raw, 10);
    onChange(Number.isFinite(n) && n >= 0 ? n : 0);
  }

  return (
    <div className="relative">
      <input
        type="number"
        min="0"
        inputMode="numeric"
        className="form-input text-center pr-6"
        placeholder="0"
        value={texto}
        onChange={handleChange}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">s</span>
    </div>
  );
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
    const modalidade = getModalidade(ex);
    setEntries(prev => [...prev, {
      exercicioId: ex.id!,
      exercicioNome: ex.nome,
      grupoMuscular: ex.grupoMuscular,
      modalidade,
      seriesData: [defaultSerie(1, modalidade)],
    }]);
    setSelectedExId('');
  }

  function removeEntry(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function addSeries(entryIdx: number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : {
      ...e,
      seriesData: [...e.seriesData, defaultSerie(e.seriesData.length + 1, e.modalidade)],
    }));
  }

  function removeSeries(entryIdx: number, seriesIdx: number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : ({
      ...e,
      seriesData: e.seriesData
        .filter((_, j) => j !== seriesIdx)
        .map((s, j) => ({ ...s, series: j + 1 })),
    })));
  }

  function updateSeries(entryIdx: number, seriesIdx: number, field: keyof SeriesEntry, value: number) {
    setEntries(prev => prev.map((e, i) => i !== entryIdx ? e : ({
      ...e,
      seriesData: e.seriesData.map((s, j) => j !== seriesIdx ? s : { ...s, [field]: value }),
    })));
  }

  async function handleFinish() {
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await workoutService.saveManualWorkout({
        entries: entries.map(e => ({
          exercicioId: e.exercicioId,
          exercicioNome: e.exercicioNome,
          grupoMuscular: e.grupoMuscular,
          modalidade: e.modalidade,
          seriesDetalhadas: e.seriesData.map(s => ({
            repeticoes: s.repeticoes,
            pesoKg: s.pesoKg,
            distanciaMetros: s.distanciaMetros,
            tempoSegundos: s.tempoSegundos,
          })),
        })),
      }, objetivo);
      invalidateWorkouts();
      setSaved(true);
      setEntries([]);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-6 w-40 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        {[0, 1].map(i => (
          <div key={i} className="card p-4 h-40 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 pt-8">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center forge-pop">
          <Check size={32} className="text-brand" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Treino Salvo!</h2>
          <p className="text-gray-400 text-sm mt-2">Dados registrados. Referência criada para a próxima sessão.</p>
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
        <button onClick={onBack} className="p-3 -ml-3 text-gray-400 hover:text-white transition-colors">
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
              <option key={ex.id} value={ex.id}>
                {ex.nome}
                {ex.modalidade && ex.modalidade !== 'forca_dinamica' ? ` · ${LABEL_MODALIDADE[ex.modalidade]}` : ''}
              </option>
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
        <ExercicioCard
          key={entry.exercicioId}
          entry={entry}
          onRemoveEntry={() => removeEntry(entryIdx)}
          onAddSeries={() => addSeries(entryIdx)}
          onRemoveSeries={sIdx => removeSeries(entryIdx, sIdx)}
          onUpdateSeries={(sIdx, field, value) => updateSeries(entryIdx, sIdx, field, value)}
        />
      ))}

      {entries.length > 0 && (
        <button onClick={handleFinish} disabled={saving} className="btn-primary w-full">
          {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /> : <Check size={16} />}
          {saving ? 'Salvando...' : 'Finalizar e Salvar'}
        </button>
      )}
    </div>
  );
}

// ─── Sub-componente do card de exercício ──────────────────────────────────────

interface ExercicioCardProps {
  entry: LogEntry;
  onRemoveEntry: () => void;
  onAddSeries: () => void;
  onRemoveSeries: (sIdx: number) => void;
  onUpdateSeries: (sIdx: number, field: keyof SeriesEntry, value: number) => void;
}

function ExercicioCard({ entry, onRemoveEntry, onAddSeries, onRemoveSeries, onUpdateSeries }: ExercicioCardProps) {
  const { modalidade, seriesData } = entry;
  const colunas = COLUNAS_SERIE[modalidade];
  // Largura da grid: serie + N colunas de input + botão
  const gridCols = `grid-cols-[2rem_repeat(${colunas.length},1fr)_2rem]`;

  const ModalIcon = modalidade === 'corrida' ? Activity
    : modalidade === 'isometria' || modalidade === 'cardio_livre' ? Timer
    : Dumbbell;

  return (
    <div className="card overflow-hidden border-brand/25">
      <div className="p-4 flex items-center justify-between border-b border-outline">
        <div className="flex items-center gap-2">
          <ModalIcon size={14} className="text-brand flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{entry.exercicioNome}</p>
            <p className="text-xs text-gray-500">
              {entry.grupoMuscular}
              {modalidade !== 'forca_dinamica' && (
                <span className="ml-2 text-brand/70">{LABEL_MODALIDADE[modalidade]}</span>
              )}
            </p>
          </div>
        </div>
        <button onClick={onRemoveEntry} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Cabeçalho da grade */}
        <div className={`grid ${gridCols} gap-2 text-[11px] text-gray-600 uppercase tracking-wider font-black px-1`}>
          <span>#</span>
          {colunas.map(c => (
            <span key={c.key}>{c.label}{c.unit ? ` (${c.unit})` : ''}</span>
          ))}
          <span />
        </div>

        {seriesData.map((s, sIdx) => (
          <SerieRow
            key={sIdx}
            serie={s}
            sIdx={sIdx}
            modalidade={modalidade}
            colunas={colunas}
            gridCols={gridCols}
            canRemove={seriesData.length > 1}
            onRemove={() => onRemoveSeries(sIdx)}
            onChange={(field, value) => onUpdateSeries(sIdx, field, value)}
          />
        ))}

        {/* Pace / preview para corrida */}
        {modalidade === 'corrida' && seriesData.some(s => s.distanciaMetros > 0 && s.tempoSegundos > 0) && (
          <div className="flex flex-wrap gap-3 pt-1">
            {seriesData.map((s, i) => s.distanciaMetros > 0 && s.tempoSegundos > 0 ? (
              <span key={i} className="text-[11px] font-mono text-brand/80">
                S{i + 1}: {formatarDistancia(s.distanciaMetros)} · {formatarTempo(s.tempoSegundos)} · {calcularPace(s.distanciaMetros, s.tempoSegundos)}
              </span>
            ) : null)}
          </div>
        )}

        <button onClick={onAddSeries} className="btn-secondary w-full text-xs">
          <Plus size={14} /> Adicionar Série
        </button>
      </div>
    </div>
  );
}

interface SerieRowProps {
  serie: SeriesEntry;
  sIdx: number;
  modalidade: ModalidadeExercicio;
  colunas: Array<{ key: string; label: string; unit?: string }>;
  gridCols: string;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (field: keyof SeriesEntry, value: number) => void;
}

function SerieRow({ serie, sIdx, modalidade, colunas, gridCols, canRemove, onRemove, onChange }: SerieRowProps) {
  return (
    <div className={`grid ${gridCols} gap-2 items-center`}>
      <span className="text-sm font-bold text-brand text-center">S{serie.series}</span>

      {colunas.map(col => {
        if (col.key === 'repeticoes') return (
          <input key={col.key}
            type="number" min="0" inputMode="numeric" className="form-input text-center"
            value={serie.repeticoes || ''}
            placeholder="0"
            onChange={e => onChange('repeticoes', parseInt(e.target.value) || 0)}
          />
        );
        if (col.key === 'pesoKg') return (
          <input key={col.key}
            type="number" min="0" step="0.5" inputMode="decimal" className="form-input text-center"
            value={serie.pesoKg || ''}
            placeholder="0"
            onChange={e => onChange('pesoKg', parseFloat(e.target.value) || 0)}
          />
        );
        if (col.key === 'distanciaMetros') return (
          <input key={col.key}
            type="number" min="0" step="50" inputMode="numeric" className="form-input text-center"
            value={serie.distanciaMetros || ''}
            placeholder="0"
            onChange={e => onChange('distanciaMetros', parseInt(e.target.value) || 0)}
          />
        );
        if (col.key === 'tempoSegundos') return (
          <input key={col.key}
            type="number" min="0" inputMode="numeric" className="form-input text-center"
            value={serie.tempoSegundos || ''}
            placeholder="0"
            onChange={e => onChange('tempoSegundos', parseInt(e.target.value) || 0)}
          />
        );
        return null;
      })}

      <button
        onClick={onRemove}
        disabled={!canRemove}
        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 mx-auto"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
