import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, Save } from 'lucide-react';
import {
  ControleOrdem, STATUS_CONTROLE_ORDEM, atualizarNFControleOrdem,
  emptyControleOrdem, statusEfetivoControleOrdem, validateControleOrdem,
} from '../models/ControleOrdem';
import { ordenarControleOrdensPorData } from '../utils/controleOrdensReport';

export interface ControleOrdemStore {
  getAll(empresaId: string, userEmail?: string): Promise<ControleOrdem[]>;
  save(row: ControleOrdem, userEmail?: string): Promise<ControleOrdem>;
  listen(empresaId: string, callback: (rows: ControleOrdem[]) => void, userEmail?: string): () => void;
}

interface ControleOrdensProps {
  empresaId: string;
  userEmail?: string;
  store: ControleOrdemStore;
  onBack: () => void;
}

type EditableField = 'data' | 'protocolo' | 'equipamento' | 'solicitante' | 'servico' |
  'valor' | 'pedidoCompra' | 'frs' | 'nf' | 'pagamento' | 'tarefaExtra';

function TextCell({ row, field, label, onChange, type = 'text' }: {
  row: ControleOrdem;
  field: EditableField;
  label: string;
  onChange: (row: ControleOrdem) => void;
  type?: string;
}) {
  return (
    <input
      aria-label={`${label} ${row.id ? row.protocolo || 'sem protocolo' : 'nova linha'}`}
      type={type}
      value={row[field] ?? ''}
      title={field === 'pagamento' ? 'Data prevista para o dinheiro cair na conta' : undefined}
      onChange={event => onChange(field === 'nf'
        ? atualizarNFControleOrdem(row, event.target.value)
        : { ...row, [field]: event.target.value })}
      className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-slate-800 placeholder:text-slate-300 hover:border-slate-200 focus:border-[#FF6600] focus:bg-white focus:outline-none"
      placeholder={label}
    />
  );
}

function TableRow({ row, onChange, onSave, saving, dirty, isNew }: {
  row: ControleOrdem;
  onChange: (row: ControleOrdem) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  isNew: boolean;
}) {
  const fields: Array<[EditableField, string, string?]> = [
    ['data', 'Data', 'date'], ['protocolo', 'Protocolo'], ['equipamento', 'Equipamento'],
    ['solicitante', 'Solicitante'], ['servico', 'Serviço'], ['valor', 'Valor'],
    ['pedidoCompra', 'Pedido de compra'], ['frs', 'FRS'],
  ];

  return (
    <tr className={`border-b border-slate-200 ${isNew ? 'bg-orange-50/60' : 'bg-white hover:bg-slate-50/60'}`}>
      {fields.map(([field, label, type]) => (
        <td key={field} className="border-r border-slate-100 px-1 py-1 align-top">
          <TextCell row={row} field={field} label={label} type={type} onChange={onChange} />
        </td>
      ))}
      <td className="min-w-[190px] border-r border-slate-100 px-2 py-2 align-top">
        <select
          aria-label={`Status ${row.id ? row.protocolo || 'sem protocolo' : 'nova linha'}`}
          value={statusEfetivoControleOrdem(row)}
          disabled={Boolean(row.nf?.trim())}
          title={row.nf?.trim() ? 'A NF preenchida define o status como Concluído' : undefined}
          onChange={event => onChange({
            ...row,
            status: event.target.value as ControleOrdem['status'],
            tarefaExtra: event.target.value === 'Outra tarefa' ? row.tarefaExtra : '',
          })}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 focus:border-[#FF6600] focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
        >
          <option value="">Selecionar status</option>
          {STATUS_CONTROLE_ORDEM.map(status => <option key={status} value={status}>{status}</option>)}
          <option value="Outra tarefa">Outra tarefa…</option>
        </select>
        {row.status === 'Outra tarefa' && (
          <TextCell row={row} field="tarefaExtra" label="Descreva a tarefa" onChange={onChange} />
        )}
      </td>
      <td className="min-w-[145px] border-r border-slate-100 px-1 py-1 align-top">
        <TextCell row={row} field="nf" label="NF" onChange={onChange} />
      </td>
      <td className="min-w-[170px] px-1 py-1 align-top">
        <TextCell row={row} field="pagamento" label="Pagamento" type="date" onChange={onChange} />
        {(dirty || isNew) && (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="ml-2 mb-1 inline-flex items-center gap-1 rounded-md bg-[#003366] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#002244] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Salvando…' : 'Salvar linha'}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function ControleOrdens({ empresaId, userEmail, store, onBack }: ControleOrdensProps) {
  const [rows, setRows] = useState<ControleOrdem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ControleOrdem>>({});
  const [newRow, setNewRow] = useState(() => emptyControleOrdem(empresaId));
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setRows([]);
    setDrafts({});
    setNewRow(emptyControleOrdem(empresaId));
    if (!empresaId) {
      setMessage('Não foi possível identificar a empresa.');
      setLoading(false);
      return;
    }

    setLoading(true);
    store.getAll(empresaId, userEmail)
      .then(list => { if (active) setRows(list); })
      .catch(() => { if (active) setMessage('Não foi possível carregar o controle de ordens.'); })
      .finally(() => { if (active) setLoading(false); });
    const unsubscribe = store.listen(empresaId, list => { if (active) setRows(list); }, userEmail);
    return () => { active = false; unsubscribe(); };
  }, [empresaId, userEmail, store]);

  const orderedRows = useMemo(() => ordenarControleOrdensPorData(rows), [rows]);

  const save = async (row: ControleOrdem) => {
    const error = validateControleOrdem(row);
    if (error) { setMessage(error); return; }
    const key = row.id || 'new';
    setSavingId(key);
    setMessage('');
    try {
      const saved = await store.save({ ...row, empresaId, status: statusEfetivoControleOrdem(row) }, userEmail);
      setRows(current => [...current.filter(item => item.id !== saved.id), saved]);
      if (row.id) {
        setDrafts(current => { const next = { ...current }; delete next[row.id]; return next; });
      } else {
        setNewRow(emptyControleOrdem(empresaId));
      }
      setMessage(saved.sincronizado === false
        ? 'Linha salva neste dispositivo. A sincronização com a nuvem está pendente.'
        : 'Linha salva.');
    } catch {
      setMessage('Não foi possível salvar a linha. Os dados digitados continuam na tela.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Voltar ao início" className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded-xl bg-[#FF6600]/10 p-2.5 text-[#FF6600]"><ClipboardList className="h-6 w-6" /></div>
          <div>
            <h1 className="text-lg font-black uppercase text-[#003366]">Controle de ordens</h1>
            <p className="text-sm text-slate-500">Acompanhe orçamentos, pedidos, FRS e notas fiscais.</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} {rows.length === 1 ? 'linha' : 'linhas'}</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-[#003366]">Planilha de controle</h2>
          <p className="text-xs text-slate-500">Edite as células e clique em “Salvar linha”. A última linha inclui um novo registro. Pagamento é a data prevista de entrada na conta.</p>
        </div>
        <p className="px-4 pt-3 text-xs text-slate-500 lg:hidden">Deslize para os lados para ver todas as colunas.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[120px]" /><col className="w-[120px]" /><col className="w-[160px]" />
              <col className="w-[150px]" /><col className="w-[190px]" /><col className="w-[110px]" />
              <col className="w-[150px]" /><col className="w-[95px]" /><col className="w-[190px]" /><col className="w-[145px]" /><col className="w-[170px]" />
            </colgroup>
            <thead className="bg-[#003366] text-white">
              <tr>{['Data', 'Protocolo', 'Equipamento', 'Solicitante', 'Serviço', 'Valor', 'Pedido de compra', 'FRS', 'Status', 'NF', 'Pagamento']
                .map(title => <th key={title} scope="col" className="border-r border-white/15 px-3 py-3 text-xs font-bold">{title}</th>)}</tr>
            </thead>
            <tbody>
              {orderedRows.map(row => {
                const draft = drafts[row.id] || row;
                return <TableRow key={row.id} row={draft} dirty={Boolean(drafts[row.id])} saving={savingId === row.id}
                  onChange={next => setDrafts(current => ({ ...current, [row.id]: next }))}
                  onSave={() => save(draft)} isNew={false} />;
              })}
              <TableRow row={newRow} isNew dirty saving={savingId === 'new'} onChange={setNewRow} onSave={() => save(newRow)} />
            </tbody>
          </table>
        </div>
        {loading && <p className="px-4 py-3 text-sm text-slate-500">Carregando linhas…</p>}
      </div>
      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[#003366]">{message}</p>}
    </section>
  );
}
