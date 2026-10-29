import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STATUS_CONTROLE_ORDEM, atualizarNFControleOrdem, categoriaResumoControleOrdem, emptyControleOrdem, resumoStatusControleOrdens, validateControleOrdem } from '../models/ControleOrdem';
import { dataControleOrdem, gerarPDFDetalhesControleOrdens, valorControleOrdem } from '../utils/controleOrdensReport';

test('offers exactly the requested predefined status choices', () => {
  assert.deepEqual([...STATUS_CONTROLE_ORDEM], [
    'Aguardando PC', 'Falta de acordo', 'Falta orçamento',
    'Aguardando FRS', 'Emitir NF', 'Concluído', 'Cancelado',
  ]);
});

test('allows an extra task without a protocol and requires its description', () => {
  const blank = emptyControleOrdem('empresa-teste');
  assert.match(validateControleOrdem(blank) || '', /Preencha ao menos uma informação/);
  assert.match(validateControleOrdem({ ...blank, status: 'Outra tarefa' }) || '', /Descreva a tarefa/);
  assert.equal(validateControleOrdem({
    ...blank, status: 'Outra tarefa', tarefaExtra: 'Confirmar prazo com o cliente',
  }), null);
});

test('blocks a row without a tenant id', () => {
  assert.match(validateControleOrdem({
    ...emptyControleOrdem(''), protocolo: 'OS-0001',
  }) || '', /identificar a empresa/);
});

test('keeps the expected payment date in a manual row', () => {
  const row = { ...emptyControleOrdem('empresa-teste'), pagamento: '2026-11-05' };
  assert.equal(validateControleOrdem(row), null);
  assert.match(validateControleOrdem({ ...row, pagamento: 'próxima semana' }) || '', /data válida/);
});

test('entering an NF concludes the row and removing it clears the automatic status', () => {
  const row = { ...emptyControleOrdem('empresa-teste'), status: 'Emitir NF' as const };
  const completed = atualizarNFControleOrdem(row, 'NF-123');
  assert.equal(completed.status, 'Concluído');
  assert.equal(atualizarNFControleOrdem(completed, '').status, '');
});

test('dashboard counts existing records with an NF as concluded without changing them', () => {
  const legacy = { ...emptyControleOrdem('empresa-teste'), id: '1', nf: 'NF-456', status: 'Emitir NF' as const };
  const waiting = { ...emptyControleOrdem('empresa-teste'), id: '2', status: 'Aguardando PC' as const };
  assert.deepEqual(resumoStatusControleOrdens([legacy, waiting]), {
    'Concluído': 1,
    'Aguardando PC': 1,
  });
  assert.equal(legacy.status, 'Emitir NF');
});

test('detail categories match chart groups, including NF and custom tasks', () => {
  const row = emptyControleOrdem('empresa-teste');
  assert.equal(categoriaResumoControleOrdem({ ...row, status: 'Emitir NF', nf: 'NF-1' }), 'Concluído');
  assert.equal(categoriaResumoControleOrdem({ ...row, status: 'Outra tarefa', tarefaExtra: 'Ligar' }), 'Outra tarefa');
  assert.equal(categoriaResumoControleOrdem(row), 'Sem status');
});

test('report handles Brazilian values and generates an A4 PDF from supplied records', async () => {
  assert.equal(valorControleOrdem('R$ 1.210,50'), 1210.5);
  assert.equal(dataControleOrdem('2026-10-29'), '29/10/2026');
  const row = { ...emptyControleOrdem('empresa-teste'), id: '1', protocolo: 'OS-1', valor: '1.210,50' };
  const pdf = await gerarPDFDetalhesControleOrdens({
    empresa: 'Empresa de teste', status: 'Concluído', rows: [row], generatedAt: new Date('2026-10-29T12:00:00Z'),
  });
  assert.equal(pdf.type, 'application/pdf');
  assert.match(Buffer.from(await pdf.arrayBuffer()).subarray(0, 8).toString(), /^%PDF-/);
  assert.ok(pdf.size > 1000);
});
