import type { OrdemDeServico } from '../types';

function orderTimestamp(order: OrdemDeServico): number {
  for (const value of [order.updatedAt, order.createdAt]) {
    const timestamp = Date.parse(value || '');
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const openingDate = /^\d{4}-\d{2}-\d{2}$/.test(order.dataAbertura)
    ? `${order.dataAbertura}T${order.horaAbertura || '00:00'}`
    : order.dataAbertura;
  const timestamp = Date.parse(openingDate);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortOrdersByLastUpdate(orders: OrdemDeServico[]): OrdemDeServico[] {
  return [...orders].sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
}
