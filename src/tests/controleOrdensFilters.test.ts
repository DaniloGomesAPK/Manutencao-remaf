import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyControleOrdem } from '../models/ControleOrdem';
import { FILTROS_INICIAIS_CONTROLE_ORDENS, filtrarOrdenarControleOrdens } from '../utils/controleOrdensFilters';

const blank = emptyControleOrdem('empresa-teste');
const rows = [
  { ...blank, id: '1', data: '2026-10-10', protocolo: 'OS-10', equipamento: 'Caminhão', valor: '1.200,00', status: 'Aguardando PC' as const },
  { ...blank, id: '2', data: '2026-10-30', protocolo: 'OS-2', solicitante: 'João', valor: '200,00', status: 'Emitir NF' as const, nf: 'NF-1' },
  { ...blank, id: '3', data: '', protocolo: 'OS-3', valor: '', status: '' as const },
];

test('searches accents and filters effective status without mutating saved rows', () => {
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, busca: 'caminhao' }).map(row => row.id), ['1']);
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, status: 'Concluído' }).map(row => row.id), ['2']);
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, status: 'Sem status' }).map(row => row.id), ['3']);
  assert.equal(rows[0].id, '1');
});

test('filters dates inclusively and keeps undated records at the end of date sorts', () => {
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, FILTROS_INICIAIS_CONTROLE_ORDENS).map(row => row.id), ['2', '1', '3']);
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, ordenacao: 'data-antiga' }).map(row => row.id), ['1', '2', '3']);
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, dataInicio: '2026-10-10', dataFim: '2026-10-10' }).map(row => row.id), ['1']);
});

test('reorders by Brazilian money and numeric protocol', () => {
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, ordenacao: 'valor-maior' }).map(row => row.id), ['1', '2', '3']);
  assert.deepEqual(filtrarOrdenarControleOrdens(rows, { ...FILTROS_INICIAIS_CONTROLE_ORDENS, ordenacao: 'protocolo' }).map(row => row.id), ['2', '3', '1']);
});
