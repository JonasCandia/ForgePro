import React, { useState, useMemo } from 'react';
import { ArrowLeft, Trash2, Pencil, CheckSquare, Square, ChevronDown, ChevronUp, Search, Save, X, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { workoutService } from '../../lib/workoutService';
import { WorkoutSession, WorkoutSeries } from '../../types';
import { useWorkouts, useInvalidateWorkouts } from '../../hooks/useWorkouts';

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as Record<string, unknown>).toDate === 'function')
    return (raw as { toDate: () => Date }).toDate();
  return new Date(raw as string);
}

interface EditState {
  nomeTreino: string;
  objetivo: string;
  series: WorkoutSeries[];
}

interface ManageWorkoutsProps {
  onBack: () => void;
}

export default function ManageWorkouts({ onBack }: ManageWorkoutsProps) {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const invalidateWorkouts = useInvalidateWorkouts();

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return [...workouts].sort((a, b) => (b.data > a.data ? 1 : -1));
    const q = search.toLowerCase();
    return workouts
      .filter(w =>
        (w.nomeTreino ?? '').toLowerCase().includes(q) ||
        w.exerciciosSummary?.some(s => s.exercicioNome.toLowerCase().includes(q))
      )
      .sort((a, b) => (b.data > a.data ? 1 : -1));
  }, [workouts, search]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function startEdit(workout: WorkoutSession) {
    setEditing(prev => ({
      ...prev,
      [workout.id]: {
        nomeTreino: workout.nomeTreino ?? '',
        objetivo: workout.objetivo ?? '',
        series: workout.series ? [...workout.series] : [],
      },
    }));
    setExpanded(prev => new Set([...prev, workout.id]));
  }

  function cancelEdit(id: string) {
    setEditing(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateEditField(id: string, field: 'nomeTreino' | 'objetivo', value: string) {
    setEditing(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function updateSerie(workoutId: string, serieIdx: number, field: keyof WorkoutSeries, value: unknown) {
    setEditing(prev => {
      const series = [...prev[workoutId].series];
      series[serieIdx] = { ...series[serieIdx], [field]: value };
      return { ...prev, [workoutId]: { ...prev[workoutId], series } };
    });
  }

  async function saveEdit(workoutId: string) {
    const state = editing[workoutId];
    if (!state) return;
    setSaving(workoutId);
    try {
      await workoutService.updateWorkout(workoutId, {
        nomeTreino: state.nomeTreino.trim() || undefined,
        objetivo: state.objetivo || undefined,
        series: state.series.length > 0 ? state.series : undefined,
      });
      invalidateWorkouts();
      cancelEdit(workoutId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(workoutId: string) {
    if (!window.confirm('Remover este treino do histórico?')) return;
    setDeleting(workoutId);
    try {
      await workoutService.deleteWorkout(workoutId);
      invalidateWorkouts();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Remover ${selected.size} treino${selected.size > 1 ? 's' : ''} do histórico?`)) return;
    setBulkDeleting(true);
    try {
      await workoutService.deleteManyWorkouts([...selected]);
      invalidateWorkouts();
      exitSelectMode();
    } catch (e) { console.error(e); }
    finally { setBulkDeleting(false); }
  }

  return (
    <div className="space-y-6 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-200 transition-colors -ml-2"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-0.5">Histórico</h2>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight">Gerenciar Treinos</h1>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar treino ou exercício..."
            className="form-input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {selectMode ? (
          <>
            <button onClick={exitSelectMode} className="btn-secondary text-xs shrink-0">Cancelar</button>
            <button
              onClick={handleBulkDelete}
              disabled={selected.size === 0 || bulkDeleting}
              className="btn-primary text-xs shrink-0 disabled:opacity-40 flex items-center gap-1.5"
            >
              {bulkDeleting
                ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                : <Trash2 size={13} />}
              {selected.size > 0 ? `Apagar (${selected.size})` : 'Apagar'}
            </button>
          </>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            disabled={workouts.length === 0}
            className="btn-secondary text-xs shrink-0 disabled:opacity-40 flex items-center gap-1.5"
          >
            <CheckSquare size={13} />
            Selecionar
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card p-4 h-20 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-bold text-gray-400">
            {search ? 'Nenhum treino corresponde à busca.' : 'Sem treinos registrados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(workout => {
            const isEditing = !!editing[workout.id];
            const editState = editing[workout.id];
            const isExpanded = expanded.has(workout.id);
            const hasSeries = (workout.series?.length ?? 0) > 0;

            return (
              <div key={workout.id} className="card overflow-hidden">
                {/* Card header */}
                <div className="p-4 flex items-start gap-3 border-b border-outline">
                  {selectMode && (
                    <button
                      onClick={() => toggleSelect(workout.id)}
                      className="shrink-0 text-brand mt-0.5"
                      aria-label={selected.has(workout.id) ? 'Desselecionar' : 'Selecionar'}
                    >
                      {selected.has(workout.id)
                        ? <CheckSquare size={18} />
                        : <Square size={18} className="text-gray-500" />}
                    </button>
                  )}

                  {isEditing ? (
                    /* Edit mode */
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <label className="input-label">Nome do Treino</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editState.nomeTreino}
                          onChange={e => updateEditField(workout.id, 'nomeTreino', e.target.value)}
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="input-label">Objetivo</label>
                        <select
                          className="form-input"
                          value={editState.objetivo}
                          onChange={e => updateEditField(workout.id, 'objetivo', e.target.value)}
                        >
                          <option value="">Sem objetivo</option>
                          <option value="cutting">Cutting</option>
                          <option value="bulking">Bulking</option>
                          <option value="manutencao">Manutenção</option>
                          <option value="taf">TAF</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(workout.id)}
                          disabled={saving === workout.id}
                          className="btn-primary flex-1 flex items-center justify-center gap-2 text-xs disabled:opacity-60"
                        >
                          {saving === workout.id
                            ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
                            : <Save size={14} />}
                          Salvar
                        </button>
                        <button
                          onClick={() => cancelEdit(workout.id)}
                          disabled={saving === workout.id}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-xs"
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{workout.nomeTreino ?? 'Treino'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {format(toDate(workout.data), "dd 'de' MMM yyyy", { locale: ptBR })}
                          {workout.objetivo && (
                            <span className="ml-2 bg-surface-hover px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                              {workout.objetivo}
                            </span>
                          )}
                          {workout.semana && (
                            <span className="ml-2 text-gray-600">Sem. {workout.semana}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          {workout.exerciciosSummary?.length ?? 0} exercício{(workout.exerciciosSummary?.length ?? 0) !== 1 ? 's' : ''}
                          {hasSeries && ` · ${workout.series!.length} série${workout.series!.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(workout)}
                          className="p-2 text-gray-600 hover:text-brand transition-colors"
                          aria-label="Editar treino"
                        >
                          <Pencil size={15} />
                        </button>
                        {(hasSeries || (workout.exerciciosSummary?.length ?? 0) > 0) && (
                          <button
                            onClick={() => toggleExpand(workout.id)}
                            className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
                            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(workout.id)}
                          disabled={deleting === workout.id}
                          className="p-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label="Remover treino"
                        >
                          {deleting === workout.id
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                            : <Trash2 size={15} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Expanded: series editor (edit mode) or series viewer (view mode) */}
                {isExpanded && (
                  <div className="bg-surface/50">
                    {isEditing && editState.series.length > 0 ? (
                      /* Editable series table */
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Séries — edite peso, reps e status
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-600 border-b border-outline">
                                <th className="text-left px-4 py-2 font-black uppercase tracking-wider">Exercício</th>
                                <th className="text-center px-2 py-2 font-black uppercase tracking-wider">#</th>
                                <th className="text-center px-2 py-2 font-black uppercase tracking-wider">Peso (kg)</th>
                                <th className="text-center px-2 py-2 font-black uppercase tracking-wider">Reps</th>
                                <th className="text-center px-2 py-2 font-black uppercase tracking-wider">Falhou</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editState.series.map((s, idx) => (
                                <tr key={s.id ?? idx} className="border-b border-outline/30 last:border-0">
                                  <td className="px-4 py-2 font-medium max-w-[100px] truncate">{s.exercicioNome}</td>
                                  <td className="px-2 py-2 text-center font-mono text-gray-500">{s.serieNum}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      className="form-input text-center font-mono w-16 py-1 text-xs"
                                      value={s.pesoReal}
                                      onChange={e => updateSerie(workout.id, idx, 'pesoReal', parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      className="form-input text-center font-mono w-14 py-1 text-xs"
                                      value={s.repeticoesReais}
                                      onChange={e => updateSerie(workout.id, idx, 'repeticoesReais', parseInt(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-red-500"
                                      checked={s.falhou}
                                      onChange={e => updateSerie(workout.id, idx, 'falhou', e.target.checked)}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Read-only series view */
                      workout.series && workout.series.length > 0 ? (
                        <div>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Séries Detalhadas</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-600 border-b border-outline">
                                  <th className="text-left px-4 py-2 font-black uppercase tracking-wider">Exercício</th>
                                  <th className="text-center px-3 py-2 font-black uppercase tracking-wider">#</th>
                                  <th className="text-center px-3 py-2 font-black uppercase tracking-wider">Peso</th>
                                  <th className="text-center px-3 py-2 font-black uppercase tracking-wider">Reps</th>
                                  <th className="text-center px-3 py-2 font-black uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workout.series.map((s, i) => (
                                  <tr key={s.id ?? i} className="border-b border-outline/30 last:border-0">
                                    <td className="px-4 py-2 font-medium max-w-[120px] truncate">{s.exercicioNome}</td>
                                    <td className="px-3 py-2 text-center font-mono text-gray-500">{s.serieNum}</td>
                                    <td className="px-3 py-2 text-center font-mono text-gray-300">
                                      {s.pesoReal > 0 ? `${s.pesoReal}kg` : s.tempoSegundos ? `${s.tempoSegundos}s` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center font-mono text-gray-300">
                                      {s.distanciaMetros ? `${s.distanciaMetros}m` : s.repeticoesReais}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {s.falhou
                                        ? <span className="text-red-400 font-bold text-[10px] uppercase">Falhou</span>
                                        : <span className="text-brand font-bold text-[10px] uppercase">OK</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        /* Summary only */
                        workout.exerciciosSummary && workout.exerciciosSummary.length > 0 ? (
                          <div>
                            <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Resumo de Exercícios</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-600 border-b border-outline">
                                    <th className="text-left px-4 py-2 font-black uppercase tracking-wider">Exercício</th>
                                    <th className="text-center px-3 py-2 font-black uppercase tracking-wider">Séries</th>
                                    <th className="text-center px-3 py-2 font-black uppercase tracking-wider">Volume</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workout.exerciciosSummary.map((s, i) => (
                                    <tr key={i} className="border-b border-outline/30 last:border-0">
                                      <td className="px-4 py-2 font-medium">{s.exercicioNome}</td>
                                      <td className="px-3 py-2 text-center font-mono text-gray-300">{s.seriesRealizadas}</td>
                                      <td className="px-3 py-2 text-center font-mono text-brand">{s.pesoMax > 0 ? `${s.pesoMax}kg` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
