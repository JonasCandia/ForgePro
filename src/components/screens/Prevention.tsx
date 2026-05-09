import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Flame, CalendarDays } from 'lucide-react';
import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
import { useWorkouts } from '../../hooks/useWorkouts';

// ─── Prevention exercise catalogue ────────────────────────────────────────────

const PREVENTION_EXERCISES: { id: string; label: string; color: string }[] = [
  { id: 'custom_ponte01',      label: 'Ponte de Glúteo',       color: '#34D399' },
  { id: 'custom_nordic01',     label: 'Nordic Curl',           color: '#60A5FA' },
  { id: 'custom_prancha_perna',label: 'Prancha c/ Elevação',   color: '#A78BFA' },
  { id: 'custom_equil01',      label: 'Equilíbrio Unipodal',   color: '#F59E0B' },
];

const PREVENTION_IDS = new Set(PREVENTION_EXERCISES.map(e => e.id));

// A week key is "YEAR-WW" e.g. "2026-19"
function weekKey(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${getISOWeekYear(d)}-${String(getISOWeek(d)).padStart(2, '0')}`;
}

function weekLabel(key: string): string {
  const [, wk] = key.split('-');
  return `Sem. ${parseInt(wk)}`;
}

export default function Prevention() {
  const { data: workouts = [] } = useWorkouts();

  // ─── Derived data ─────────────────────────────────────────────────────────
  const { weekGrid, orderedWeeks, consecutiveMissed, perExercise, totalPreventionSessions } = useMemo(() => {
    // Map: weekKey → Set of prevention exercicioIds done that week
    const weekMap = new Map<string, Set<string>>();

    for (const w of workouts) {
      if (!w.data || !Array.isArray(w.exerciciosSummary)) continue;
      const key = weekKey(w.data);
      if (!weekMap.has(key)) weekMap.set(key, new Set());
      for (const s of w.exerciciosSummary) {
        if (PREVENTION_IDS.has(s.exercicioId)) {
          weekMap.get(key)!.add(s.exercicioId);
        }
      }
    }

    // Last 8 ISO weeks in chronological order
    const today = new Date();
    const orderedWeeks: string[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const k = weekKey(d.toISOString().slice(0, 10));
      if (!orderedWeeks.includes(k)) orderedWeeks.push(k);
    }

    // Consecutive missed weeks (counting from most recent backward)
    let consecutiveMissed = 0;
    for (let i = orderedWeeks.length - 1; i >= 0; i--) {
      const done = weekMap.get(orderedWeeks[i]);
      if (!done || done.size === 0) consecutiveMissed++;
      else break;
    }

    // Per-exercise total across all workouts
    const perExercise: Record<string, number> = {};
    for (const [, exSet] of weekMap) {
      for (const id of exSet) {
        perExercise[id] = (perExercise[id] ?? 0) + 1;
      }
    }

    // Total prevention sessions = weeks where any prevention exercise was done
    const totalPreventionSessions = [...weekMap.values()].filter(s => s.size > 0).length;

    return { weekGrid: weekMap, orderedWeeks, consecutiveMissed, perExercise, totalPreventionSessions };
  }, [workouts]);

  const maxPerEx = Math.max(1, ...Object.values(perExercise));
  const allTimeWeeksWithPrevention = [...weekGrid.values()].filter(s => s.size > 0).length;

  return (
    <div className="space-y-6 pt-4 pb-24">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck size={20} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display text-xl font-black uppercase tracking-tight">Prevenção & Mobilidade</h1>
          <p className="text-xs text-gray-500">Aderência ao circuito de prevenção</p>
        </div>
      </div>

      {/* ── Alert banner ────────────────────────────────────────────────────── */}
      {consecutiveMissed >= 2 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-400">
              {consecutiveMissed} semana{consecutiveMissed > 1 ? 's' : ''} sem prevenção
            </p>
            <p className="text-xs text-red-400/70 mt-0.5 leading-snug">
              Risco de lesão elevado. Inclua o circuito de prevenção na próxima sessão.
            </p>
          </div>
        </div>
      )}
      {consecutiveMissed === 0 && totalPreventionSessions > 0 && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm font-black text-emerald-400">Em dia com a prevenção esta semana!</p>
        </div>
      )}

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="font-mono font-black text-2xl text-brand">{allTimeWeeksWithPrevention}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">Semanas totais</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono font-black text-2xl text-emerald-400">{consecutiveMissed === 0 ? '✓' : consecutiveMissed}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">{consecutiveMissed === 0 ? 'Em dia' : 'Sem. perdidas'}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-mono font-black text-2xl" style={{ color: '#CCFF00' }}>
            {orderedWeeks.filter(k => (weekGrid.get(k)?.size ?? 0) > 0).length}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">Últ. 8 semanas</p>
        </div>
      </div>

      {/* ── 8-week adherence grid ────────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-outline">
          <CalendarDays size={14} className="text-gray-500" />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Aderência — últimas 8 semanas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px]">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 w-20">Semana</th>
                {PREVENTION_EXERCISES.map(ex => (
                  <th key={ex.id} className="px-2 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600 text-center leading-tight">
                    {ex.label.split(' ').slice(0, 2).join('\n')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedWeeks.map((wk, i) => {
                const done = weekGrid.get(wk);
                const isCurrentWeek = i === orderedWeeks.length - 1;
                return (
                  <tr
                    key={wk}
                    className={`border-b border-outline/50 ${isCurrentWeek ? 'bg-brand/5' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-400">
                      {weekLabel(wk)}
                      {isCurrentWeek && (
                        <span className="ml-1 text-[9px] font-black text-brand uppercase tracking-wider">atual</span>
                      )}
                    </td>
                    {PREVENTION_EXERCISES.map(ex => {
                      const wasDone = done?.has(ex.id) ?? false;
                      return (
                        <td key={ex.id} className="px-2 py-2.5 text-center">
                          {wasDone ? (
                            <CheckCircle size={16} className="mx-auto" style={{ color: ex.color }} />
                          ) : (
                            <XCircle size={16} className="mx-auto text-gray-700" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Per-exercise adherence bars ──────────────────────────────────────── */}
      <section className="card p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline pb-3">
          <Flame size={14} className="text-gray-500" />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Frequência por exercício (total)</h2>
        </div>
        {PREVENTION_EXERCISES.map(ex => {
          const count = perExercise[ex.id] ?? 0;
          const pct = Math.round((count / maxPerEx) * 100);
          return (
            <div key={ex.id} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-300">{ex.label}</span>
                <span className="text-xs font-mono font-black" style={{ color: ex.color }}>
                  {count} {count === 1 ? 'vez' : 'vezes'}
                </span>
              </div>
              <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: ex.color, boxShadow: pct > 0 ? `0 0 8px ${ex.color}60` : 'none' }}
                />
              </div>
            </div>
          );
        })}
        {Object.keys(perExercise).length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            Nenhum exercício de prevenção registrado ainda. Execute treinos com{' '}
            <span className="text-brand font-mono">custom_ponte01</span>,{' '}
            <span className="text-brand font-mono">custom_nordic01</span>, etc.
          </p>
        )}
      </section>

      {/* ── What counts section ─────────────────────────────────────────────── */}
      <section className="p-4 bg-surface-hover rounded-xl border border-outline space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Exercícios monitorados</h4>
        <div className="grid grid-cols-2 gap-2">
          {PREVENTION_EXERCISES.map(ex => (
            <div key={ex.id} className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ex.color }} />
              {ex.label}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 leading-relaxed pt-1">
          Uma semana é marcada como realizada quando qualquer um desses exercícios aparece num treino registrado.
        </p>
      </section>
    </div>
  );
}
