import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, CheckCircle, Timer, RotateCcw, Trophy, ChevronDown, ChevronUp, Activity, Dumbbell } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import type { Plano, WorkoutSeries, ModalidadeExercicio } from '../../types';
import { getModalidade, LABEL_MODALIDADE, formatarTempo, calcularPace, formatarDistancia } from '../../lib/exercicioUtils';

interface SerieRecord {
  seriesId: string;
  serieNum: number;
  pesoReal: number;
  repeticoesReais: number;
  tempoSegundos: number;
  distanciaMetros: number;
  falhou: boolean;
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
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => { loadPlanos(); }, []);

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
                falhou: s.falhou ?? false
              }));
            }
            const lastDone = rebuilt[idx]?.[rebuilt[idx].length - 1];
            const mod = getModalidade(ex);
            inputs[idx] = {
              pesoReal: String(lastDone?.pesoReal ?? ex.pesoPlanejado ?? ''),
              repeticoesReais: String(lastDone?.repeticoesReais ?? ex.repeticoesPlanejadas ?? ''),
              tempoSegundos: String(lastDone?.tempoSegundos ?? ex.tempoPlanejadoSegundos ?? ''),
              distanciaMetros: String(lastDone?.distanciaMetros ?? ex.distanciaPlanejadaMetros ?? ''),
              falhou: false
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

  function startTimer() { setTimerSeconds(defaultRestTime); setTimerActive(true); }
  function stopTimer() { setTimerActive(false); setTimerSeconds(0); }
  function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

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
        objetivo: profile?.objetivo
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
          falhou: false
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
        tempoSegundos: tempoSegundos || undefined,
        distanciaMetros: distanciaMetros || undefined,
        paceMinKm,
        tempoDescanso: defaultRestTime,
        objetivo: ''
      });
      const newRecord: SerieRecord = { seriesId, serieNum, pesoReal, repeticoesReais, tempoSegundos, distanciaMetros, falhou: input.falhou };
      setCompletedSeries(prev => ({ ...prev, [exIdx]: [...(prev[exIdx] ?? []), newRecord] }));
      setCurrentInputs(prev => ({ ...prev, [exIdx]: { ...prev[exIdx], falhou: false } }));
      startTimer();
    } catch (e) { console.error(e); }
  }

  async function handleFinalize() {
    if (!workoutId || !selectedPlano) return;
    setSaving(true);
    try {
      const summary = selectedPlano.exercicios.map((ex, idx) => {
        const series = completedSeries[idx] ?? [];
        const mod = getModalidade(ex);
        const isCardio = mod === 'corrida' || mod === 'cardio_livre' || mod === 'isometria';
        const maxEntry = series.reduce((best, s) => s.pesoReal > best.pesoReal ? s : best, series[0] ?? { pesoReal: 0, repeticoesReais: 0 });
        const volumeTotal = isCardio ? 0 : series.reduce((sum, s) => sum + s.pesoReal * s.repeticoesReais, 0);
        const tempoTotal = series.reduce((sum, s) => sum + (s.tempoSegundos ?? 0), 0);
        const distanciaTotal = series.reduce((sum, s) => sum + (s.distanciaMetros ?? 0), 0);
        return {
          exercicioId: ex.exercicioId,
          exercicioNome: ex.exercicioNome ?? ex.exercicioId,
          grupoMuscular: '',
          modalidade: mod,
          seriesRealizadas: series.length,
          repeticoesReais: series.reduce((sum, s) => sum + s.repeticoesReais, 0),
          pesoMax: maxEntry?.pesoReal ?? 0,
          repsAtMax: maxEntry?.repeticoesReais ?? 0,
          volumeTotal,
          tempoTotalSegundos: tempoTotal || undefined,
          distanciaTotalMetros: distanciaTotal || undefined,
        };
      });
      await workoutService.finalizeWorkout(workoutId, summary);
      stopTimer();
      setFinished(true);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

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

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 pt-8">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center forge-pop">
          <Trophy size={32} className="text-brand" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Treino Finalizado!</h2>
          <p className="text-gray-400 text-sm mt-2">Todas as séries registradas. O progresso é permanente.</p>
        </div>
        <button onClick={onBack} className="btn-primary">Voltar ao Início</button>
      </div>
    );
  }

  if (!executing) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <header className="flex items-center gap-4 mb-2">
          <button onClick={onBack} className="p-3 -ml-3 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Execução</h2>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight">Executar Plano</h1>
          </div>
        </header>
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
                <ul className="space-y-1">
                  {planoForDia.exercicios.map((ex, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-brand font-bold w-4">{i + 1}.</span>
                      <span>{ex.exercicioNome ?? ex.exercicioId}</span>
                      <span className="text-gray-600">{ex.seriesPlanejadas}×{ex.repeticoesPlanejadas} @ {ex.pesoPlanejado}kg</span>
                    </li>
                  ))}
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

  return (
    <div className="space-y-4 pt-4 pb-24">
      <header className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-3 -ml-3 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Em Execução</h2>
          <h1 className="font-display text-xl font-black uppercase tracking-tight">{selectedPlano?.diaDaSemana}</h1>
        </div>
        {timerActive && (
          <div className="flex items-center gap-2 bg-brand/20 border border-brand/40 px-3 py-1.5 rounded-lg">
            <Timer size={14} className="text-brand animate-pulse motion-reduce:animate-none" />
            <span className="font-mono font-bold text-brand text-sm">{formatTimer(timerSeconds)}</span>
            <button onClick={stopTimer} className="text-gray-400 hover:text-white ml-1"><RotateCcw size={12} /></button>
          </div>
        )}
      </header>

      {selectedPlano?.exercicios.map((ex, exIdx) => {
        const done = completedSeries[exIdx] ?? [];
        const planned = ex.seriesPlanejadas ?? 3;
        const isActive = activeExIdx === exIdx;
        const allDone = done.length >= planned;
        const input = currentInputs[exIdx] ?? { pesoReal: '', repeticoesReais: '', tempoSegundos: '', distanciaMetros: '', falhou: false };
        return (
          <div key={exIdx} className={`card overflow-hidden transition-colors ${allDone ? 'border-brand/50 bg-brand/5' : isActive ? 'border-amber-400/40 bg-amber-400/5' : 'border-outline'}`}>
            <button className="w-full flex items-center justify-between p-4" onClick={() => setActiveExIdx(isActive ? null : exIdx)}>
              <div className="flex items-center gap-3 text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${allDone ? 'bg-brand border-brand text-black' : 'border-outline text-gray-500'}`}>
                  {allDone ? <CheckCircle size={14} /> : exIdx + 1}
                </div>
                <div>
                  <p className="font-bold text-sm">{ex.exercicioNome ?? ex.exercicioId}</p>
                  <p className="text-xs text-gray-500">
                    {ex.seriesPlanejadas}×{ex.repeticoesPlanejadas} @ {ex.pesoPlanejado ?? '–'}kg
                    {done.length > 0 && <span className="ml-2 text-brand font-bold">{done.length}/{planned}</span>}
                  </p>
                </div>
              </div>
              {isActive ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {isActive && (
              <div className="px-4 pb-4 space-y-3 border-t border-outline">
                {done.length > 0 && (
                  <div className="pt-3">
                    <p className="text-[11px] uppercase tracking-widest text-gray-600 font-black mb-2">Séries Concluídas</p>
                    <ExercicioSeriesTable done={done} modalidade={getModalidade(ex)} />
                  </div>
                )}
                {!allDone && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[11px] uppercase tracking-widest text-gray-600 font-black">Série {done.length + 1}</p>
                    <SerieInputs
                      modalidade={getModalidade(ex)}
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
                  </div>
                )}
                {allDone && (
                  <div className="pt-2 flex items-center gap-2 text-brand text-sm font-bold">
                    <CheckCircle size={16} />Exercício completo!
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

  // forca_dinamica (default)
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