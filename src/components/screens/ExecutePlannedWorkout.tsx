import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, CheckCircle, Trophy, ChevronDown, ChevronUp, Dumbbell, Timer, Zap, Heart, User, Flame, SkipForward, Plus, Clock } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import type { Plano, WorkoutSeries, ModalidadeExercicio } from '../../types';
import { getModalidade, buildExercicioSummary, formatarTempo, calcularPace, formatarDistancia } from '../../lib/exercicioUtils';

// ─── Modalidade visual themes ─────────────────────────────────────────────────

const MODALIDADE_THEME: Record<ModalidadeExercicio, {
  icon: React.ElementType;
  accentHex: string;
  label: string;
  borderActive: string;
  bgActive: string;
}> = {
  forca_dinamica: { icon: Dumbbell, accentHex: '#F59E0B', label: 'FORÇA',   borderActive: 'border-amber-500/40',   bgActive: 'bg-amber-500/5'   },
  peso_corporal:  { icon: User,     accentHex: '#34D399', label: 'CORPO',   borderActive: 'border-emerald-500/40', bgActive: 'bg-emerald-500/5' },
  corrida:        { icon: Zap,      accentHex: '#60A5FA', label: 'CORRIDA', borderActive: 'border-blue-500/40',    bgActive: 'bg-blue-500/5'    },
  isometria:      { icon: Timer,    accentHex: '#A78BFA', label: 'ISO',     borderActive: 'border-violet-500/40',  bgActive: 'bg-violet-500/5'  },
  cardio_livre:   { icon: Heart,    accentHex: '#F87171', label: 'CARDIO',  borderActive: 'border-red-500/40',     bgActive: 'bg-red-500/5'     },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SerieRecord {
  seriesId: string;
  serieNum: number;
  pesoReal: number;
  repeticoesReais: number;
  tempoSegundos: number;
  distanciaMetros: number;
  falhou: boolean;
  duracaoSegundos?: number;
}

interface InputState {
  pesoReal: string;
  repeticoesReais: string;
  tempoSegundos: string;
  distanciaMetros: string;
  falhou: boolean;
}

interface ExecutePlannedWorkoutProps {
  onBack: () => void;
}

export default function ExecutePlannedWorkout({ onBack }: ExecutePlannedWorkoutProps) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [selectedDia, setSelectedDia] = useState<string | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null);
  const [executing, setExecuting] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [completedSeries, setCompletedSeries] = useState<Record<number, SerieRecord[]>>({});
  const [currentInputs, setCurrentInputs] = useState<Record<number, InputState>>({});
  const [activeExIdx, setActiveExIdx] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [defaultRestTime] = useState(() => {
    const parsed = parseInt(localStorage.getItem('forge_rest_time') || '90', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTimerRef = useRef<number>(0);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  // ─── Rest timer inline state ──────────────────────────────────────────────
  const [restingCardIdx, setRestingCardIdx] = useState<number | null>(null);
  const [restMinimized, setRestMinimized] = useState(false);

  // ─── Exercise duration tracking ───────────────────────────────────────────
  const [exerciseStartedAt, setExerciseStartedAt] = useState<Record<number, number | null>>({});
  const [exerciseElapsed, setExerciseElapsed] = useState<Record<number, number>>({});
  const elapsedIntervalRef = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // ─── Gamification ─────────────────────────────────────────────────────────
  const [lastCompletedPip, setLastCompletedPip] = useState<Record<number, number>>({});
  const [workoutStartTime] = useState(() => Date.now());

  useEffect(() => { loadPlanos(); }, []);

  useEffect(() => {
    return () => {
      Object.values(elapsedIntervalRef.current).forEach(clearInterval);
    };
  }, []);

  function startElapsedTimer(exIdx: number) {
    if (elapsedIntervalRef.current[exIdx]) clearInterval(elapsedIntervalRef.current[exIdx]);
    const startTs = Date.now();
    setExerciseStartedAt(prev => ({ ...prev, [exIdx]: startTs }));
    setExerciseElapsed(prev => ({ ...prev, [exIdx]: 0 }));
    elapsedIntervalRef.current[exIdx] = setInterval(() => {
      setExerciseElapsed(prev => ({ ...prev, [exIdx]: Math.floor((Date.now() - startTs) / 1000) }));
    }, 1000);
  }

  function stopElapsedTimer(exIdx: number) {
    if (elapsedIntervalRef.current[exIdx]) {
      clearInterval(elapsedIntervalRef.current[exIdx]);
      delete elapsedIntervalRef.current[exIdx];
    }
    setExerciseStartedAt(prev => ({ ...prev, [exIdx]: null }));
    setExerciseElapsed(prev => ({ ...prev, [exIdx]: 0 }));
  }

  async function loadPlanos() {
    setLoading(true);
    try {
      const [data, active] = await Promise.all([
        workoutService.getPlanos(),
        workoutService.getActiveWorkout()
      ]);
      setPlanos(data);
      if (active && active.planoId) {
        const matchPlano = data.find(p => p.id === active.planoId);
        if (matchPlano) {
          const existingSeries = await workoutService.getSeriesForWorkout(active.id!);
          setWorkoutId(active.id!);
          setSelectedPlano(matchPlano);
          const rebuilt: Record<number, SerieRecord[]> = {};
          const inputs: Record<number, InputState> = {};
          matchPlano.exercicios.forEach((ex, idx) => {
            const seriesForEx = existingSeries.filter((s: WorkoutSeries) => s.exercicioId === ex.exercicioId);
            if (seriesForEx.length > 0) {
              rebuilt[idx] = seriesForEx.map((s: WorkoutSeries) => ({
                seriesId: s.id!,
                serieNum: s.serieNum,
                pesoReal: s.pesoReal ?? 0,
                repeticoesReais: s.repeticoesReais ?? 0,
                tempoSegundos: s.tempoSegundos ?? 0,
                distanciaMetros: s.distanciaMetros ?? 0,
                falhou: s.falhou ?? false,
              }));
            }
            const lastDone = rebuilt[idx]?.[rebuilt[idx].length - 1];
            inputs[idx] = {
              pesoReal: String(lastDone?.pesoReal ?? ex.pesoPlanejado ?? ''),
              repeticoesReais: String(lastDone?.repeticoesReais ?? ex.repeticoesPlanejadas ?? ''),
              tempoSegundos: String(lastDone?.tempoSegundos ?? ex.tempoPlanejadoSegundos ?? ''),
              distanciaMetros: String(lastDone?.distanciaMetros ?? ex.distanciaPlanejadaMetros ?? ''),
              falhou: false,
            };
          });
          setCompletedSeries(rebuilt);
          setCurrentInputs(inputs);
          setExecuting(true);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) { setTimerActive(false); clearInterval(timerRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    } else if (!timerActive && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  useEffect(() => {
    if (timerSeconds === 10 && prevTimerRef.current > 10 && timerActive) {
      if ('vibrate' in navigator) navigator.vibrate(100);
    }
    if (timerSeconds === 0 && prevTimerRef.current > 0) {
      localStorage.removeItem('forge_rest_end');
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      const t = setTimeout(() => {
        setRestingCardIdx(null);
        setRestMinimized(false);
      }, 500);
      prevTimerRef.current = 0;
      return () => clearTimeout(t);
    }
    prevTimerRef.current = timerSeconds;
  }, [timerSeconds, timerActive]);

  function startTimer() {
    localStorage.setItem('forge_rest_end', String(Date.now() + defaultRestTime * 1000));
    setTimerSeconds(defaultRestTime);
    setTimerActive(true);
  }

  function stopTimer() {
    localStorage.removeItem('forge_rest_end');
    setTimerActive(false);
    setTimerSeconds(0);
    setRestingCardIdx(null);
    setRestMinimized(false);
  }

  function addRestTime(seconds: number) {
    setTimerSeconds(s => s + seconds);
    const current = localStorage.getItem('forge_rest_end');
    if (current) {
      localStorage.setItem('forge_rest_end', String(parseInt(current, 10) + seconds * 1000));
    }
  }

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      const endTsStr = localStorage.getItem('forge_rest_end');
      if (!endTsStr) return;
      const remaining = Math.max(0, Math.ceil((parseInt(endTsStr, 10) - Date.now()) / 1000));
      setTimerSeconds(remaining);
      if (remaining === 0) {
        localStorage.removeItem('forge_rest_end');
        setTimerActive(false);
        setRestingCardIdx(null);
        setRestMinimized(false);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const semanas = planos.map(p => p.semana).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const diasForSemana = planos
    .filter(p => p.semana === selectedSemana)
    .map(p => p.diaDaSemana)
    .filter((d, i, a) => a.indexOf(d) === i);
  const planoForDia = planos.find(p => p.semana === selectedSemana && p.diaDaSemana === selectedDia);

  async function handleStartWorkout() {
    if (!planoForDia) return;
    setSaving(true);
    try {
      const profile = await workoutService.getUserProfile();
      const id = await workoutService.createActiveWorkout({
        nomeTreino: planoForDia.diaDaSemana,
        semana: planoForDia.semana,
        diaDaSemana: planoForDia.diaDaSemana,
        planoId: planoForDia.id,
        objetivo: profile?.objetivo,
      });
      setWorkoutId(id);
      setSelectedPlano(planoForDia);
      const inputs: Record<number, InputState> = {};
      planoForDia.exercicios.forEach((ex, idx) => {
        inputs[idx] = {
          pesoReal: String(ex.pesoPlanejado ?? ''),
          repeticoesReais: String(ex.repeticoesPlanejadas ?? ''),
          tempoSegundos: String(ex.tempoPlanejadoSegundos ?? ''),
          distanciaMetros: String(ex.distanciaPlanejadaMetros ?? ''),
          falhou: false,
        };
      });
      setCurrentInputs(inputs);
      setCompletedSeries({});
      setExecuting(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleAddSerie(exIdx: number) {
    if (!workoutId || !selectedPlano) return;
    const ex = selectedPlano.exercicios[exIdx];
    const input = currentInputs[exIdx];
    if (!input) return;
    const done = completedSeries[exIdx] ?? [];
    const serieNum = done.length + 1;
    const mod = getModalidade(ex);
    const pesoReal = parseFloat(input.pesoReal) || 0;
    const repeticoesReais = parseInt(input.repeticoesReais) || 0;
    const tempoSegundos = parseInt(input.tempoSegundos) || 0;
    const distanciaMetros = parseInt(input.distanciaMetros) || 0;
    const paceMinKm = distanciaMetros > 0 && tempoSegundos > 0
      ? (tempoSegundos / 60) / (distanciaMetros / 1000)
      : undefined;

    const startedAt = exerciseStartedAt[exIdx];
    const duracaoSegundos = startedAt ? Math.round((Date.now() - startedAt) / 1000) : undefined;

    try {
      const seriesId = await workoutService.addSeries(workoutId, {
        exercicioId: ex.exercicioId,
        exercicioNome: ex.exercicioNome ?? ex.exercicioId,
        grupoMuscular: '',
        modalidade: mod,
        serieNum,
        repeticoesPlanejadas: ex.repeticoesPlanejadas ?? 0,
        pesoPlanejado: ex.pesoPlanejado ?? 0,
        repeticoesReais,
        pesoReal: mod === 'peso_corporal' ? 0 : pesoReal,
        falhou: input.falhou,
        ...(tempoSegundos ? { tempoSegundos } : {}),
        ...(distanciaMetros ? { distanciaMetros } : {}),
        ...(paceMinKm !== undefined ? { paceMinKm } : {}),
        ...(duracaoSegundos !== undefined ? { duracaoSegundos } : {}),
        tempoDescanso: defaultRestTime,
      });
      const newRecord: SerieRecord = {
        seriesId, serieNum, pesoReal, repeticoesReais, tempoSegundos, distanciaMetros,
        falhou: input.falhou, duracaoSegundos,
      };
      setCompletedSeries(prev => ({ ...prev, [exIdx]: [...(prev[exIdx] ?? []), newRecord] }));
      setCurrentInputs(prev => ({ ...prev, [exIdx]: { ...prev[exIdx], falhou: false } }));

      // Gamification: animate newly completed pip
      setLastCompletedPip(prev => ({ ...prev, [exIdx]: serieNum - 1 }));

      if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);

      stopElapsedTimer(exIdx);
      setActiveExIdx(exIdx);
      setRestingCardIdx(exIdx);
      setRestMinimized(false);
      startTimer();
    } catch (e) { console.error(e); }
  }

  async function handleFinalize() {
    if (!workoutId || !selectedPlano) return;
    setSaving(true);
    try {
      const summary = selectedPlano.exercicios.map((ex, idx) => {
        const series = completedSeries[idx] ?? [];
        return buildExercicioSummary(
          {
            exercicioId: ex.exercicioId,
            exercicioNome: ex.exercicioNome ?? ex.exercicioId,
            grupoMuscular: '',
            modalidade: getModalidade(ex),
          },
          series.map(s => ({
            peso: s.pesoReal,
            reps: s.repeticoesReais,
            tempoSegundos: s.tempoSegundos,
            distanciaMetros: s.distanciaMetros,
          }))
        );
      });
      await workoutService.finalizeWorkout(workoutId, summary);
      stopTimer();
      setFinished(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  // ─── Derived: streak + volume ─────────────────────────────────────────────
  const allSeriesFlat = Object.values(completedSeries).flat();
  let streak = 0;
  for (let i = allSeriesFlat.length - 1; i >= 0; i--) {
    if (!allSeriesFlat[i].falhou) streak++;
    else break;
  }
  const totalVolume = allSeriesFlat.reduce((sum, s) => sum + (s.pesoReal > 0 ? s.pesoReal * s.repeticoesReais : 0), 0);
  const totalDuration = Math.round((Date.now() - workoutStartTime) / 60000);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          <div className="space-y-1">
            <div className="h-3 w-20 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
            <div className="h-6 w-36 rounded bg-surface-hover animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded-lg bg-surface-hover animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="card p-4 h-20 animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  // ─── Finish screen ────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-6 pt-8 pb-12 px-4">
        <div className="w-20 h-20 bg-brand/20 rounded-full flex items-center justify-center forge-pop">
          <Trophy size={40} className="text-brand" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-3xl font-black uppercase tracking-tight">Treino Finalizado!</h2>
          <p className="text-gray-500 text-sm mt-1">O progresso é permanente.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          <div className="bg-surface border border-outline rounded-xl p-3 text-center">
            <p className="font-mono font-black text-xl text-brand">{allSeriesFlat.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">Séries</p>
          </div>
          {totalVolume > 0 && (
            <div className="bg-surface border border-outline rounded-xl p-3 text-center">
              <p className="font-mono font-black text-xl text-brand">
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">Volume</p>
            </div>
          )}
          <div className="bg-surface border border-outline rounded-xl p-3 text-center">
            <p className="font-mono font-black text-xl text-brand">{totalDuration}min</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mt-0.5">Tempo</p>
          </div>
        </div>
        <button onClick={onBack} className="btn-primary w-full max-w-xs">Voltar ao Início</button>
      </div>
    );
  }

  // ─── Plan selection screen ────────────────────────────────────────────────
  if (!executing) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        {planos.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            <p className="text-sm">Nenhum plano encontrado. Importe um plano primeiro.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="input-label">Semana</label>
              <div className="flex flex-wrap gap-2">
                {semanas.map(s => (
                  <button key={s} onClick={() => { setSelectedSemana(s); setSelectedDia(null); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${selectedSemana === s ? 'bg-brand text-black border-brand' : 'border-outline text-gray-400 hover:border-brand'}`}>
                    Semana {s}
                  </button>
                ))}
              </div>
            </div>
            {selectedSemana !== null && (
              <div>
                <label className="input-label">Dia</label>
                <div className="flex flex-wrap gap-2">
                  {diasForSemana.map(d => (
                    <button key={d} onClick={() => setSelectedDia(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${selectedDia === d ? 'bg-brand text-black border-brand' : 'border-outline text-gray-400 hover:border-brand'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {planoForDia && (
              <div className="card p-4 space-y-3">
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {planoForDia.diaDaSemana}: {planoForDia.exercicios.length} exercícios
                </h3>
                <ul className="space-y-1.5">
                  {planoForDia.exercicios.map((ex, i) => {
                    const mod = getModalidade(ex);
                    const theme = MODALIDADE_THEME[mod];
                    return (
                      <li key={i} className="text-xs text-gray-400 flex gap-2 items-center">
                        <span className="font-bold w-4 shrink-0" style={{ color: theme.accentHex }}>{i + 1}.</span>
                        <theme.icon size={10} style={{ color: theme.accentHex }} className="shrink-0" />
                        <span className="truncate">{ex.exercicioNome ?? ex.exercicioId}</span>
                        <span className="text-gray-600 shrink-0">{ex.seriesPlanejadas}×{ex.repeticoesPlanejadas}{ex.pesoPlanejado ? ` @ ${ex.pesoPlanejado}kg` : ''}</span>
                      </li>
                    );
                  })}
                </ul>
                <button onClick={handleStartWorkout} disabled={saving} className="btn-primary w-full mt-2">
                  {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Play size={16} />}
                  {saving ? 'Iniciando...' : 'Iniciar Treino'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Execution screen ─────────────────────────────────────────────────────
  const totalPlanned = selectedPlano?.exercicios.reduce((sum, ex) => sum + (ex.seriesPlanejadas ?? 3), 0) ?? 0;
  const totalDone = Object.values(completedSeries).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4 pt-4 pb-24">
      <header className="mb-2 space-y-3">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 -ml-3 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Em Execução</h2>
            <h1 className="font-display text-xl font-black uppercase tracking-tight truncate">{selectedPlano?.diaDaSemana}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak >= 3 && (
              <span className="flex items-center gap-1 text-xs font-black text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2 py-1 rounded-lg">
                <Flame size={12} />
                {streak}
              </span>
            )}
            <span className="font-mono text-xs text-gray-500">{totalDone}/{totalPlanned}</span>
          </div>
        </div>
        <div className="h-0.5 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: totalPlanned > 0 ? `${(totalDone / totalPlanned) * 100}%` : '0%',
              boxShadow: totalDone > 0 ? '0 0 8px #CCFF00' : 'none',
            }}
          />
        </div>
      </header>

      {selectedPlano?.exercicios.map((ex, exIdx) => {
        const done = completedSeries[exIdx] ?? [];
        const planned = ex.seriesPlanejadas ?? 3;
        const isActive = activeExIdx === exIdx;
        const allDone = done.length >= planned;
        const input = currentInputs[exIdx] ?? { pesoReal: '', repeticoesReais: '', tempoSegundos: '', distanciaMetros: '', falhou: false };
        const mod = getModalidade(ex);
        const theme = MODALIDADE_THEME[mod];
        const isResting = restingCardIdx === exIdx;
        const isStarted = !!exerciseStartedAt[exIdx];
        const elapsed = exerciseElapsed[exIdx] ?? 0;
        const isLastEx = exIdx === (selectedPlano.exercicios.length - 1);
        const isLastSerie = done.length + 1 >= planned;

        return (
          <div
            key={exIdx}
            className={`card overflow-hidden transition-all duration-300 ${
              allDone
                ? 'border-brand/50 bg-brand/5'
                : isActive
                  ? `${theme.borderActive} ${theme.bgActive}`
                  : 'border-outline'
            }`}
          >
            {/* ── Card header / accordion ────────────────────────────── */}
            <button
              className="w-full flex items-center justify-between p-4"
              onClick={() => {
                const next = isActive ? null : exIdx;
                setActiveExIdx(next);
              }}
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 shrink-0 transition-colors ${
                    allDone ? 'bg-brand border-brand text-black' : ''
                  }`}
                  style={!allDone ? { borderColor: isActive ? theme.accentHex : '#333', color: isActive ? theme.accentHex : '#6B7280' } : undefined}
                >
                  {allDone ? <CheckCircle size={14} /> : exIdx + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{ex.exercicioNome ?? ex.exercicioId}</p>
                  <p className="text-xs text-gray-500 mb-1">
                    {ex.seriesPlanejadas}×{ex.repeticoesPlanejadas}
                    {ex.pesoPlanejado ? ` @ ${ex.pesoPlanejado}kg` : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <SeriesPips
                      done={done.length}
                      planned={planned}
                      lastAnimated={lastCompletedPip[exIdx]}
                      accentHex={theme.accentHex}
                      allDone={allDone}
                    />
                    {isStarted && !isResting && !allDone && (
                      <span className="font-mono text-[10px] tabular-nums flex items-center gap-0.5" style={{ color: theme.accentHex }}>
                        <Clock size={9} />
                        {formatarTempo(elapsed)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span
                  className="hidden sm:flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                  style={{ color: theme.accentHex, borderColor: `${theme.accentHex}33` }}
                >
                  <theme.icon size={9} />
                  {theme.label}
                </span>
                <span className="sm:hidden" style={{ color: theme.accentHex }}>
                  <theme.icon size={13} />
                </span>
                {isActive ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            {isActive && (
              <div className="border-t border-outline">
                {/* ── Inline rest timer ──────────────────────────────── */}
                {isResting ? (
                  <InlineRestTimer
                    timerSeconds={timerSeconds}
                    defaultRestTime={defaultRestTime}
                    exerciseName={ex.exercicioNome ?? ex.exercicioId}
                    nextSerieNum={done.length + 1}
                    totalSeries={planned}
                    isExerciseComplete={allDone}
                    isLastExercise={isLastEx}
                    isLastSerie={isLastSerie && !allDone}
                    onSkip={stopTimer}
                    onAddTime={() => addRestTime(30)}
                  />
                ) : (
                  <div className="px-4 pb-4 space-y-3">
                    {done.length > 0 && (
                      <div className="pt-3">
                        <p className="text-[11px] uppercase tracking-widest text-gray-600 font-black mb-2">Séries Concluídas</p>
                        <ExercicioSeriesTable done={done} modalidade={mod} />
                      </div>
                    )}
                    {!allDone && (
                      <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-widest text-gray-600 font-black">
                            Série {done.length + 1}
                            {planned > 1 && <span className="text-gray-700"> / {planned}</span>}
                          </p>
                        </div>

                        {/* ── Iniciar série button ──────────────────── */}
                        {!isStarted ? (
                          <button
                            onClick={() => startElapsedTimer(exIdx)}
                            className="w-full rounded-xl border-2 py-3.5 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            style={{
                              borderColor: theme.accentHex,
                              color: theme.accentHex,
                              background: `${theme.accentHex}12`,
                            }}
                          >
                            <Play size={15} />
                            Iniciar Série {done.length + 1}
                          </button>
                        ) : (
                          <>
                            <SerieInputs
                              modalidade={mod}
                              input={input}
                              onChange={(field, value) => setCurrentInputs(prev => ({
                                ...prev,
                                [exIdx]: { ...prev[exIdx], [field]: value }
                              }))}
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 accent-red-500" checked={input.falhou}
                                onChange={e => setCurrentInputs(prev => ({ ...prev, [exIdx]: { ...prev[exIdx], falhou: e.target.checked } }))} />
                              <span className="text-xs text-gray-400">Falhou a série</span>
                            </label>
                            <button onClick={() => handleAddSerie(exIdx)} className="btn-primary w-full">
                              <CheckCircle size={16} />
                              Concluir Série {done.length + 1}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {allDone && (
                      <div className="pt-2 pb-2 flex items-center gap-2 text-brand text-sm font-bold">
                        <CheckCircle size={16} />Exercício completo!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={handleFinalize} disabled={saving} className="btn-primary w-full mt-4">
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin motion-reduce:animate-none" /> : <Trophy size={16} />}
        {saving ? 'Salvando...' : 'Finalizar Treino'}
      </button>

      {/* RestMiniBar — only when resting but card is not active/expanded */}
      {restingCardIdx !== null && timerActive && activeExIdx !== restingCardIdx && selectedPlano && (
        <RestMiniBar
          timerSeconds={timerSeconds}
          defaultRestTime={defaultRestTime}
          exerciseName={
            selectedPlano.exercicios[restingCardIdx]?.exercicioNome ??
            selectedPlano.exercicios[restingCardIdx]?.exercicioId ??
            ''
          }
          onExpand={() => setActiveExIdx(restingCardIdx)}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SerieInputsProps {
  modalidade: ModalidadeExercicio;
  input: InputState;
  onChange: (field: string, value: string) => void;
}

function SerieInputs({ modalidade, input, onChange }: SerieInputsProps) {
  if (modalidade === 'corrida') {
    const dist = parseInt(input.distanciaMetros) || 0;
    const tempo = parseInt(input.tempoSegundos) || 0;
    const pace = dist > 0 && tempo > 0 ? calcularPace(dist, tempo) : null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Distância (m)</label>
            <input type="number" min="0" step="50" inputMode="numeric" className="form-input"
              value={input.distanciaMetros}
              onChange={e => onChange('distanciaMetros', e.target.value)} />
          </div>
          <div>
            <label className="input-label">Tempo (s)</label>
            <input type="number" min="0" inputMode="numeric" className="form-input"
              value={input.tempoSegundos}
              onChange={e => onChange('tempoSegundos', e.target.value)} />
          </div>
        </div>
        {pace && <p className="text-xs font-mono text-brand/80">{formatarDistancia(dist)} · {formatarTempo(tempo)} · {pace}</p>}
      </div>
    );
  }

  if (modalidade === 'isometria') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Tempo (s)</label>
          <input type="number" min="0" inputMode="numeric" className="form-input"
            value={input.tempoSegundos}
            onChange={e => onChange('tempoSegundos', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Reps (opc.)</label>
          <input type="number" min="0" inputMode="numeric" className="form-input"
            value={input.repeticoesReais}
            onChange={e => onChange('repeticoesReais', e.target.value)} />
        </div>
      </div>
    );
  }

  if (modalidade === 'cardio_livre') {
    return (
      <div>
        <label className="input-label">Tempo (s)</label>
        <input type="number" min="0" inputMode="numeric" className="form-input"
          value={input.tempoSegundos}
          onChange={e => onChange('tempoSegundos', e.target.value)} />
      </div>
    );
  }

  if (modalidade === 'peso_corporal') {
    return (
      <div>
        <label className="input-label">Repetições</label>
        <input type="number" min="0" inputMode="numeric" className="form-input"
          value={input.repeticoesReais}
          onChange={e => onChange('repeticoesReais', e.target.value)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="input-label">Repetições</label>
        <input type="number" min="0" inputMode="numeric" className="form-input" value={input.repeticoesReais}
          onChange={e => onChange('repeticoesReais', e.target.value)} />
      </div>
      <div>
        <label className="input-label">Peso (kg)</label>
        <input type="number" min="0" step="0.5" inputMode="decimal" className="form-input" value={input.pesoReal}
          onChange={e => onChange('pesoReal', e.target.value)} />
      </div>
    </div>
  );
}

// ─── SeriesPips ───────────────────────────────────────────────────────────────

interface SeriesPipsProps {
  done: number;
  planned: number;
  lastAnimated?: number;
  accentHex: string;
  allDone: boolean;
}

function SeriesPips({ done, planned, lastAnimated, accentHex, allDone }: SeriesPipsProps) {
  const pipColor = allDone ? '#CCFF00' : accentHex;
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: planned }, (_, i) => {
        const isLit = i < done;
        const isNew = lastAnimated === i;
        return (
          <span
            key={i}
            className={`inline-block rounded-full w-2 h-2 transition-colors duration-300 ${isNew ? 'forge-pop' : ''}`}
            style={
              isLit
                ? { background: pipColor, boxShadow: `0 0 5px ${pipColor}` }
                : { border: '1px solid #444' }
            }
          />
        );
      })}
    </div>
  );
}

// ─── InlineRestTimer ──────────────────────────────────────────────────────────

interface InlineRestTimerProps {
  timerSeconds: number;
  defaultRestTime: number;
  exerciseName: string;
  nextSerieNum: number;
  totalSeries: number;
  isExerciseComplete: boolean;
  isLastExercise: boolean;
  isLastSerie: boolean;
  onSkip: () => void;
  onAddTime: () => void;
}

function InlineRestTimer({
  timerSeconds,
  defaultRestTime,
  exerciseName,
  nextSerieNum,
  totalSeries,
  isExerciseComplete,
  isLastExercise,
  isLastSerie,
  onSkip,
  onAddTime,
}: InlineRestTimerProps) {
  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = defaultRestTime > 0 ? timerSeconds / defaultRestTime : 0;

  const strokeColor =
    progress > 0.6 ? '#CCFF00' :
    progress > 0.3 ? '#F59E0B' :
    '#EF4444';

  const offset = CIRCUMFERENCE * (1 - progress);
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const display = `${m}:${s.toString().padStart(2, '0')}`;

  let contextMsg: string;
  if (isExerciseComplete) {
    contextMsg = isLastExercise ? 'Último exercício concluído' : 'Exercício concluído';
  } else if (isLastSerie) {
    contextMsg = isLastExercise ? 'Última série do treino' : `Última série — S${nextSerieNum}/${totalSeries}`;
  } else {
    contextMsg = `Próxima: S${nextSerieNum}/${totalSeries}`;
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-5">
      <p className="font-mono text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">
        // DESCANSO
      </p>
      <div className="flex items-center gap-5 w-full">
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
            <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="#1A1A1A" strokeWidth="5" />
            <circle
              cx="54" cy="54" r={RADIUS}
              fill="none"
              stroke={strokeColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 54 54)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.6s ease' }}
              className="motion-reduce:transition-none"
            />
          </svg>
          <span
            className="absolute font-mono font-black text-2xl tabular-nums"
            style={{ color: strokeColor, textShadow: `0 0 14px ${strokeColor}80` }}
          >
            {display}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-black" style={{ color: strokeColor }}>
            {contextMsg}
          </p>
          <p className="font-display font-black text-sm uppercase tracking-tight text-gray-200 truncate">
            {exerciseName}
          </p>
        </div>
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onAddTime}
          className="flex-1 rounded-xl border border-outline bg-surface py-3 text-xs font-black uppercase tracking-widest text-gray-400 active:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus size={12} />
          +30s
        </button>
        <button
          onClick={onSkip}
          className="flex-1 rounded-xl border border-outline bg-surface py-3 text-xs font-black uppercase tracking-widest text-gray-300 active:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
        >
          <SkipForward size={12} />
          Pular
        </button>
      </div>
    </div>
  );
}

// ─── RestMiniBar ─────────────────────────────────────────────────────────────

interface RestMiniBarProps {
  timerSeconds: number;
  defaultRestTime: number;
  exerciseName: string;
  onExpand: () => void;
}

function RestMiniBar({ timerSeconds, defaultRestTime, exerciseName, onExpand }: RestMiniBarProps) {
  const progress = defaultRestTime > 0 ? timerSeconds / defaultRestTime : 0;
  const barColor =
    progress > 0.6 ? '#CCFF00' :
    progress > 0.3 ? '#F59E0B' :
    '#EF4444';
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const display = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <button
      onClick={onExpand}
      className="fixed bottom-20 left-4 right-4 z-40 rounded-xl border border-outline bg-surface overflow-hidden text-left active:bg-surface-hover transition-colors"
      aria-label="Expandir timer de descanso"
    >
      <div className="h-0.5 bg-surface-hover">
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%`, background: barColor, boxShadow: `0 0 6px ${barColor}` }}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono font-black text-lg tabular-nums" style={{ color: barColor }}>{display}</span>
          <span className="text-xs text-gray-500 truncate">{exerciseName}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 shrink-0 ml-2">↑ Ver</span>
      </div>
    </button>
  );
}

// ─── ExercicioSeriesTable ─────────────────────────────────────────────────────

interface ExercicioSeriesTableProps {
  done: SerieRecord[];
  modalidade: ModalidadeExercicio;
}

function ExercicioSeriesTable({ done, modalidade }: ExercicioSeriesTableProps) {
  if (modalidade === 'corrida') {
    return (
      <div className="space-y-0.5">
        <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mb-1 px-1">
          <span>#</span><span>Dist.</span><span>Tempo</span><span>Pace</span>
        </div>
        {done.map(s => (
          <div key={s.serieNum} className="grid grid-cols-4 gap-1 text-xs px-1 py-0.5 rounded text-gray-300">
            <span className="font-bold">S{s.serieNum}</span>
            <span>{s.distanciaMetros ? formatarDistancia(s.distanciaMetros) : '–'}</span>
            <span>{s.tempoSegundos ? formatarTempo(s.tempoSegundos) : '–'}</span>
            <span className="text-brand/70">{s.distanciaMetros && s.tempoSegundos ? calcularPace(s.distanciaMetros, s.tempoSegundos) : '–'}</span>
          </div>
        ))}
      </div>
    );
  }

  if (modalidade === 'isometria' || modalidade === 'cardio_livre') {
    return (
      <div className="space-y-0.5">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-1 px-1">
          <span>#</span><span>Tempo</span><span>Reps</span>
        </div>
        {done.map(s => (
          <div key={s.serieNum} className={`grid grid-cols-3 gap-2 text-xs px-1 py-0.5 rounded ${s.falhou ? 'text-red-400' : 'text-gray-300'}`}>
            <span className="font-bold">S{s.serieNum}</span>
            <span>{s.tempoSegundos ? formatarTempo(s.tempoSegundos) : '–'}</span>
            <span>{s.repeticoesReais || '–'}</span>
          </div>
        ))}
      </div>
    );
  }

  if (modalidade === 'peso_corporal') {
    return (
      <div className="space-y-0.5">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-1 px-1">
          <span>#</span><span>Reps</span>
        </div>
        {done.map(s => (
          <div key={s.serieNum} className={`grid grid-cols-2 gap-2 text-xs px-1 py-0.5 rounded ${s.falhou ? 'text-red-400' : 'text-gray-300'}`}>
            <span className="font-bold">S{s.serieNum}{s.falhou ? ' ✗' : ''}</span>
            <span>{s.repeticoesReais}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-1 px-1">
        <span>#</span><span>Reps</span><span>Peso</span>
      </div>
      {done.map(s => (
        <div key={s.serieNum} className={`grid grid-cols-3 gap-2 text-xs px-1 py-0.5 rounded ${s.falhou ? 'text-red-400' : 'text-gray-300'}`}>
          <span className="font-bold">S{s.serieNum}{s.falhou ? ' ✗' : ''}</span>
          <span>{s.repeticoesReais}</span>
          <span>{s.pesoReal}kg</span>
        </div>
      ))}
    </div>
  );
}