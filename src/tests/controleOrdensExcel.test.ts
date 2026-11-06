import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { emptyControleOrdem } from '../models/ControleOrdem';
import { COLUNAS_CONTROLE_ORDENS_EXCEL, criarWorkbookControleOrdens } from '../utils/controleOrdensExcel';

test('exporta um registro por linha com todos os campos e tipos úteis para análise', () => {
  const first = {
    ...emptyControleOrdem('empresa-1'), id: '1', data: '2026-11-06', protocolo: '37940',
    equipamento: 'Caminhão', solicitante: 'Cliente A', servico: 'Revisão', valor: 'R$ 4.422,39',
    pedidoCompra: 'PC-100', frs: 'FRS-20', status: 'Emitir NF' as const,
    nf: '12345', pagamento: '2026-11-20',
  };
  const second = {
    ...emptyControleOrdem('empresa-1'), id: '2', protocolo: '37941',
    status: 'Outra tarefa' as const, tarefaExtra: 'Aguardar retorno', valor: 'A combinar',
  };

  const original = [first, second];
  const workbook = criarWorkbookControleOrdens(original);
  const saved = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellDates: true });
  const sheet = saved.Sheets['Controle de ordens'];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], [...COLUNAS_CONTROLE_ORDENS_EXCEL]);
  assert.equal(rows[1][1], '37940');
  assert.equal(rows[1][5], 4422.39);
  assert.equal(rows[1][8], 'Concluído');
  assert.equal(rows[1][10], '12345');
  assert.equal(rows[2][1], '37941');
  assert.equal(rows[2][5], 'A combinar');
  assert.equal(rows[2][8], 'Outra tarefa');
  assert.equal(rows[2][9], 'Aguardar retorno');
  assert.equal(sheet.A2.t, 'd');
  assert.equal(sheet.L2.t, 'd');
  assert.equal(sheet['!autofilter']?.ref, 'A1:L3');
  assert.equal(original[0].status, 'Emitir NF');
});
