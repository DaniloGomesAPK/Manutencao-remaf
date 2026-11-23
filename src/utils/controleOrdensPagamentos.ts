import { statusEfetivoControleOrdem, type ControleOrdem } from '../models/ControleOrdem';

const dataBahia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Bahia',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function hojePagamentos(data = new Date()): string {
  return dataBahia.format(data);
}

export function pagamentosFuturosConcluidos(rows: ControleOrdem[], hoje: string): ControleOrdem[] {
  return rows.filter(row => {
    const { pagamento } = row;
    if (statusEfetivoControleOrdem(row) !== 'Concluído' || !/^\d{4}-\d{2}-\d{2}$/.test(pagamento) || pagamento <= hoje) {
      return false;
    }

    const data = new Date(`${pagamento}T00:00:00Z`);
    return Number.isFinite(data.getTime()) && data.toISOString().startsWith(pagamento);
  }).sort((a, b) => a.pagamento.localeCompare(b.pagamento) || a.id.localeCompare(b.id));
}
