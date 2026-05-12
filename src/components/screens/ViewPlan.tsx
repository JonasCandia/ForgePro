import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Edit3, Trash2, Check, X,
  ClipboardList, Plus, AlertTriangle, CheckSquare, Square,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { usePlanos, useUpdatePlano, useDeletePlano, useDeleteManyPlanos } from '../../hooks/usePlanos';
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
  const deleteManyPlanos = useDeleteManyPlanos();

  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [expandedDias, setExpandedDias] = useState<Set<string>>(new Set());
  const [editingDia, setEditingDia] = useState<string | null>(null);  // planoId
  const [editState, setEditState] = useState<EditState>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // planoId
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);

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

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
    setEditingDia(null);
    setConfirmDelete(null);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setConfirmDeleteSelected(false);
  }

  function toggleSelect(planoId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(planoId)) next.delete(planoId);
      else next.add(planoId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === planos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(planos.map(p => p.id)));
    }
  }

  async function handleDeleteSelected() {
    await deleteManyPlanos.mutateAsync([...selectedIds]);
    exitSelectionMode();
  }

  // ─── lookup de semana anterior para progressão ──────────────────────────
  const prevSemanaPlanos = useMemo(
    () => planos.filter(p => p.semana === (activeSemana ?? 0) - 1),
    [planos, activeSemana]
  );

  const prevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    prevSemanaPlanos.forEach(p =>
      p.exercicios.forEach(ex => {
        if (ex.pesoPlanejado > 0) map[ex.exercicioId] = ex.pesoPlanejado;
      })
    );
    return map;
  }, [prevSemanaPlanos]);

  // ─── loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="h-8 w-48 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
        <div className="h-10 w-full rounded-xl bg-surface-hover animate-pulse motion-reduce:animate-none" />
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

  // Navegação de semana por índice
  const semanaIdx = activeSemana !== null ? semanas.indexOf(activeSemana) : 0;
  const canPrev = semanaIdx > 0;
  const canNext = semanaIdx < semanas.length - 1;

  function prevSemana() {
    if (canPrev) setSelectedSemana(semanas[semanaIdx - 1]);
  }
  function nextSemana() {
    if (canNext) setSelectedSemana(semanas[semanaIdx + 1]);
  }

  // ─── render principal ────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pt-4 pb-36">

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {selectionMode ? (
          <>
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-white transition-colors"
            >
              {selectedIds.size === planos.length
                ? <CheckSquare size={16} className="text-brand" />
                : <Square size={16} className="text-gray-500" />}
              {selectedIds.size === 0
                ? 'Selecionar todos'
                : `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}`}
            </button>
            <button
              onClick={exitSelectionMode}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-black uppercase tracking-tight">Planos de Treino</h2>
            <button
              onClick={enterSelectionMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 border border-outline rounded-lg hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              <CheckSquare size={13} />
              Selecionar
            </button>
          </>
        )}
      </div>

      {/* ── Confirmação de exclusão em lote ──────────────────────────────── */}
      {confirmDeleteSelected && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-300">Excluir {selectedIds.size} plano{selectedIds.size > 1 ? 's' : ''}?</p>
            <p className="text-xs text-red-400/80 mt-0.5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDeleteSelected}
                disabled={deleteManyPlanos.isPending}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
              >
                {deleteManyPlanos.isPending ? 'Excluindo…' : 'Confirmar'}
              </button>
              <button
                onClick={() => setConfirmDeleteSelected(false)}
                className="px-4 py-1.5 border border-outline text-gray-400 text-xs font-bold rounded-lg hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Seletor de semana: setas ◀ Semana N ▶ ───────────────────────── */}
      {semanas.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={prevSemana}
            disabled={!canPrev}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline text-gray-500 hover:text-white hover:border-brand/50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 text-center">
            <p className="font-mono font-black text-base text-brand uppercase tracking-widest">
              Semana {activeSemana}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5 font-black uppercase tracking-widest">
              {planosNaSemana.length} {planosNaSemana.length === 1 ? 'sessão' : 'sessões'}
            </p>
          </div>
          <button
            onClick={nextSemana}
            disabled={!canNext}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline text-gray-500 hover:text-white hover:border-brand/50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            aria-label="Próxima semana"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── Cards de sessão ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {planosNaSemana.length === 0 && (
          <div className="card p-8 text-center text-gray-600 text-sm font-black uppercase tracking-widest">
            Nenhum treino nessa semana.
          </div>
        )}
        {planosNaSemana.map((plano, sessionIdx) => {
          const isExpanded = expandedDias.has(plano.id);
          const isEditing = editingDia === plano.id;
          const isSaving = updatePlano.isPending;
          const isDeleting = deletePlano.isPending && confirmDelete === plano.id;
          const isSelected = selectedIds.has(plano.id);
          const ordinal = String(sessionIdx + 1).padStart(2, '0');

          return (
            <div
              key={plano.id}
              className={`card overflow-hidden transition-all duration-200 ${
                selectionMode && isSelected
                  ? 'border-red-500/50 bg-red-500/5'
                  : isEditing
                  ? 'border-brand/60 bg-brand/[0.03]'
                  : 'border-outline'
              }`}
            >
              {/* ── Header da sessão ─────────────────────────────────── */}
              <div className="flex items-stretch">
                {/* Número ordinal âncora */}
                <div
                  className={`flex items-center justify-center w-14 shrink-0 border-r transition-colors ${
                    isEditing ? 'border-brand/30' : 'border-outline'
                  }`}
                >
                  {selectionMode ? (
                    <button
                      onClick={() => toggleSelect(plano.id)}
                      className="text-gray-500"
                      aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
                    >
                      {isSelected
                        ? <CheckSquare size={18} className="text-red-400" />
                        : <Square size={18} />}
                    </button>
                  ) : (
                    <span className={`font-mono font-black text-2xl leading-none transition-colors ${isEditing ? 'text-brand' : 'text-brand/40'}`}>
                      {ordinal}
                    </span>
                  )}
                </div>

                {/* Corpo do header */}
                <button
                  className="flex-1 flex items-center justify-between gap-3 p-4 text-left min-w-0"
                  onClick={() => selectionMode ? toggleSelect(plano.id) : toggleDia(plano.id)}
                >
                  <div className="min-w-0">
                    <p className="font-display font-black text-lg uppercase tracking-tight leading-tight truncate">
                      {plano.nomeSessao ?? plano.diaDaSemana}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                        {plano.exercicios.length} ex.
                      </span>
                      {plano.diaSugerido && (
                        <span className="text-[10px] text-gray-600">
                          · sugerido {plano.diaSugerido}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {plano.tipoSessao && (
                      <SessionTypeBadge tipo={plano.tipoSessao} />
                    )}
                    {!selectionMode && (
                      isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Botão editar — fora do botão principal */}
                {!selectionMode && !isEditing && (
                  <button
                    onClick={() => startEdit(plano)}
                    className="flex items-center justify-center w-12 shrink-0 border-l border-outline text-gray-600 hover:text-brand hover:bg-brand/5 transition-colors"
                    title="Editar sessão"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </div>

              {/* ── Conteúdo expandido ───────────────────────────────── */}
              {isExpanded && (
                <div className={`border-t transition-colors ${isEditing ? 'border-brand/30' : 'border-outline'}`}>
                  {/* Lista de exercícios */}
                  <div className="divide-y divide-outline/40">
                    {plano.exercicios.map((ex, exIdx) => (
                      <ExercicioRow
                        key={ex.exercicioId}
                        ex={ex}
                        exIdx={exIdx}
                        isEditing={isEditing}
                        editRow={editState[ex.exercicioId]}
                        prevWeight={prevWeightMap[ex.exercicioId]}
                        onEdit={(field, value) =>
                          setEditState(prev => ({
                            ...prev,
                            [ex.exercicioId]: { ...prev[ex.exercicioId], [field]: value },
                          }))
                        }
                        onRemove={() => removeExercicio(plano, ex.exercicioId)}
                      />
                    ))}
                  </div>

                  {/* ── Ações ────────────────────────────────────────── */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 p-3 border-t border-brand/20">
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
                        title="Excluir sessão"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end p-3 border-t border-outline/40">
                      <button
                        onClick={() => setConfirmDelete(plano.id)}
                        className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                        Excluir Sessão
                      </button>
                    </div>
                  )}

                  {/* ── Confirmação de exclusão ───────────────────────── */}
                  {confirmDelete === plano.id && (
                    <div className="bg-red-500/10 border-t border-red-500/30 p-4 flex items-center gap-3">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-300 flex-1">
                        Excluir <strong>{plano.nomeSessao ?? plano.diaDaSemana}</strong>? Não pode ser desfeito.
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

      {/* ── Link rápido importar ─────────────────────────────────────────── */}
      {!selectionMode && (
        <div className="pt-2 text-center">
          <button
            onClick={onNavigateImport}
            className="text-xs text-gray-600 hover:text-brand transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Plus size={12} />
            Importar / mesclar nova semana
          </button>
        </div>
      )}

      {/* ── Barra flutuante modo seleção ─────────────────────────────────── */}
      {selectionMode && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 bg-surface border border-outline rounded-2xl px-5 py-3 shadow-2xl">
            <span className="text-sm text-gray-400">
              {selectedIds.size === 0
                ? 'Nenhum selecionado'
                : `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={() => setConfirmDeleteSelected(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Trash2 size={13} />
              Excluir
            </button>
            <button
              onClick={exitSelectionMode}
              className="px-3 py-2 border border-outline text-gray-400 text-xs font-bold rounded-xl hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── badge de tipo de sessão ──────────────────────────────────────────────────

const TIPO_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  circuito_taf: { label: 'CIRCUITO TAF', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  simulado:     { label: 'SIMULADO',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  forca:        { label: 'FORÇA',        color: '#CCFF00', bg: 'rgba(204,255,0,0.08)',  border: 'rgba(204,255,0,0.25)'  },
  hipertrofia:  { label: 'HIPERTROFIA',  color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  resistencia:  { label: 'RESISTÊNCIA',  color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
};

function SessionTypeBadge({ tipo }: { tipo: string }) {
  const t = TIPO_BADGE[tipo] ?? { label: tipo.toUpperCase(), color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' };
  return (
    <span
      className="text-[11px] font-black uppercase tracking-[0.15em] rounded px-1.5 py-0.5 border shrink-0"
      style={{ color: t.color, background: t.bg, borderColor: t.border }}
    >
      {t.label}
    </span>
  );
}

// ─── linha de exercício ────────────────────────────────────────────────────────

interface ExercicioRowProps {
  ex: ExercicioNoPlano;
  exIdx: number;
  isEditing: boolean;
  editRow: EditRow | undefined;
  prevWeight: number | undefined;
  onEdit: (field: keyof EditRow, value: string | number) => void;
  onRemove: () => void;
}

function ExercicioRow({ ex, exIdx, isEditing, editRow, prevWeight, onEdit, onRemove }: ExercicioRowProps) {
  const row = editRow ?? {
    seriesPlanejadas: ex.seriesPlanejadas,
    repeticoesPlanejadas: ex.repeticoesPlanejadas,
    pesoPlanejado: ex.pesoPlanejado,
    observacoesPlano: ex.observacoesPlano ?? '',
  };

  const modalidadeLabel = ex.modalidade && ex.modalidade !== 'forca_dinamica'
    ? LABEL_MODALIDADE[ex.modalidade]
    : null;

  // Determinar display de reps/tempo
  const repDisplay =
    ex.modalidade === 'corrida' || ex.modalidade === 'cardio_livre'
      ? ex.tempoPlanejadoSegundos ? `${ex.tempoPlanejadoSegundos}s` : '–'
      : ex.modalidade === 'isometria'
      ? ex.tempoPlanejadoSegundos ? `${ex.tempoPlanejadoSegundos}s` : String(ex.repeticoesPlanejadas)
      : String(ex.repeticoesPlanejadas);

  const hasPeso = !['peso_corporal', 'corrida', 'cardio_livre', 'isometria'].includes(ex.modalidade ?? '');

  // Micro-indicador de progressão
  let deltaNode: React.ReactNode = null;
  if (hasPeso && prevWeight !== undefined && ex.pesoPlanejado > 0) {
    const diff = ex.pesoPlanejado - prevWeight;
    if (diff > 0) {
      deltaNode = (
        <span className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-emerald-400">
          <TrendingUp size={9} />+{diff}kg
        </span>
      );
    } else if (diff < 0) {
      deltaNode = (
        <span className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-red-400">
          <TrendingDown size={9} />{diff}kg
        </span>
      );
    } else {
      deltaNode = <span className="font-mono text-[10px] text-gray-700">─</span>;
    }
  }

  const ordinal = String(exIdx + 1).padStart(2, '0');

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.015] transition-colors">
        {/* Número âncora */}
        <span className="font-mono font-black text-xs text-brand/50 w-5 shrink-0 select-none">{ordinal}</span>

        {/* Nome + modalidade */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{ex.exercicioNome}</p>
          {modalidadeLabel && (
            <p className="text-[10px] text-gray-600 mt-0.5">{modalidadeLabel}</p>
          )}
          {ex.observacoesPlano && (
            <p className="text-[10px] text-gray-700 mt-0.5 italic truncate">{ex.observacoesPlano}</p>
          )}
        </div>

        {/* Dados */}
        <div className="flex items-center gap-3 shrink-0 text-right">
          <span className="font-mono text-xs text-brand font-bold tabular-nums">{ex.seriesPlanejadas}×{repDisplay}</span>
          {hasPeso && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-xs text-gray-400 tabular-nums">{ex.pesoPlanejado}kg</span>
              {deltaNode}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── modo edição ─────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-3 bg-brand/[0.04] border-l-2 border-brand/50">
      {/* Cabeçalho da row em edição */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-xs text-brand/60">{ordinal}</span>
          <p className="font-medium text-sm">{ex.exercicioNome}</p>
          {modalidadeLabel && (
            <span className="text-[10px] text-brand/60 font-black uppercase tracking-wide">{modalidadeLabel}</span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-700 hover:text-red-400 transition-colors rounded"
          title="Remover exercício"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Inputs em grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="input-label text-[10px]">Séries</label>
          <input
            type="number" min="1" inputMode="numeric"
            className="form-input text-center text-xs"
            value={row.seriesPlanejadas}
            onChange={e => onEdit('seriesPlanejadas', parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="input-label text-[10px]">Reps</label>
          <input
            type="number" min="0" inputMode="numeric"
            className="form-input text-center text-xs"
            value={row.repeticoesPlanejadas}
            onChange={e => onEdit('repeticoesPlanejadas', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="input-label text-[10px]">Peso (kg)</label>
          <input
            type="number" min="0" step="0.5" inputMode="decimal"
            className="form-input text-center text-xs"
            value={row.pesoPlanejado}
            onChange={e => onEdit('pesoPlanejado', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="input-label text-[10px]">Observações</label>
          <input
            type="text"
            className="form-input text-xs"
            placeholder="opcional"
            value={row.observacoesPlano}
            onChange={e => onEdit('observacoesPlano', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
