import React, { useState } from 'react';
import { Dumbbell, TrendingUp, Calendar, Trophy, Play, Ruler, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Screen } from '../../App';
import {
  format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays,
  eachDayOfInterval, getDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useMeasurements } from '../../hooks/useMeasurements';
import { usePlanos } from '../../hooks/usePlanos';

// Portuguese weekday name ? JS getDay() index (0=Sun)
const DIA_SEMANA_MAP: Record<string, number> = {
  'domingo': 0, 'segunda': 1, 'segunda-feira': 1, 'terca': 2, 'terça': 2,
  'terca-feira': 2, 'terça-feira': 2, 'quarta': 3, 'quarta-feira': 3,
  'quinta': 4, 'quinta-feira': 4, 'sexta': 5, 'sexta-feira': 5,
  'sabado': 6, 'sábado': 6,
};

function normalizeDia(dia: string): number | null {
  const key = dia.toLowerCase().trim();
  return DIA_SEMANA_MAP[key] ?? null;
}

// --- WorkoutCalendar ---------------------------------------------------------

import type { WorkoutSession } from '../../types';
import type { Plano } from '../../types';

interface CalendarProps {
  workouts: WorkoutSession[];
  planos: Plano[];
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// Build set of weekday indices that have a plano
function plannedWeekdays(planos: Plano[]): Set<number> {
  const s = new Set<number>();
  planos.forEach(p => {
    const idx = normalizeDia(p.diaDaSemana ?? '');
    if (idx !== null) s.add(idx);
  });
  return s;
}

function toDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (raw && typeof (raw as any).toDate === 'function') return (raw as any).toDate();
  return new Date(raw as string);
}

// Build set of ISO date strings (YYYY-MM-DD) for realised workouts
function realisedDates(workouts: WorkoutSession[]): Set<string> {
  const s = new Set<string>();
  workouts.forEach(w => {
    const raw = w.data;
    if (!raw) return;
    const d = toDate(raw);
    s.add(format(d, 'yyyy-MM-dd'));
  });
  return s;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function WorkoutCalendar({ workouts, planos, month, onPrevMonth, onNextMonth }: CalendarProps) {
  const planned = plannedWeekdays(planos);
  const realised = realisedDates(workouts);

  const mStart = startOfMonth(month);
  const mEnd = endOfMonth(month);

  // Grid starts on Sunday of the week that contains mStart
  const gridStart = startOfWeek(mStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <section className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-brand" />
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
            Planejado vs. Realizado
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrevMonth} className="p-2.5 text-gray-500 hover:text-white transition-colors rounded">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-wider text-white w-24 text-center">
            {format(month, 'MMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={onNextMonth} className="p-2.5 text-gray-500 hover:text-white transition-colors rounded">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-600 py-1">
            {l}
          </div>
        ))}

        {/* Day cells */}
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, month);
          const isPast = iso <= today;
          const isToday = iso === today;
          const isPlanned = planned.has(getDay(day));
          const isRealised = realised.has(iso);

          let cellClass = 'text-gray-700';
          let dotColor = '';

          if (!inMonth) {
            cellClass = 'opacity-20 text-gray-700';
          } else if (isRealised && isPlanned) {
            // Both planned and done: filled brand
            cellClass = 'bg-brand text-black font-black rounded-full';
          } else if (isRealised && !isPlanned) {
            // Unplanned workout done
            cellClass = 'bg-gray-600 text-white font-bold rounded-full';
          } else if (isPlanned && !isRealised && isPast && !isToday) {
            // Planned but missed (past day)
            cellClass = 'border border-dashed border-red-500/50 text-red-400 rounded-full';
          } else if (isPlanned && !isRealised) {
            // Planned, future or today – not yet done
            cellClass = 'border border-brand/40 text-brand/70 rounded-full';
          } else if (isToday) {
            cellClass = 'border border-gray-500 text-white rounded-full';
          }

          return (
            <div key={iso} className="flex flex-col items-center">
              <div className={`w-7 h-7 flex items-center justify-center text-[11px] transition-colors ${cellClass}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-outline">
        <LegendItem color="bg-brand" label="Planejado e realizado" />
        <LegendItem color="bg-gray-600" label="Não planejado" />
        <LegendItem border="border-brand/40" label="Planejado (pendente)" />
        <LegendItem border="border-red-500/50 border-dashed" label="Faltou" textColor="text-red-400" />
      </div>
    </section>
  );
}

function LegendItem({ color, border, label, textColor = 'text-gray-500' }: {
  color?: string; border?: string; label: string; textColor?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${color ?? ''} ${border ? `border ${border}` : ''}`} />
      <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>{label}</span>
    </div>
  );
}

// --- Dashboard ---------------------------------------------------------------

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const { data: measurements = [] } = useMeasurements();
  const { data: planos = [] } = usePlanos();

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now);

  // Measurements reminder: show if no record in last 7 days
  const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const daysSinceLastMeasurement = lastMeasurement
    ? differenceInDays(now, new Date(lastMeasurement.data + 'T12:00:00'))
    : null;
  const showMeasurementReminder = daysSinceLastMeasurement === null || daysSinceLastMeasurement >= 7;
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const workoutsThisMonth = workouts.filter(w => {
    const date = toDate(w.data);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  }).length;

  const maxWeight = Math.max(
    0,
    ...workouts.flatMap(w => (w.exerciciosSummary ?? []).map(s => s.pesoMax ?? 0))
  );

  const recentWorkouts = [...workouts]
    .sort((a, b) => {
      const da = toDate(a.data);
      const db = toDate(b.data);
      return db.getTime() - da.getTime();
    })
    .slice(0, 3);

  return (
    <div className="space-y-6 pt-4 pb-24">
      {loading ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="card p-4 h-[88px] animate-pulse motion-reduce:animate-none" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-surface border border-outline rounded-lg p-3 h-20 animate-pulse motion-reduce:animate-none" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-11 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="card p-4 h-64 animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          {/* Stats – primary metric up top, 3 supporting below */}
          <div className="space-y-3">
            <div className="card p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={12} className="text-brand" />
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-black">Treinos no Mês</span>
                </div>
                <p className="font-mono text-4xl font-black text-brand leading-none">{workoutsThisMonth}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 stagger-items">
              <div className="bg-surface border border-outline rounded-lg p-4">
                <Dumbbell size={12} className="text-gray-600 mb-2" />
                <p className="font-mono text-xl font-black leading-none mb-0.5">{workouts.length}</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">Total</p>
              </div>
              <div className="bg-surface border border-outline rounded-lg p-4">
                <TrendingUp size={12} className="text-gray-600 mb-2" />
                <p className="font-mono text-xl font-black leading-none mb-0.5">
                  {new Set(workouts.flatMap(w => (w.exerciciosSummary ?? []).map(s => s.exercicioId))).size}
                </p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">Exerc.</p>
              </div>
              <div className="bg-surface border border-outline rounded-lg p-4">
                <Trophy size={12} className="text-gray-600 mb-2" />
                <p className="font-mono text-xl font-black leading-none mb-0.5">
                  {maxWeight > 0 ? `${maxWeight}` : '–'}
                </p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                  {maxWeight > 0 ? 'kg máx' : 'kg máx'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => onNavigate('log')} className="btn-primary w-full justify-center">
              <Dumbbell size={16} />
              Registrar Treino
            </button>
            <button onClick={() => onNavigate('execute')} className="btn-secondary w-full justify-center">
              <Play size={16} />
              Executar Plano
            </button>
          </div>

          {showMeasurementReminder && (
            <button
              onClick={() => onNavigate('measurements')}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-brand/40 bg-brand/5 hover:bg-brand/10 transition-colors text-left"
            >
              <div className="flex-shrink-0 bg-brand/15 rounded-full p-2">
                <Ruler size={16} className="text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-brand">Registrar Medidas Corporais</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysSinceLastMeasurement === null
                    ? 'Nenhum registro ainda: comece agora!'
                    : `Último registro há ${daysSinceLastMeasurement} dias`}
                </p>
              </div>
              <AlertCircle size={14} className="text-brand/60 flex-shrink-0 ml-auto" />
            </button>
          )}

          {/* ===== WORKOUT CALENDAR ===== */}
          <WorkoutCalendar
            workouts={workouts}
            planos={planos}
            month={calendarMonth}
            onPrevMonth={() => setCalendarMonth(m => subMonths(m, 1))}
            onNextMonth={() => setCalendarMonth(m => addMonths(m, 1))}
          />

          {recentWorkouts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Treinos Recentes</h3>
              <div className="stagger-items space-y-3">
              {recentWorkouts.map(w => {
                const date = toDate(w.data);
                return (
                  <div key={w.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{w.nomeTreino ?? 'Treino'}</p>
                      <p className="text-xs text-gray-500">
                        {format(date, "dd 'de' MMM", { locale: ptBR })}
                        {w.exerciciosSummary && ` – ${w.exerciciosSummary.length} exercícios`}
                      </p>
                    </div>
                    {w.objetivo && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 bg-surface-hover px-2 py-1 rounded">
                        {w.objetivo}
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {workouts.length === 0 && (
            <div className="card p-8 text-center text-gray-500 space-y-3">
              <Dumbbell size={32} className="mx-auto text-gray-700" />
              <div>
                <p className="text-sm font-bold text-gray-300">Sem histórico ainda.</p>
                <p className="text-xs text-gray-600 mt-1">O primeiro registro inicia a curva.</p>
              </div>
              <button onClick={() => onNavigate('log')} className="btn-primary mx-auto">
                Registrar Primeiro Treino
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}