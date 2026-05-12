import React, { useState } from 'react';
import { ArrowLeft, Save, Ruler, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { workoutService } from '../../lib/workoutService';
import { useMeasurements, useInvalidateMeasurements } from '../../hooks/useMeasurements';
import { useToast } from '../../store/appStore';

interface BodyMeasurementsProps {
  onBack: () => void;
}

type NumField = 'pesoKg' | 'bracoCm' | 'cinturaCm' | 'quadrilCm' | 'pescocoCm';

const FIELDS: { key: NumField; label: string; unit: string }[] = [
  { key: 'pesoKg',     label: 'Peso Corporal', unit: 'kg' },
  { key: 'bracoCm',    label: 'Braço',         unit: 'cm' },
  { key: 'cinturaCm',  label: 'Cintura',        unit: 'cm' },
  { key: 'quadrilCm',  label: 'Quadril',        unit: 'cm' },
  { key: 'pescocoCm',  label: 'Pescoço',        unit: 'cm' },
];

export default function BodyMeasurements({ onBack }: BodyMeasurementsProps) {
  const { data: measurements = [], isLoading } = useMeasurements();
  const invalidate = useInvalidateMeasurements();
  const addToast = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [data, setData] = useState(today);
  const [values, setValues] = useState<Record<NumField, string>>({
    pesoKg: '', bracoCm: '', cinturaCm: '', quadrilCm: '', pescocoCm: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [chartField, setChartField] = useState<NumField>('pesoKg');

  const chartData = measurements
    .filter(m => m[chartField] !== undefined && m[chartField] !== null)
    .map(m => ({
      date: format(new Date(m.data + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      value: m[chartField] as number,
    }));

  const handleSave = async () => {
    const hasValue = FIELDS.some(f => values[f.key] !== '');
    if (!hasValue) { setError('Preencha ao menos um campo.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, number | string> = { data };
      FIELDS.forEach(f => {
        if (values[f.key] !== '') payload[f.key] = parseFloat(values[f.key]);
      });
      await workoutService.saveMeasurement(payload as any);
      invalidate();
      setSaved(true);
      setValues({ pesoKg: '', bracoCm: '', cinturaCm: '', quadrilCm: '', pescocoCm: '' });
      setData(today);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Falha ao salvar. Tente novamente.');
      addToast('error', 'Falha ao salvar medidas. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

  return (
    <div className="space-y-6 pt-4 pb-24">
      {/* Latest snapshot */}
      {latestMeasurement && (
        <section className="card p-4 space-y-3">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">
            Último Registro: {format(new Date(latestMeasurement.data + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: ptBR })}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {FIELDS.map(f => latestMeasurement[f.key] != null && (
              <div key={f.key} className="text-center">
                <p className="text-[11px] text-gray-600 uppercase tracking-wider font-black">{f.label}</p>
                <p className="font-mono text-lg font-black text-brand">
                  {latestMeasurement[f.key]}
                  <span className="text-xs text-gray-500 ml-0.5">{f.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chart */}
      {measurements.length >= 2 && (
        <section className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-brand" />
              <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Evolução</h3>
            </div>
            <select
              className="bg-surface-hover border border-input-border rounded px-2 py-1 text-[10px] font-bold uppercase text-white"
              value={chartField}
              onChange={e => setChartField(e.target.value as NumField)}
            >
              {FIELDS.map(f => (
                <option key={f.key} value={f.key} className="bg-surface">{f.label}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="measGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#CCFF00' }}
              />
              <Area type="monotone" dataKey="value" stroke="#CCFF00" strokeWidth={2} fill="url(#measGrad)" dot={{ r: 3, fill: '#CCFF00' }} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Form */}
      <section className="card p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-outline pb-4">
          <Ruler size={14} className="text-brand" />
          <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Novo Registro</h3>
        </div>

        <div>
          <label className="input-label">Data</label>
          <input
            type="date"
            className="form-input"
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="input-label">{f.label} ({f.unit})</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="form-input"
                placeholder="—"
                value={values[f.key]}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

        {saved && (
          <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg">
            <p className="text-xs text-brand font-bold uppercase tracking-wider">Medidas salvas com sucesso!</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full justify-center"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Medidas'}
        </button>
      </section>

      {/* History list */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="card p-4 h-14 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : measurements.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-widest font-black">Histórico</h3>
          {[...measurements].reverse().map(m => (
            <div key={m.id} className="card p-4 flex items-center justify-between gap-4">
              <p className="text-xs font-bold text-gray-400 flex-shrink-0">
                {format(new Date(m.data + 'T12:00:00'), "dd MMM yyyy", { locale: ptBR })}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-end">
                {FIELDS.map(f => m[f.key] != null && (
                  <span key={f.key} className="text-xs text-gray-500">
                    <span className="text-white font-bold">{m[f.key]}</span>{f.unit} {f.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
