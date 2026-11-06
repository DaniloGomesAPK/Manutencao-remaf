import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ClipboardList, Download, Save, Search } from 'lucide-react';
import {
  ControleOrdem, STATUS_CONTROLE_ORDEM, atualizarNFControleOrdem, categoriaResumoControleOrdem,
  emptyControleOrdem, statusEfetivoControleOrdem, validateControleOrdem,
} from '../models/ControleOrdem';
import { FILTROS_INICIAIS_CONTROLE_ORDENS, filtrarOrdenarControleOrdens, type FiltrosControleOrdens } from '../utils/controleOrdensFilters';

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
  const update = (value: string) => onChange(field === 'nf'
    ? atualizarNFControleOrdem(row, value)
    : { ...row, [field]: value });
  const className = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FF6600] focus:outline-none focus:ring-1 focus:ring-[#FF6600]';
  if (field === 'servico' || field === 'tarefaExtra') {
    return <textarea
      aria-label={`${label} ${row.id ? row.protocolo || 'sem protocolo' : 'nova linha'}`}
      value={row[field] ?? ''}
      rows={2}
      onChange={event => update(event.target.value)}
      className={`${className} resize-y`}
      placeholder={label}
    />;
  }
  return (
    <input
      aria-label={`${label} ${row.id ? row.protocolo || 'sem protocolo' : 'nova linha'}`}
      type={type}
      value={row[field] ?? ''}
      title={field === 'pagamento' ? 'Data prevista para o dinheiro cair na conta' : undefined}
      onChange={event => update(event.target.value)}
      className={className}
      placeholder={label}
    />
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block min-w-0 space-y-1 ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="block text-xs font-bold text-slate-600">{label}</span>
    {children}
  </label>;
}

function OrderCard({ row, onChange, onSave, saving, dirty, isNew }: {
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
    <article className={`min-w-0 rounded-xl border p-4 shadow-xs ${isNew ? 'border-orange-200 bg-orange-50/50' : 'border-slate-200 bg-white'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-words text-sm font-black text-[#003366]">{isNew ? 'Novo registro' : row.protocolo?.trim() || row.equipamento?.trim() || 'Registro sem protocolo'}</h3>
        {!isNew && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{categoriaResumoControleOrdem(row)}</span>}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {fields.map(([field, label, type]) => (
          <Field key={field} label={label} wide={field === 'servico'}>
            <TextCell row={row} field={field} label={label} type={type} onChange={onChange} />
          </Field>
        ))}
        <Field label="Status">
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
          className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#FF6600] focus:outline-none disabled:bg-slate-100 disabled:text-slate-600"
        >
          <option value="">Selecionar status</option>
          {STATUS_CONTROLE_ORDEM.map(status => <option key={status} value={status}>{status}</option>)}
          <option value="Outra tarefa">Outra tarefa…</option>
        </select>
        </Field>
        {row.status === 'Outra tarefa' && <Field label="Tarefa adicional" wide>
          <TextCell row={row} field="tarefaExtra" label="Descreva a tarefa" onChange={onChange} />
        </Field>}
        <Field label="NF"><TextCell row={row} field="nf" label="NF" onChange={onChange} /></Field>
        <Field label="Pagamento previsto"><TextCell row={row} field="pagamento" label="Pagamento" type="date" onChange={onChange} /></Field>
      </div>
      {(dirty || isNew) && <div className="mt-4 flex justify-end">
        <button type="button" disabled={saving} onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#003366] px-4 py-2 text-sm font-bold text-white hover:bg-[#002244] disabled:opacity-50">
          <Save className="h-4 w-4" />{saving ? 'Salvando…' : isNew ? 'Adicionar registro' : 'Salvar registro'}
        </button>
      </div>}
    </article>
  );
}

export default function ControleOrdens({ empresaId, userEmail, store, onBack }: ControleOrdensProps) {
  const [rows, setRows] = useState<ControleOrdem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ControleOrdem>>({});
  const [newRow, setNewRow] = useState(() => emptyControleOrdem(empresaId));
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [filtros, setFiltros] = useState<FiltrosControleOrdens>(FILTROS_INICIAIS_CONTROLE_ORDENS);
  const [showNewForm, setShowNewForm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const updateFilter = <K extends keyof FiltrosControleOrdens>(key: K, value: FiltrosControleOrdens[K]) => {
    setFiltros(current => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let active = true;
    setRows([]);
    setDrafts({});
    setNewRow(emptyControleOrdem(empresaId));
    setShowNewForm(false);
    setFiltros(FILTROS_INICIAIS_CONTROLE_ORDENS);
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

  const visibleRows = useMemo(() => filtrarOrdenarControleOrdens(rows, filtros), [rows, filtros]);

  const exportExcel = async () => {
    if (!visibleRows.length || exporting) return;
    setExporting(true);
    setMessage('');
    try {
      const { exportarControleOrdensExcel } = await import('../utils/controleOrdensExcel');
      exportarControleOrdensExcel(visibleRows);
    } catch {
      setMessage('Não foi possível gerar o arquivo Excel. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

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
        setShowNewForm(false);
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
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{rows.length} {rows.length === 1 ? 'registro' : 'registros'}</span>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-sm font-bold text-[#003366]">Controle de registros</h2>
          <p className="mt-1 text-xs text-slate-500">Edite os campos e salve o registro. Pagamento é a data prevista de entrada na conta.</p>
        </div>
        <div role="search" aria-label="Filtrar ordens" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="block min-w-0 space-y-1 xl:col-span-2">
            <span className="block text-xs font-bold text-slate-600">Buscar</span>
            <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={filtros.busca} onChange={event => updateFilter('busca', event.target.value)}
                placeholder="Protocolo, equipamento, solicitante…"
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#FF6600] focus:outline-none" />
            </span>
          </label>
          <Field label="Status">
            <select value={filtros.status} onChange={event => updateFilter('status', event.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#FF6600] focus:outline-none">
              <option value="">Todos os status</option>
              {STATUS_CONTROLE_ORDEM.map(status => <option key={status} value={status}>{status}</option>)}
              <option value="Outra tarefa">Outra tarefa</option>
              <option value="Sem status">Sem status</option>
            </select>
          </Field>
          <Field label="Data inicial"><input type="date" value={filtros.dataInicio} onChange={event => updateFilter('dataInicio', event.target.value)}
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#FF6600] focus:outline-none" /></Field>
          <Field label="Data final"><input type="date" value={filtros.dataFim} onChange={event => updateFilter('dataFim', event.target.value)}
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#FF6600] focus:outline-none" /></Field>
          <Field label="Ordenar por">
            <select value={filtros.ordenacao} onChange={event => updateFilter('ordenacao', event.target.value as FiltrosControleOrdens['ordenacao'])}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#FF6600] focus:outline-none">
              <option value="data-recente">Data: mais recente</option>
              <option value="data-antiga">Data: mais antiga</option>
              <option value="valor-maior">Valor: maior primeiro</option>
              <option value="valor-menor">Valor: menor primeiro</option>
              <option value="protocolo">Protocolo</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span role="status">{visibleRows.length} de {rows.length} {rows.length === 1 ? 'registro' : 'registros'} exibidos</span>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setFiltros(FILTROS_INICIAIS_CONTROLE_ORDENS)}
              className="font-bold text-[#003366] hover:underline focus:outline-none focus:ring-2 focus:ring-[#003366]">Limpar filtros</button>
            <button type="button" onClick={exportExcel} disabled={loading || !visibleRows.length || exporting}
              title="Exporta os registros salvos que aparecem com os filtros atuais"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#003366] px-3 py-2 font-bold text-[#003366] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#FF6600] disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />{exporting ? 'Gerando Excel…' : 'Exportar Excel'}
            </button>
            <button type="button" onClick={() => setShowNewForm(value => !value)} aria-expanded={showNewForm} aria-controls="novo-registro-controle"
              className="rounded-lg bg-[#003366] px-3 py-2 font-bold text-white hover:bg-[#002244] focus:outline-none focus:ring-2 focus:ring-[#FF6600]">
              {showNewForm ? 'Ocultar novo registro' : 'Novo registro'}
            </button>
          </div>
        </div>
      </div>

      {showNewForm && <div id="novo-registro-controle">
        <OrderCard row={newRow} isNew dirty saving={savingId === 'new'} onChange={setNewRow} onSave={() => save(newRow)} />
      </div>}
      {loading && <p className="text-sm text-slate-500">Carregando registros…</p>}
      {!loading && visibleRows.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Nenhum registro encontrado com estes filtros.</p>}
      <div className="space-y-3">
        {visibleRows.map(row => {
          const draft = drafts[row.id] || row;
          return <OrderCard key={row.id} row={draft} dirty={Boolean(drafts[row.id])} saving={savingId === row.id}
            onChange={next => setDrafts(current => ({ ...current, [row.id]: next }))}
            onSave={() => save(draft)} isNew={false} />;
        })}
      </div>
      {message && <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-[#003366]">{message}</p>}
    </section>
  );
}
