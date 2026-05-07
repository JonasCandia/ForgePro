import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Edit3, Trash2, Check, X,
  ClipboardList, Plus, AlertTriangle, Dumbbell
} from 'lucide-react';
import { usePlanos, useUpdatePlano, useDeletePlano } from '../../hooks/usePlanos';
import type { Plano, ExercicioNoPlano } from '../../types';
import { LABEL_MODALIDADE } from '../../lib/exercicioUtils';

interface ViewPlanProps {
  onNavigateImport: () => void;
}

// ─── tipos internos de edição ──────────────────────────────────────────────

interface EditRow {
  seriesPlanejadas: number;
  repeticoesPlanejadas: number;
  pesoPlanejado: number;
  observacoesPlano: string;
}

type EditState = Record<string, EditRow>; // key = exercicioId

// ─── componente principal ──────────────────────────────────────────────────

export default function ViewPlan({ onNavigateImport }: ViewPlanProps) {
  const { data: planos = [], isLoading } = usePlanos();
  const updatePlano = useUpdatePlano();
  const deletePlano = useDeletePlano();

  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [expandedDias, setExpandedDias] = useState<Set<string>>(new Set());
  const [editingDia, setEditingDia] = useState<string | null>(null);  // planoId
  const [editState, setEditState] = useState<EditState>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // planoId

  // Semanas disponíveis, ordenadas
  const semanas = useMemo(() => {
    const s = [...new Set(planos.map(p => p.semana))].sort((a, b) => a - b);
    return s;
  }, [planos]);

  // Auto-seleciona a primeira semana disponível
  const activeSemana = selectedSemana ?? semanas[0] ?? null;

  const planosNaSemana = useMemo(
    () => planos.filter(p => p.semana === activeSemana),
    [planos, activeSemana]
  );

  function toggleDia(planoId: string) {
    setExpandedDias(prev => {
      const next = new Set(prev);
      if (next.has(planoId)) next.delete(planoId);
      else next.add(planoId);
      return next;
    });
  }

  function startEdit(plano: Plano) {
    const state: EditState = {};
    plano.exercicios.forEach(ex => {
      state[ex.exercicioId] = {
        seriesPlanejadas: ex.seriesPlanejadas,
        repeticoesPlanejadas: ex.repeticoesPlanejadas,
        pesoPlanejado: ex.pesoPlanejado,
        observacoesPlano: ex.observacoesPlano ?? '',
      };
    });
    setEditState(state);
    setEditingDia(plano.id);
    setExpandedDias(prev => new Set([...prev, plano.id]));
  }

  function cancelEdit() {
    setEditingDia(null);
    setEditState({});
  }

  async function saveEdit(plano: Plano) {
    const updated: Plano = {
      ...plano,
      exercicios: plano.exercicios.map(ex => ({
        ...ex,
        ...(editState[ex.exercicioId] ?? {}),
      })),
    };
    await updatePlano.mutateAsync(updated);
    setEditingDia(null);
    setEditState({});
  }

  async function removeExercicio(plano: Plano, exercicioId: string) {
    const updated: Plano = {
      ...plano,
      exercicios: plano.exercicios.filter(ex => ex.exercicioId !== exercicioId),
    };
    await updatePlano.mutateAsync(updated);
    // Remove do editState local também
    setEditState(prev => {
      const next = { ...prev };
      delete next[exercicioId];
      return next;
    });
  }

  async function confirmDeleteDia(planoId: string) {
    await deletePlano.mutateAsync(planoId);
    setConfirmDelete(null);
    setEditingDia(null);
    setExpandedDias(prev => {
      const next = new Set(prev);
      next.delete(planoId);
      return next;
    });
  }

  // ─── loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="h-8 w-48 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 w-24 rounded-lg bg-surface-hover animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="card p-4 h-16 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  // ─── estado vazio ────────────────────────────────────────────────────────
  if (planos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 pt-16 pb-24 text-center">
        <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center border border-brand/20">
          <ClipboardList size={32} className="text-brand" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Nenhum Plano</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-xs">
            Importe um plano em JSON para começar a visualizar e editar seus treinos programados.
          </p>
        </div>
        <button onClick={onNavigateImport} className="btn-primary">
          <Plus size={16} />
          Importar Plano
        </button>
      </div>
    );
  }

  // ─── render principal ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pt-4 pb-24">

      {/* Pills de semana */}
      <div className="flex flex-wrap gap-2">
        {semanas.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSemana(s)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              activeSemana === s
                ? 'bg-brand text-black border-brand'
                : 'border-outline text-gray-400 hover:border-brand hover:text-gray-200'
            }`}
          >
            Semana {s}
          </button>
        ))}
      </div>

      {/* Cards de dias */}
      <div className="space-y-3">
        {planosNaSemana.length === 0 && (
          <div className="card p-6 text-center text-gray-500 text-sm">
            Nenhum treino nessa semana.
          </div>
        )}
        {planosNaSemana.map(plano => {
          const isExpanded = expandedDias.has(plano.id);
          const isEditing = editingDia === plano.id;
          const isSaving = updatePlano.isPending;
          const isDeleting = deletePlano.isPending && confirmDelete === plano.id;

          return (
            <div
              key={plano.id}
              className={`card overflow-hidden transition-colors ${isEditing ? 'border-brand/50' : 'border-outline'}`}
            >
              {/* Cabeçalho do card */}
              <div className="flex items-center p-4">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => toggleDia(plano.id)}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isEditing ? 'bg-brand animate-pulse motion-reduce:animate-none' : 'bg-gray-600'}`} />
                  <div>
                    <p className="font-bold text-sm">{plano.diaDaSemana}</p>
                    <p className="text-xs text-gray-500">
                      {plano.nomeTreino || 'Treino'}
                      <span className="ml-2">· {plano.exercicios.length} exercícios</span>
                      {plano.tipoSessao && <span className="ml-2 text-brand/70">{plano.tipoSessao}</span>}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1 ml-2">
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(plano)}
                      className="p-2 text-gray-500 hover:text-brand transition-colors rounded-lg hover:bg-brand/10"
                      title="Editar dia"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => toggleDia(plano.id)}
                    className="p-2 text-gray-500 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Conteúdo expandido */}
              {isExpanded && (
                <div className="border-t border-outline">
                  {/* Tabela de exercícios */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-600 border-b border-outline">
                          <th className="text-left p-3 font-black uppercase tracking-wider">Exercício</th>
                          <th className="text-center p-3 font-black uppercase tracking-wider w-16">Séries</th>
                          <th className="text-center p-3 font-black uppercase tracking-wider w-16">Reps</th>
                          <th className="text-center p-3 font-black uppercase tracking-wider w-20">Peso</th>
                          {isEditing && (
                            <th className="text-center p-3 font-black uppercase tracking-wider w-12" />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {plano.exercicios.map((ex) => (
                          <ExercicioRow
                            key={ex.exercicioId}
                            ex={ex}
                            isEditing={isEditing}
                            editRow={editState[ex.exercicioId]}
                            onEdit={(field, value) =>
                              setEditState(prev => ({
                                ...prev,
                                [ex.exercicioId]: { ...prev[ex.exercicioId], [field]: value },
                              }))
                            }
                            onRemove={() => removeExercicio(plano, ex.exercicioId)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ações de edição */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 p-3 border-t border-outline">
                      <button
                        onClick={() => saveEdit(plano)}
                        disabled={isSaving}
                        className="btn-primary text-xs flex-1"
                      >
                        {isSaving ? (
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
                        ) : (
                          <Check size={14} />
                        )}
                        Salvar
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary text-xs">
                        <X size={14} />
                        Cancelar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(plano.id)}
                        className="p-2 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 ml-auto"
                        title="Excluir dia"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end p-3 border-t border-outline">
                      <button
                        onClick={() => setConfirmDelete(plano.id)}
                        className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                        Excluir Dia
                      </button>
                    </div>
                  )}

                  {/* Confirmação de exclusão */}
                  {confirmDelete === plano.id && (
                    <div className="bg-red-500/10 border-t border-red-500/30 p-4 flex items-center gap-3">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-300 flex-1">
                        Excluir <strong>{plano.diaDaSemana}</strong>? Esta ação não pode ser desfeita.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDeleteDia(plano.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {isDeleting ? '...' : 'Excluir'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 border border-outline text-gray-400 text-xs font-bold rounded-lg hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Link rápido para importar nova semana */}
      <div className="pt-2 text-center">
        <button
          onClick={onNavigateImport}
          className="text-xs text-gray-600 hover:text-brand transition-colors flex items-center gap-1.5 mx-auto"
        >
          <Plus size={12} />
          Importar / mesclar nova semana
        </button>
      </div>
    </div>
  );
}

// ─── linha de exercício (leitura ou edição) ────────────────────────────────

interface ExercicioRowProps {
  ex: ExercicioNoPlano;
  isEditing: boolean;
  editRow: EditRow | undefined;
  onEdit: (field: keyof EditRow, value: string | number) => void;
  onRemove: () => void;
}

function ExercicioRow({ ex, isEditing, editRow, onEdit, onRemove }: ExercicioRowProps) {
  const row = editRow ?? {
    seriesPlanejadas: ex.seriesPlanejadas,
    repeticoesPlanejadas: ex.repeticoesPlanejadas,
    pesoPlanejado: ex.pesoPlanejado,
    observacoesPlano: ex.observacoesPlano ?? '',
  };

  const modalidadeLabel = ex.modalidade && ex.modalidade !== 'forca_dinamica'
    ? LABEL_MODALIDADE[ex.modalidade]
    : null;

  if (!isEditing) {
    return (
      <tr className="border-b border-outline/40 last:border-0 hover:bg-white/[0.02] transition-colors">
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Dumbbell size={11} className="text-gray-600 flex-shrink-0" />
            <div>
              <p className="font-medium">{ex.exercicioNome}</p>
              {modalidadeLabel && (
                <p className="text-[10px] text-brand/70 mt-0.5">{modalidadeLabel}</p>
              )}
              {ex.observacoesPlano && (
                <p className="text-[10px] text-gray-600 mt-0.5 italic">{ex.observacoesPlano}</p>
              )}
            </div>
          </div>
        </td>
        <td className="p-3 text-center font-mono text-brand font-bold">{ex.seriesPlanejadas}</td>
        <td className="p-3 text-center font-mono text-gray-300">
          {ex.modalidade === 'corrida' || ex.modalidade === 'cardio_livre'
            ? (ex.tempoPlanejadoSegundos ? `${ex.tempoPlanejadoSegundos}s` : '–')
            : ex.modalidade === 'isometria'
            ? (ex.tempoPlanejadoSegundos ? `${ex.tempoPlanejadoSegundos}s` : ex.repeticoesPlanejadas)
            : ex.repeticoesPlanejadas}
        </td>
        <td className="p-3 text-center font-mono text-gray-300">
          {ex.modalidade === 'peso_corporal' || ex.modalidade === 'corrida' || ex.modalidade === 'cardio_livre' || ex.modalidade === 'isometria'
            ? '–'
            : `${ex.pesoPlanejado}kg`}
        </td>
      </tr>
    );
  }

  // modo edição
  return (
    <tr className="border-b border-outline/40 last:border-0 bg-brand/5">
      <td className="p-2 pl-3">
        <p className="font-medium text-xs mb-1">{ex.exercicioNome}</p>
        {modalidadeLabel && (
          <p className="text-[10px] text-brand/70">{modalidadeLabel}</p>
        )}
        <input
          type="text"
          className="form-input text-[11px] mt-1 py-1"
          placeholder="Observações..."
          value={row.observacoesPlano}
          onChange={e => onEdit('observacoesPlano', e.target.value)}
        />
      </td>
      <td className="p-2">
        <input
          type="number" min="1" inputMode="numeric"
          className="form-input text-center text-xs w-full"
          value={row.seriesPlanejadas}
          onChange={e => onEdit('seriesPlanejadas', parseInt(e.target.value) || 1)}
        />
      </td>
      <td className="p-2">
        <input
          type="number" min="0" inputMode="numeric"
          className="form-input text-center text-xs w-full"
          value={row.repeticoesPlanejadas}
          onChange={e => onEdit('repeticoesPlanejadas', parseInt(e.target.value) || 0)}
        />
      </td>
      <td className="p-2">
        <input
          type="number" min="0" step="0.5" inputMode="decimal"
          className="form-input text-center text-xs w-full"
          value={row.pesoPlanejado}
          onChange={e => onEdit('pesoPlanejado', parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="p-2 text-center">
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
          title="Remover exercício"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
