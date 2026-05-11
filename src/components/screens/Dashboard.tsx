import React, { useState } from 'react';
import { Dumbbell, TrendingUp, Calendar, Trophy, Play, Ruler, AlertCircle, ChevronLeft, ChevronRight, Target, Zap, User, Timer } from 'lucide-react';
import type { Screen } from '../../App';
import {
  format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays,
  eachDayOfInterval, getDay, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths,
} from 'date-fns';
import { differenceInWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useMeasurements } from '../../hooks/useMeasurements';
import { useTAFScores } from '../../hooks/useTAF';
import { useProfile } from '../../hooks/useProfile';
import { TAF_METAS_MUITO_BOM } from '../../constants';
import type { TAFScore } from '../../types';

// --- WorkoutCalendar ---------------------------------------------------------

import type { WorkoutSession } from '../../types';

interface CalendarProps {
  workouts: WorkoutSession[];
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
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

function WorkoutCalendar({ workouts, month, onPrevMonth, onNextMonth }: CalendarProps) {
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
            Histórico de Treinos
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
          const isToday = iso === today;
          const isRealised = realised.has(iso);

          let cellClass = 'text-gray-700';

          if (!inMonth) {
            cellClass = 'opacity-20 text-gray-700';
          } else if (isRealised) {
            cellClass = 'bg-brand text-black font-black rounded-full';
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
        <LegendItem color="bg-brand" label="Treino realizado" />
        <LegendItem border="border-gray-500" label="Hoje" />
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

// --- TAFProgressWidget -------------------------------------------------------

const CONCEITO_COLOR: Record<string, string> = {
  Excelente:    '#CCFF00',
  'Muito Bom':  '#34D399',
  Bom:          '#60A5FA',
  Regular:      '#F59E0B',
  Insuficiente: '#EF4444',
};

const DISCIPLINAS = [
  { key: 'barraFixa'       as const, label: 'Barra Fixa',  unit: 'reps', icon: User,  meta: TAF_METAS_MUITO_BOM.barraFixa,        pts: (s: TAFScore) => s.ptsBarra },
  { key: 'remadorAbdominal'as const, label: 'Abdominal',   unit: 'reps', icon: Zap,   meta: TAF_METAS_MUITO_BOM.remadorAbdominal, pts: (s: TAFScore) => s.ptsAbdominal },
  { key: 'corrida12min'    as const, label: 'Corrida 12min', unit: 'm', icon: Timer, meta: TAF_METAS_MUITO_BOM.corrida12min,    pts: (s: TAFScore) => s.ptsCorreida },
];

interface TAFProgressWidgetProps {
  scores: TAFScore[];
  onNavigate: (screen: Screen) => void;
}

function TAFProgressWidget({ scores, onNavigate }: TAFProgressWidgetProps) {
  if (scores.length === 0) {
    return (
      <button
        onClick={() => onNavigate('taf')}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left"
      >
        <div className="flex-shrink-0 bg-emerald-500/15 rounded-full p-2">
          <Target size={16} className="text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Registrar Primeiro Simulado TAF</p>
          <p className="text-xs text-gray-500 mt-0.5">Compare seu resultado com as metas do Muito Bom</p>
        </div>
      </button>
    );
  }

  const sorted = [...scores].sort((a, b) => a.data.localeCompare(b.data));
  const latest = sorted[sorted.length - 1];
  const conceitoColor = CONCEITO_COLOR[latest.conceito] ?? '#6B7280';

  // Projection: requires ≥2 scores with different dates
  let projectionLabel: string | null = null;
  if (sorted.length >= 2) {
    const first = sorted[0];
    const weeksDiff = differenceInWeeks(new Date(latest.data + 'T12:00:00'), new Date(first.data + 'T12:00:00'));
    const notaGain = latest.notaFinal - first.notaFinal;
    if (weeksDiff > 0 && notaGain > 0 && latest.notaFinal < 8.5) {
      const ratePerWeek = notaGain / weeksDiff;
      const weeksToGoal = Math.ceil((8.5 - latest.notaFinal) / ratePerWeek);
      projectionLabel = `No ritmo atual → meta em ~${weeksToGoal} semana${weeksToGoal !== 1 ? 's' : ''}`;
    } else if (latest.notaFinal >= 8.5) {
      projectionLabel = 'Meta Muito Bom atingida!';
    } else if (notaGain <= 0 && weeksDiff > 0) {
      projectionLabel = 'Evolução estável — continue treinando';
    }
  }

  return (
    <section className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: conceitoColor }} />
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Progresso TAF</h3>
        </div>
        <button
          onClick={() => onNavigate('taf')}
          className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-300 transition-colors"
        >
          Ver Todos →
        </button>
      </div>

      {/* Nota final */}
      <div className="flex items-end gap-3">
        <div>
          <p
            className="font-mono font-black text-5xl leading-none tabular-nums"
            style={{ color: conceitoColor, textShadow: `0 0 20px ${conceitoColor}50` }}
          >
            {latest.notaFinal.toFixed(1)}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: conceitoColor }}>
            {latest.conceito}
          </p>
        </div>
        <div className="flex-1 min-w-0 pb-0.5 space-y-0.5">
          <p className="text-[10px] text-gray-600 font-bold">
            Último simulado: {format(new Date(latest.data + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}
          </p>
          {/* Mini nota timeline if >1 score */}
          {sorted.length > 1 && (
            <div className="flex items-center gap-1">
              {sorted.slice(-6).map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-5 rounded-sm"
                    style={{
                      height: `${Math.max(4, Math.round((s.notaFinal / 10) * 28))}px`,
                      background: CONCEITO_COLOR[s.conceito] ?? '#444',
                      opacity: i === sorted.slice(-6).length - 1 ? 1 : 0.45,
                    }}
                  />
                </div>
              ))}
              <span className="text-[8px] text-gray-600 font-bold ml-0.5">←evolução</span>
            </div>
          )}
          {/* Meta Muito Bom reference */}
          <p className="text-[9px] text-gray-600">
            Meta Muito Bom: <span className="font-bold text-emerald-400">8.5</span>
          </p>
        </div>
      </div>

      {/* Per-discipline progress bars */}
      <div className="space-y-2.5">
        {DISCIPLINAS.map(({ key, label, unit, icon: Icon, meta, pts }) => {
          const valor = latest[key];
          const progress = Math.min(1, valor / meta);
          const atingiu = valor >= meta;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <Icon size={9} />
                  {label}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className={atingiu ? 'text-emerald-400 font-black' : 'text-gray-300'}>
                    {unit === 'm' ? `${valor}m` : `${valor} ${unit}`}
                  </span>
                  <span className="text-gray-700">/</span>
                  <span className="text-gray-600">{unit === 'm' ? `${meta}m` : `${meta} ${unit}`}</span>
                  <span
                    className="text-[9px] font-black px-1 py-0.5 rounded"
                    style={{
                      color: atingiu ? '#34D399' : '#F59E0B',
                      background: atingiu ? '#34D39915' : '#F59E0B15',
                    }}
                  >
                    {pts(latest).toFixed(1)}pts
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: atingiu ? '#34D399' : '#F59E0B',
                    boxShadow: atingiu ? '0 0 6px #34D39960' : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Projection */}
      {projectionLabel && (
        <p
          className="text-[10px] font-bold uppercase tracking-widest border-t border-outline pt-3"
          style={{ color: latest.notaFinal >= 8.5 ? '#34D399' : '#F59E0B' }}
        >
          {projectionLabel}
        </p>
      )}
    </section>
  );
}

// --- Dashboard ---------------------------------------------------------------

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: workouts = [], isLoading: loading } = useWorkouts();
  const { data: measurements = [] } = useMeasurements();
  const { data: tafScores = [] } = useTAFScores();
  const { data: profile } = useProfile();
  const isTAFUser = profile?.objetivo === 'taf' || tafScores.length > 0;

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

          {/* ===== TAF PROGRESS WIDGET ===== */}
          {isTAFUser && (
            <TAFProgressWidget
              scores={tafScores}
              onNavigate={onNavigate}
            />
          )}

          {/* ===== WORKOUT CALENDAR ===== */}
          <WorkoutCalendar
            workouts={workouts}
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