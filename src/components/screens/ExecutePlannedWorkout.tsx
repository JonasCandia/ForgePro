import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, CheckCircle, Timer, RotateCcw, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { workoutService } from '../../lib/workoutService';
import { Plano, WorkoutSeries } from '../../types';

interface SerieRecord {
  seriesId: string;
  serieNum: number;
  pesoReal: number;
  repeticoesReais: number;
  falhou: boolean;
}

interface InputState {
  pesoReal: string;
  repeticoesReais: string;
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
  const [defaultRestTime] = useState(() => parseInt(localStorage.getItem('forge_rest_time') || '90', 10));
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
                falhou: s.falhou ?? false
              }));
            }
            const lastDone = rebuilt[idx]?.[rebuilt[idx].length - 1];
            inputs[idx] = {
              pesoReal: String(lastDone?.pesoReal ?? ex.pesoPlanejado ?? ''),
              repeticoesReais: String(lastDone?.repeticoesReais ?? ex.repeticoesPlanejadas ?? ''),
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
    const pesoReal = parseFloat(input.pesoReal) || 0;
    const repeticoesReais = parseInt(input.repeticoesReais) || 0;
    try {
      const seriesId = await workoutService.addSeries(workoutId, {
        exercicioId: ex.exercicioId,
        exercicioNome: ex.exercicioNome ?? ex.exercicioId,
        grupoMuscular: '',
        serieNum,
        repeticoesPlanejadas: ex.repeticoesPlanejadas ?? 0,
        pesoPlanejado: ex.pesoPlanejado ?? 0,
        repeticoesReais,
        pesoReal,
        falhou: input.falhou,
        tempoDescanso: defaultRestTime,
        objetivo: ''
      });
      const newRecord: SerieRecord = { seriesId, serieNum, pesoReal, repeticoesReais, falhou: input.falhou };
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
        const maxEntry = series.reduce((best, s) => s.pesoReal > best.pesoReal ? s : best, series[0] ?? { pesoReal: 0, repeticoesReais: 0 });
        const volumeTotal = series.reduce((sum, s) => sum + s.pesoReal * s.repeticoesReais, 0);
        return {
          exercicioId: ex.exercicioId,
          exercicioNome: ex.exercicioNome ?? ex.exercicioId,
          grupoMuscular: '',
          seriesRealizadas: series.length,
          repeticoesReais: maxEntry?.repeticoesReais ?? 0,
          pesoMax: maxEntry?.pesoReal ?? 0,
          repsAtMax: maxEntry?.repeticoesReais ?? 0,
          volumeTotal
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
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-6 pt-8">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
          <Trophy size={32} className="text-brand" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Treino Finalizado!</h2>
          <p className="text-gray-400 text-sm mt-2">Ótimo trabalho. Continue assim!</p>
        </div>
        <button onClick={onBack} className="btn-primary">Voltar ao Início</button>
      </div>
    );
  }

  if (!executing) {
    return (
      <div className="space-y-6 pt-4 pb-24">
        <header className="flex items-center gap-4 mb-2">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
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
                  {planoForDia.diaDaSemana} — {planoForDia.exercicios.length} exercícios
                </h3>
                <ul className="space-y-1">
                  {planoForDia.exercicios.map((ex, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-brand font-bold w-4">{i + 1}.</span>
                      <span>{ex.exercicioNome ?? ex.exercicioId}</span>
                      <span className="text-gray-600">— {ex.seriesPlanejadas}×{ex.repeticoesPlanejadas} @ {ex.pesoPlanejado}kg</span>
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
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-brand text-xs font-bold uppercase tracking-widest mb-1">Em Execução</h2>
          <h1 className="font-display text-xl font-black uppercase tracking-tight">{selectedPlano?.diaDaSemana}</h1>
        </div>
        {timerActive && (
          <div className="flex items-center gap-2 bg-brand/20 border border-brand/40 px-3 py-1.5 rounded-lg">
            <Timer size={14} className="text-brand animate-pulse" />
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
        const input = currentInputs[exIdx] ?? { pesoReal: '', repeticoesReais: '', falhou: false };
        return (
          <div key={exIdx} className={`card overflow-hidden border-l-4 transition-colors ${allDone ? 'border-brand' : isActive ? 'border-yellow-400' : 'border-outline'}`}>
            <button className="w-full flex items-center justify-between p-4" onClick={() => setActiveExIdx(isActive ? null : exIdx)}>
              <div className="flex items-center gap-3 text-left">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${allDone ? 'bg-brand border-brand text-black' : 'border-outline text-gray-500'}`}>
                  {allDone ? <CheckCircle size={14} /> : exIdx + 1}
                </div>
                <div>
                  <p className="font-bold text-sm">{ex.exercicioNome ?? ex.exercicioId}</p>
                  <p className="text-xs text-gray-500">
                    {ex.seriesPlanejadas}×{ex.repeticoesPlanejadas} @ {ex.pesoPlanejado ?? '—'}kg
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
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black mb-2">Séries Concluídas</p>
                    <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 mb-1 px-1">
                      <span>#</span><span>Reps</span><span>Peso</span>
                    </div>
                    {done.map(s => (
                      <div key={s.serieNum} className={`grid grid-cols-3 gap-1 text-xs px-1 py-1 rounded ${s.falhou ? 'text-red-400' : 'text-gray-300'}`}>
                        <span className="font-bold">S{s.serieNum}{s.falhou ? ' ✗' : ''}</span>
                        <span>{s.repeticoesReais}</span>
                        <span>{s.pesoReal}kg</span>
                      </div>
                    ))}
                  </div>
                )}
                {!allDone && (
                  <div className="pt-2 space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-black">Série {done.length + 1}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Repetições</label>
                        <input type="number" min="0" className="form-input" value={input.repeticoesReais}
                          onChange={e => setCurrentInputs(prev => ({ ...prev, [exIdx]: { ...prev[exIdx], repeticoesReais: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="input-label">Peso (kg)</label>
                        <input type="number" min="0" step="0.5" className="form-input" value={input.pesoReal}
                          onChange={e => setCurrentInputs(prev => ({ ...prev, [exIdx]: { ...prev[exIdx], pesoReal: e.target.value } }))} />
                      </div>
                    </div>
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
        {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Trophy size={16} />}
        {saving ? 'Salvando...' : 'Finalizar Treino'}
      </button>
    </div>
  );
}