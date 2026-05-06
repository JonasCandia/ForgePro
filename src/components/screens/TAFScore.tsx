import React, { useState } from 'react';
import { Target, TrendingUp, Trash2, ChevronUp, ChevronDown, Minus, ClipboardList, Info } from 'lucide-react';
import { useTAFScores, useSaveTAFScore, useDeleteTAFScore } from '../../hooks/useTAF';
import { calcularResultadoTAF, projetarNotaTAF } from '../../lib/tafUtils';
import type { ConceitoTAF, TAFScore } from '../../types';
import { TAF_METAS_MUITO_BOM } from '../../constants';

// ─── Utilitários de UI ─────────────────────────────────────────────────────────

const CONCEITO_COR: Record<ConceitoTAF, string> = {
  Excelente:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'Muito Bom':  'text-brand bg-brand/10 border-brand/30',
  Bom:          'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Regular:      'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Insuficiente: 'text-red-400 bg-red-400/10 border-red-400/30',
};

function BadgeConceito({ conceito }: { conceito: ConceitoTAF }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider ${CONCEITO_COR[conceito]}`}>
      {conceito}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-[11px] text-gray-500">—</span>;
  if (Math.abs(delta) < 0.05) return <Minus size={12} className="text-gray-400" />;
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-bold">
      <ChevronUp size={12} />{delta.toFixed(1)}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-red-400 text-[11px] font-bold">
      <ChevronDown size={12} />{Math.abs(delta).toFixed(1)}
    </span>
  );
}

function ProgressBar({ value, max, meta }: { value: number; max: number; meta: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const metaPct = Math.min(100, (meta / max) * 100);
  return (
    <div className="relative h-2 bg-surface-hover rounded-full overflow-visible">
      <div
        className="h-full bg-brand rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
      {/* Linha de meta */}
      <div
        className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-yellow-400/80"
        style={{ left: `${metaPct}%` }}
        title={`Meta: ${meta}`}
      />
    </div>
  );
}

// ─── Formulário de Novo Resultado ─────────────────────────────────────────────

interface FormState {
  barraFixa: string;
  remadorAbdominal: string;
  corrida12min: string;
  observacoes: string;
  simulado: boolean;
}

const FORM_INICIAL: FormState = {
  barraFixa: '',
  remadorAbdominal: '',
  corrida12min: '',
  observacoes: '',
  simulado: true,
};

function FormNovaTAF({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const { mutateAsync: salvar, isPending } = useSaveTAFScore();

  const barra = parseInt(form.barraFixa) || 0;
  const abdo  = parseInt(form.remadorAbdominal) || 0;
  const corrida = parseInt(form.corrida12min) || 0;

  const preview = barra > 0 || abdo > 0 || corrida > 0
    ? calcularResultadoTAF(barra, abdo, corrida)
    : null;

  function handleChange(field: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barra && !abdo && !corrida) return;
    const today = new Date().toISOString().slice(0, 10);
    await salvar({
      data: today,
      barraFixa: barra,
      remadorAbdominal: abdo,
      corrida12min: corrida,
      observacoes: form.observacoes || undefined,
      simulado: form.simulado,
    });
    setForm(FORM_INICIAL);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {/* Barra */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Barra Fixa (reps)
          </label>
          <input
            type="number"
            min={0}
            max={50}
            className="input-field w-full text-center text-lg font-bold"
            placeholder="0"
            value={form.barraFixa}
            onChange={e => handleChange('barraFixa', e.target.value)}
          />
          {preview && (
            <p className="text-center text-[11px] font-mono text-brand">
              {preview.ptsBarra.toFixed(1)} pts
            </p>
          )}
          <p className="text-center text-[10px] text-gray-500">
            Meta: ≥{TAF_METAS_MUITO_BOM.barraFixa}
          </p>
        </div>
        {/* Abdominal */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Abdominal (reps/1min)
          </label>
          <input
            type="number"
            min={0}
            max={80}
            className="input-field w-full text-center text-lg font-bold"
            placeholder="0"
            value={form.remadorAbdominal}
            onChange={e => handleChange('remadorAbdominal', e.target.value)}
          />
          {preview && (
            <p className="text-center text-[11px] font-mono text-brand">
              {preview.ptsAbdominal.toFixed(1)} pts
            </p>
          )}
          <p className="text-center text-[10px] text-gray-500">
            Meta: ≥{TAF_METAS_MUITO_BOM.remadorAbdominal}
          </p>
        </div>
        {/* Corrida */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Corrida 12min (metros)
          </label>
          <input
            type="number"
            min={0}
            max={5000}
            step={50}
            className="input-field w-full text-center text-lg font-bold"
            placeholder="0"
            value={form.corrida12min}
            onChange={e => handleChange('corrida12min', e.target.value)}
          />
          {preview && (
            <p className="text-center text-[11px] font-mono text-brand">
              {preview.ptsCorreida.toFixed(1)} pts
            </p>
          )}
          <p className="text-center text-[10px] text-gray-500">
            Meta: ≥{TAF_METAS_MUITO_BOM.corrida12min}m
          </p>
        </div>
      </div>

      {/* Preview da nota */}
      {preview && (
        <div className={`rounded-lg border p-3 flex items-center justify-between ${CONCEITO_COR[preview.conceito]}`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Nota estimada</p>
            <p className="text-3xl font-black">{preview.notaFinal.toFixed(1)}</p>
          </div>
          <BadgeConceito conceito={preview.conceito} />
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          className="input-field w-full text-sm"
          placeholder="Observações (opcional)"
          value={form.observacoes}
          onChange={e => handleChange('observacoes', e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            className="accent-brand w-4 h-4"
            checked={form.simulado}
            onChange={e => handleChange('simulado', e.target.checked)}
          />
          Simulado de treino (não oficial)
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || (!barra && !abdo && !corrida)}
        className="btn-primary w-full"
      >
        {isPending ? 'Salvando…' : 'Salvar Resultado'}
      </button>
    </form>
  );
}

// ─── Card de resultado histórico ──────────────────────────────────────────────

function CardScore({ score, delta, onDelete }: { score: TAFScore; delta: number | null; onDelete: () => void }) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="bg-surface border border-outline rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-gray-500 font-mono">
            {new Date(score.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            {score.simulado && <span className="ml-2 text-yellow-500">simulado</span>}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black">{score.notaFinal.toFixed(1)}</span>
            <DeltaBadge delta={delta} />
            <BadgeConceito conceito={score.conceito} />
          </div>
        </div>
        {confirmando ? (
          <div className="flex gap-1">
            <button onClick={() => { onDelete(); setConfirmando(false); }} className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/30 rounded px-2 py-1">Confirmar</button>
            <button onClick={() => setConfirmando(false)} className="text-[11px] text-gray-400 bg-white/5 rounded px-2 py-1">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmando(true)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors" aria-label="Excluir">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Métricas individuais */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Barra</p>
          <p className="font-bold text-sm">{score.barraFixa} <span className="text-[10px] text-gray-500">rep</span></p>
          <p className="text-[10px] text-brand font-mono">{score.ptsBarra.toFixed(1)} pts</p>
          <ProgressBar value={score.barraFixa} max={20} meta={TAF_METAS_MUITO_BOM.barraFixa} />
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Abdominal</p>
          <p className="font-bold text-sm">{score.remadorAbdominal} <span className="text-[10px] text-gray-500">rep</span></p>
          <p className="text-[10px] text-brand font-mono">{score.ptsAbdominal.toFixed(1)} pts</p>
          <ProgressBar value={score.remadorAbdominal} max={60} meta={TAF_METAS_MUITO_BOM.remadorAbdominal} />
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Corrida</p>
          <p className="font-bold text-sm">{score.corrida12min} <span className="text-[10px] text-gray-500">m</span></p>
          <p className="text-[10px] text-brand font-mono">{score.ptsCorreida.toFixed(1)} pts</p>
          <ProgressBar value={score.corrida12min} max={4000} meta={TAF_METAS_MUITO_BOM.corrida12min} />
        </div>
      </div>

      {score.observacoes && (
        <p className="text-[11px] text-gray-400 italic border-t border-outline pt-2">{score.observacoes}</p>
      )}
    </div>
  );
}

// ─── Painel de projeção ───────────────────────────────────────────────────────

function PainelProjecao({ ultimo }: { ultimo: TAFScore }) {
  const [barraAlvo, setBarraAlvo] = useState(String(ultimo.barraFixa + 2));
  const [abdoAlvo, setAbdoAlvo]   = useState(String(ultimo.remadorAbdominal + 3));
  const [corridaAlvo, setCorridaAlvo] = useState(String(ultimo.corrida12min + 100));

  const notaBarra   = projetarNotaTAF('barraFixa',       parseInt(barraAlvo) || 0,   { barraFixa: ultimo.barraFixa, remadorAbdominal: ultimo.remadorAbdominal, corrida12min: ultimo.corrida12min });
  const notaAbdo    = projetarNotaTAF('remadorAbdominal', parseInt(abdoAlvo) || 0,    { barraFixa: ultimo.barraFixa, remadorAbdominal: ultimo.remadorAbdominal, corrida12min: ultimo.corrida12min });
  const notaCorrida = projetarNotaTAF('corrida12min',    parseInt(corridaAlvo) || 0, { barraFixa: ultimo.barraFixa, remadorAbdominal: ultimo.remadorAbdominal, corrida12min: ultimo.corrida12min });

  return (
    <div className="bg-surface border border-outline rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={14} className="text-brand" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Projeção de melhoria</p>
      </div>
      <p className="text-[11px] text-gray-500">Simule o impacto de evoluir cada exercício na nota final.</p>
      <div className="space-y-2">
        {([
          { label: 'Barra (reps)', campo: 'barraFixa' as const, valor: barraAlvo, setter: setBarraAlvo, notaProjetada: notaBarra },
          { label: 'Abdominal (reps/1min)', campo: 'remadorAbdominal' as const, valor: abdoAlvo, setter: setAbdoAlvo, notaProjetada: notaAbdo },
          { label: 'Corrida 12min (m)', campo: 'corrida12min' as const, valor: corridaAlvo, setter: setCorridaAlvo, notaProjetada: notaCorrida },
        ] as const).map(({ label, valor, setter, notaProjetada }) => (
          <div key={label} className="flex items-center gap-3">
            <label className="text-[11px] text-gray-400 w-36 flex-shrink-0">{label}</label>
            <input
              type="number"
              className="input-field w-20 text-center text-sm"
              value={valor}
              onChange={e => setter(e.target.value)}
            />
            <span className="text-[11px] font-mono text-brand">→ {notaProjetada.toFixed(1)}</span>
            <span className="text-[11px] text-gray-500">({calcularResultadoTAF === undefined ? '' : `+${(notaProjetada - ultimo.notaFinal).toFixed(1)}`})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function TAFScore() {
  const { data: scores = [], isLoading } = useTAFScores();
  const { mutate: deletar } = useDeleteTAFScore();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarInfo, setMostrarInfo] = useState(false);

  const ordenados = [...scores].sort((a, b) => a.data.localeCompare(b.data));
  const ultimo = ordenados.at(-1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-brand" />
          <h1 className="text-xl font-black uppercase tracking-tight">TAF CBMRS</h1>
          <button
            onClick={() => setMostrarInfo(!mostrarInfo)}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Info"
          >
            <Info size={14} />
          </button>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="btn-primary py-2 px-4 text-sm"
        >
          {mostrarForm ? 'Cancelar' : '+ Registrar'}
        </button>
      </div>

      {/* Info box */}
      {mostrarInfo && (
        <div className="bg-surface border border-brand/20 rounded-xl p-4 space-y-2 text-[12px] text-gray-400">
          <p className="font-bold text-brand">Fórmula TAF (IR 001/CBMRS/2024)</p>
          <p>Nota Final = (Barra + Abdominal + 2 × Corrida) / 4</p>
          <p className="mt-2 font-bold text-gray-300">Conceitos (25-29 anos, masc.):</p>
          <div className="grid grid-cols-2 gap-1">
            <span>Excelente: 10,0</span>
            <span>Muito Bom: 8,5–9,9</span>
            <span>Bom: 7,0–8,4</span>
            <span>Regular: 5,0–6,9</span>
            <span>Insuficiente: &lt;5,0</span>
          </div>
          <p className="mt-2 font-bold text-gray-300">Metas "Muito Bom":</p>
          <p>Barra ≥10 reps | Abdominal ≥39 reps | Corrida ≥2850m</p>
        </div>
      )}

      {/* Formulário de novo resultado */}
      {mostrarForm && (
        <div className="bg-surface border border-outline rounded-xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
            <ClipboardList size={13} /> Novo resultado
          </p>
          <FormNovaTAF onSaved={() => setMostrarForm(false)} />
        </div>
      )}

      {/* Projeção */}
      {ultimo && !mostrarForm && (
        <PainelProjecao ultimo={ultimo} />
      )}

      {/* Histórico */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Histórico ({ordenados.length} resultado{ordenados.length !== 1 ? 's' : ''})
        </p>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && ordenados.length === 0 && (
          <div className="text-center py-12 text-gray-500 space-y-2">
            <Target size={40} className="mx-auto opacity-20" />
            <p className="text-sm">Nenhum resultado registrado.</p>
            <p className="text-[12px]">Use o botão "+ Registrar" para começar a rastrear sua evolução.</p>
          </div>
        )}

        {[...ordenados].reverse().map((score, idx) => {
          const anterior = [...ordenados].reverse()[idx + 1];
          const delta = anterior ? score.notaFinal - anterior.notaFinal : null;
          return (
            <CardScore
              key={score.id}
              score={score}
              delta={delta}
              onDelete={() => deletar(score.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
