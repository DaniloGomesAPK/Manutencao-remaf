import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrdemDeServico } from '../types';
import { sortOrdersByLastUpdate } from '../utils/orderSorting';

const order = (id: string, dates: Partial<OrdemDeServico> = {}): OrdemDeServico => ({
  id,
  numeroOS: id,
  dataAbertura: '2024-01-01',
  horaAbertura: '09:00',
  equipamento: '',
  placa: '',
  tecnico: '',
  ...dates,
});

test('shows the most recently edited order first without changing the source list', () => {
  const orders = [
    order('newly-created', { createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z' }),
    order('recently-edited', { createdAt: '2024-01-01T10:00:00Z', updatedAt: '2026-10-28T10:00:00Z' }),
  ];

  assert.deepEqual(sortOrdersByLastUpdate(orders).map(({ id }) => id), ['recently-edited', 'newly-created']);
  assert.deepEqual(orders.map(({ id }) => id), ['newly-created', 'recently-edited']);
});

test('uses creation or opening time for older orders with no valid update date', () => {
  const orders = [
    order('opening', { dataAbertura: '2026-10-25', horaAbertura: '12:00' }),
    order('invalid-update', { updatedAt: 'invalid', createdAt: '2026-10-27T12:00:00Z' }),
    order('unknown', { dataAbertura: '' }),
  ];

  assert.deepEqual(sortOrdersByLastUpdate(orders).map(({ id }) => id), ['invalid-update', 'opening', 'unknown']);
});
