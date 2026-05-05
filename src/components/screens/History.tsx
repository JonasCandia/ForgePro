import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Calendar, Filter, Archive, Dumbbell, ChevronRight } from 'lucide-react';
import { Registro } from '../../types';
import { workoutService } from '../../lib/workoutService';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function History() {
  const [logs, setLogs] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    async function load() {
      const data = await workoutService.getRegistros();
      setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro permanentemente?")) return;
    try {
      await workoutService.deleteRegistro(id);
      setLogs(logs.filter(l => l.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const filteredLogs = logs
    .filter(log => log.exercicioNome.toLowerCase().includes(search.toLowerCase()))
    .filter(log => !filterDate || log.data.startsWith(filterDate))
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const formatLogDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje, ' + format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem, ' + format(date, 'HH:mm');
    return format(date, "dd MMM yyyy", { locale: ptBR }).toUpperCase();
  };

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: Registro[] } = {};
    filteredLogs.forEach(log => {
      const dateKey = format(new Date(log.data), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredLogs]);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-4 border-brand border-t-transparent animate-spin"></div></div>;

  return (
    <div className="space-y-8 pt-4 pb-24">
      <header className="space-y-2">
        <h2 className="text-brand text-xs font-black uppercase tracking-[0.3em]">Arquivo de Treinos</h2>
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter italic">Histórico de Logs</h1>
      </header>

      {/* Filters */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR EXERCÍCIO..." 
            className="form-input !pl-12 font-black uppercase tracking-tight"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={18} />
          <input 
            type="date" 
            className="form-input !pl-12 font-black uppercase tracking-tight"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </section>

      {/* List */}
      <div className="space-y-12">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="card py-20 text-center opacity-30 border-dashed">
            <Archive size={64} className="mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma atividade registrada nesta linha do tempo.</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([dateKey, items]) => (
            <div key={dateKey} className="space-y-4">
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand whitespace-nowrap bg-brand/10 px-4 py-2 rounded-lg border border-brand/20">
                  {formatLogDate(items[0].data)}
                </span>
                <div className="h-px w-full bg-[var(--color-outline)]" />
              </div>

              <div className="space-y-3">
                {items.map((log) => (
                  <div key={log.id} className="card p-0 overflow-hidden flex flex-col md:flex-row md:items-center hover:border-brand/30 transition-all group">
                    <div className="p-6 flex-1 flex items-center gap-6">
                      <div className="w-12 h-12 bg-[var(--color-surface-hover)] text-brand rounded-xl flex items-center justify-center border border-[var(--color-outline)] group-hover:bg-brand group-hover:text-black transition-colors">
                        <Dumbbell size={20} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tighter italic group-hover:text-brand transition-colors">{log.exercicioNome}</h4>
                        <div className="flex gap-6 mt-2">
                          <DataBadge label="SÉRIES" value={log.series} />
                          <DataBadge label="REPS" value={log.repeticoes} />
                          <DataBadge label="CARGA" value={`${log.pesoKg}KG`} isBrand />
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--color-surface-hover)]/30 backdrop-blur-sm px-6 py-4 flex items-center justify-between md:justify-end border-t md:border-t-0 md:border-l border-[var(--color-outline)]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] md:hidden">Origem: {log.origem || 'Manual'}</span>
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className="text-[var(--color-text-muted)] hover:text-red-500 p-2 transition-all hover:scale-110 active:scale-95"
                        title="Deletar registro"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DataBadge({ label, value, isBrand }: { label: string, value: string | number, isBrand?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none mb-1">{label}</span>
      <span className={`text-sm font-black font-mono leading-none ${isBrand ? 'text-brand' : ''}`}>{value}</span>
    </div>
  );
}
