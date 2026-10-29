import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OrdemDeServico } from './types';
import DashboardHome from './components/DashboardHome';
import OSDashboard from './components/OSDashboard';
import ControleOrdens, { type ControleOrdemStore } from './components/ControleOrdens';
import type { ControleOrdem } from './models/ControleOrdem';
import './index.css';

const sampleOrders: OrdemDeServico[] = [
  {
    id: 'os-001', numeroOS: 'OS-0001', dataAbertura: '2026-10-12', horaAbertura: '09:30',
    equipamento: 'Trator de demonstração', placa: 'ABC1D23', tecnico: 'Ana Souza',
    clienteNome: 'Cliente Exemplo A', status: 'Concluído', valorTotalOrcamento: 1250,
    updatedAt: '2026-10-15T12:00:00Z',
  },
  {
    id: 'os-002', numeroOS: 'OS-0002', dataAbertura: '2026-10-10', horaAbertura: '14:15',
    equipamento: 'Gerador de demonstração', placa: 'DEF4G56', tecnico: 'Bruno Lima',
    clienteNome: 'Cliente Exemplo B', status: 'Pendente', valorTotalOrcamento: 780,
    updatedAt: '2026-10-28T11:00:00Z',
  },
  {
    id: 'os-003', numeroOS: 'OS-0003', dataAbertura: '2026-10-20', horaAbertura: '08:00',
    equipamento: 'Compressor de demonstração', placa: 'HIJ7K89', tecnico: 'Carla Mendes',
    clienteNome: 'Cliente Exemplo C', status: 'Concluído', valorTotalOrcamento: 430,
    updatedAt: '2026-10-22T16:00:00Z',
  },
];

const initialControleRows: ControleOrdem[] = [
  {
    id: 'controle-1', empresaId: 'demo', data: '2026-10-28', protocolo: 'OS-0002',
    equipamento: 'Gerador de demonstração', solicitante: 'Cliente Exemplo B',
    servico: 'Revisão elétrica', valor: '780,00', pedidoCompra: 'PC-1042', frs: '',
    status: 'Aguardando PC', tarefaExtra: '', nf: '', pagamento: '2026-11-05', updatedAt: '2026-10-28T11:00:00Z',
  },
  {
    id: 'controle-2', empresaId: 'demo', data: '2026-10-22', protocolo: 'OS-0003',
    equipamento: 'Compressor de demonstração', solicitante: 'Cliente Exemplo C',
    servico: 'Troca de filtros', valor: '430,00', pedidoCompra: '', frs: 'FRS-203',
    status: 'Emitir NF', tarefaExtra: '', nf: '', pagamento: '', updatedAt: '2026-10-22T16:00:00Z',
  },
];
const DEMO_STORAGE_KEY = 'dg_controle_ordens_preview_v1';
let demoControleRows: ControleOrdem[] = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
    return Array.isArray(saved) ? saved.map(row => ({ ...row, pagamento: row.pagamento ?? '' })) : initialControleRows;
  } catch {
    return initialControleRows;
  }
})();
const demoListeners = new Set<(rows: ControleOrdem[]) => void>();
const demoControleStore: ControleOrdemStore = {
  async getAll() { return [...demoControleRows]; },
  async save(row) {
    const saved = {
      ...row, id: row.id || `controle-${crypto.randomUUID()}`,
      updatedAt: new Date().toISOString(), sincronizado: true,
    };
    demoControleRows = [...demoControleRows.filter(item => item.id !== saved.id), saved];
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoControleRows));
    demoListeners.forEach(listener => listener([...demoControleRows]));
    return saved;
  },
  listen(_empresaId, callback) {
    demoListeners.add(callback);
    return () => { demoListeners.delete(callback); };
  },
};

function PreviewApp() {
  const [view, setView] = useState<'home' | 'orders' | 'controle'>('home');
  const [orders, setOrders] = useState(sampleOrders);
  const [message, setMessage] = useState('');

  const showDemoNotice = () => setMessage('Prévia demonstrativa: nenhuma ordem real foi alterada.');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-3 text-center text-sm font-semibold text-amber-900">
        Prévia local no VS Code · Dados fictícios · Sem conexão com usuários ou produção
      </div>
      <header className="bg-[#003366] text-white px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="font-black text-lg">DG Gestão de Orçamentos</div>
            <div className="text-xs text-blue-100">Prévia das alterações solicitadas</div>
          </div>
          <button className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold hover:bg-white/25" onClick={() => setView('home')}>
            Tela inicial
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6">
        {view === 'home' ? (
          <div className="px-4 sm:px-6">
            <DashboardHome
              onNavigate={target => target === 'list' ? setView('orders') : target === 'controle_ordens' ? setView('controle') : showDemoNotice()}
              empresaId="demo"
              controleStore={demoControleStore}
              companyName="Empresa de demonstração"
            />
          </div>
        ) : view === 'controle' ? (
          <div className="px-4 sm:px-6">
            <ControleOrdens empresaId="demo" store={demoControleStore} onBack={() => setView('home')} />
          </div>
        ) : (
          <>
            <div className="px-4 sm:px-6 mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-600">A OS-0002 foi alterada por último, embora tenha sido aberta antes da OS-0003.</p>
              <button
                className="rounded-full border border-[#003366] px-4 py-2 text-xs font-bold text-[#003366] hover:bg-blue-50"
                onClick={() => setOrders(current => current.map(order => order.id === 'os-001' ? { ...order, updatedAt: new Date().toISOString() } : order))}
              >
                Simular alteração na OS-0001
              </button>
            </div>
            <OSDashboard
              orders={orders}
              onNewOS={showDemoNotice}
              onEditOS={showDemoNotice}
              onViewPDF={showDemoNotice}
              onDeleteOS={showDemoNotice}
              onDuplicateOS={showDemoNotice}
              onBack={() => setView('home')}
            />
          </>
        )}
        {message && <div role="status" className="mx-4 mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">{message}</div>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<PreviewApp />);
