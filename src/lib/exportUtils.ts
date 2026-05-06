import { WorkoutSession } from '../types';

function escapeCsvField(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(sessions: WorkoutSession[]): void {
  const header = [
    'data',
    'semana',
    'diaDaSemana',
    'nomeTreino',
    'exercicio',
    'grupoMuscular',
    'seriesRealizadas',
    'repsMedias',
    'pesoMax',
    'repsAtMax',
    'volumeTotal',
  ].join(',');

  const rows = sessions
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .flatMap(session =>
      session.exerciciosSummary.map(s =>
        [
          escapeCsvField(session.data),
          escapeCsvField(session.semana),
          escapeCsvField(session.diaDaSemana),
          escapeCsvField(session.nomeTreino),
          escapeCsvField(s.exercicioNome),
          escapeCsvField(s.grupoMuscular),
          escapeCsvField(s.seriesRealizadas),
          escapeCsvField(s.repeticoesReais),
          escapeCsvField(s.pesoMax),
          escapeCsvField(s.repsAtMax),
          escapeCsvField(s.volumeTotal),
        ].join(',')
      )
    );

  const csv = [header, ...rows].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM para Excel reconhecer acentos
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forgepro-historico-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
