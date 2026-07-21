/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  Calendar, 
  Clock, 
  Clipboard, 
  ArrowRight, 
  Settings, 
  User, 
  Plus, 
  X, 
  Search, 
  Save, 
  Sparkles,
  Gauge
} from 'lucide-react';
import { generateNextOSNumber } from '../db';
import { OrdemDeServico, Cliente } from '../types';
import { ClienteContext } from '../contexts/ClienteContext';
import { EquipamentoContext } from '../contexts/EquipamentoContext';

interface OSFormStep1Props {
  initialData?: Partial<OrdemDeServico>;
  onNext: (data: Partial<OrdemDeServico>) => void;
  onCancel: () => void;
  serviceOrders?: OrdemDeServico[];
}

export default function OSFormStep1({ initialData, onNext, onCancel, serviceOrders }: OSFormStep1Props) {
  const clienteCtx = useContext(ClienteContext);
  const { clientes, saveCliente } = clienteCtx || { clientes: [], saveCliente: async () => ({} as Cliente) };

  const equipCtx = useContext(EquipamentoContext);
  const { equipamentos } = equipCtx || { equipamentos: [] };

  const [numeroOS, setNumeroOS] = useState(initialData?.numeroOS || '');
  const [dataAbertura, setDataAbertura] = useState(() => {
    if (initialData?.dataAbertura) return initialData.dataAbertura;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [horaAbertura, setHoraAbertura] = useState(() => {
    if (initialData?.horaAbertura) return initialData.horaAbertura;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [equipamento, setEquipamento] = useState(initialData?.equipamento || '');
  const [placa, setPlaca] = useState(initialData?.placa || '');
  const [tecnico, setTecnico] = useState(initialData?.tecnico || '');
  const [loading, setLoading] = useState(false);

  // Novos campos integrados
  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [clienteNome, setClienteNome] = useState(initialData?.clienteNome || '');
  const [searchQuery, setSearchQuery] = useState(initialData?.clienteNome || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEquipDropdown, setShowEquipDropdown] = useState(false);
  const [quilometragem, setQuilometragem] = useState(initialData?.quilometragem !== undefined ? String(initialData.quilometragem) : '');
  const [horimetro, setHorimetro] = useState(initialData?.horimetro !== undefined ? String(initialData.horimetro) : '');

  // Quick Customer modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickNome, setQuickNome] = useState('');
  const [quickDoc, setQuickDoc] = useState('');
  const [quickTel, setQuickTel] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  // Automatic protocol sequence calculation on load if empty
  useEffect(() => {
    if (!numeroOS && serviceOrders) {
      setLoading(true);
      const activeTenant = initialData?.empresaId || 'emp_daniloempreendimentos';
      generateNextOSNumber(activeTenant, serviceOrders)
        .then(num => {
          setNumeroOS(num);
        })
        .finally(() => setLoading(false));
    }
  }, [numeroOS, serviceOrders]);

  // Sync search input if client changes
  useEffect(() => {
    if (clienteId) {
      const matched = clientes.find(c => c.id === clienteId);
      if (matched && matched.nome !== searchQuery) {
        setSearchQuery(matched.nome);
        setClienteNome(matched.nome);
      }
    }
  }, [clienteId, clientes]);

  const handleSelectClient = (client: Cliente) => {
    setClienteId(client.id);
    setClienteNome(client.nome);
    setSearchQuery(client.nome);
    setShowDropdown(false);
  };

  const handleClearClient = () => {
    setClienteId('');
    setClienteNome('');
    setSearchQuery('');
  };

  const handleQuilometragemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setQuilometragem(val);
  };

  const handleHorimetroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setHorimetro(val);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNome.trim()) return;

    setQuickSaving(true);
    try {
      const saved = await saveCliente({
        id: '',
        empresaId: initialData?.empresaId || 'default_tenant',
        nome: quickNome.trim(),
        documento: quickDoc.trim(),
        telefone: quickTel.trim(),
        whatsapp: quickTel.trim(),
        email: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
      });
      // Auto select the newly created customer
      setClienteId(saved.id);
      setClienteNome(saved.nome);
      setSearchQuery(saved.nome);
      setShowQuickAdd(false);
      setQuickNome('');
      setQuickDoc('');
      setQuickTel('');
    } catch (err) {
      console.error('Erro ao adicionar cliente rápido:', err);
      alert('Erro ao registrar cliente.');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroOS.trim() || !dataAbertura || !horaAbertura || !equipamento.trim() || !tecnico.trim()) {
      return;
    }
    
    onNext({
      numeroOS: numeroOS.trim(),
      dataAbertura,
      horaAbertura,
      equipamento: equipamento.trim(),
      placa: placa.trim().toUpperCase(),
      tecnico: tecnico.trim(),
      clienteId: clienteId || undefined,
      clienteNome: clienteNome || undefined,
      quilometragem: quilometragem ? Number(quilometragem) : undefined,
      horimetro: horimetro ? Number(horimetro) : undefined,
    });
  };

  // Filter clients based on search input
  const filteredClients = searchQuery.trim() === ''
    ? clientes
    : clientes.filter(c =>
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.documento.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Filter customer's equipments/vehicles for dropdown
  const clientVehicles = clienteId
    ? equipamentos.filter(eq => eq.clienteId === clienteId)
    : [];

  const filteredVehicles = clientVehicles.filter(eq => {
    const label = `${eq.tipo} ${eq.fabricante} ${eq.modelo} ${eq.placa}`.toLowerCase();
    return label.includes(equipamento.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-medium font-mono text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form id="step-1-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Alert Warning Box */}
        <div className="bg-[#003366]/5 rounded-xl p-4 border border-[#003366]/10 flex gap-3">
          <Settings className="w-5 h-5 text-[#003366] shrink-0 self-center" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-[#003366] block uppercase tracking-wider text-[11px] mb-0.5">Abertura Técnica de Atendimento</span>
            Preencha os dados do cliente, as especificações técnicas da máquina, e o responsável técnico. Os dados numéricos de telemetria são salvos no prontuário.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Protocol Number */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              <Clipboard className="w-3.5 h-3.5 text-[#003366]" />
              Nº do Protocolo <span className="text-[#FF6600] font-bold">*</span>
            </label>
            <input
              id="input-numero-os"
              type="text"
              required
              placeholder="Ex: 1024, PR-550..."
              value={numeroOS}
              onChange={(e) => setNumeroOS(e.target.value)}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono transition duration-200"
            />
            <p className="text-[10px] text-slate-400 italic">Insira o número manualmente</p>
          </div>

          {/* Date Open */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              <Calendar className="w-3.5 h-3.5 text-[#003366]" />
              Data de Abertura <span className="text-[#FF6600] font-bold">*</span>
            </label>
            <input
              id="input-data-abertura"
              type="date"
              required
              value={dataAbertura}
              onChange={(e) => setDataAbertura(e.target.value)}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
            />
          </div>

          {/* Hour Open */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              <Clock className="w-3.5 h-3.5 text-[#003366]" />
              Hora de Abertura <span className="text-[#FF6600] font-bold">*</span>
            </label>
            <input
              id="input-hora-abertura"
              type="time"
              required
              value={horaAbertura}
              onChange={(e) => setHoraAbertura(e.target.value)}
              className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono transition duration-200"
            />
          </div>
        </div>

        <div className="h-px bg-slate-100 my-4" />

        <div className="space-y-5">
          {/* CAMPO NOVO: Cliente Search AutoComplete */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center justify-between uppercase">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#003366]" />
                Cliente Responsável (Opcional)
              </span>
              <button
                id="btn-quick-new-client"
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="text-[10px] text-[#FF6600] hover:underline font-black flex items-center gap-1 normal-case tracking-normal cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                Novo Cliente
              </button>
            </label>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="input-search-client-os"
                type="text"
                placeholder="Pesquisar por nome de cliente..."
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setClienteId('');
                  setClienteNome('');
                  setShowDropdown(true);
                }}
                className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg pl-9 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearClient}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Live dropdown list */}
            {showDropdown && (
              <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-100">
                {filteredClients.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500 text-center">
                    Nenhum cliente cadastrado com esse termo.
                    <button
                      type="button"
                      onClick={() => {
                        setQuickNome(searchQuery);
                        setShowQuickAdd(true);
                        setShowDropdown(false);
                      }}
                      className="block mx-auto mt-2 text-xs text-[#FF6600] font-bold hover:underline cursor-pointer"
                    >
                      Cadastrar "{searchQuery}" como Novo Cliente
                    </button>
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between text-slate-700 transition"
                    >
                      <span className="truncate">{client.nome}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0 ml-2">
                        {client.documento || 'Sem CPF/CNPJ'}
                      </span>
                    </button>
                  ))
                )}
                <div className="p-2 bg-slate-50 text-center">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="text-[10px] text-[#003366] font-bold uppercase hover:underline cursor-pointer"
                  >
                    Fechar Lista
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Equipment Title */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              Equipamento / Máquina <span className="text-[#FF6600] font-bold">*</span>
            </label>
            <input
              id="input-equipamento"
              type="text"
              required
              placeholder="Ex: Escavadeira Hidráulica CAT 320"
              value={equipamento}
              onFocus={() => setShowEquipDropdown(true)}
              onChange={(e) => {
                setEquipamento(e.target.value);
                setShowEquipDropdown(true);
              }}
              className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-semibold"
            />
            {/* Dropdown list for Client Vehicles */}
            {showEquipDropdown && clienteId && filteredVehicles.length > 0 && (
              <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-100">
                {filteredVehicles.map((eq) => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => {
                      setEquipamento(`${eq.tipo} - ${eq.fabricante} ${eq.modelo}`.trim());
                      setPlaca(eq.placa || '');
                      if (eq.quilometragem !== undefined && eq.quilometragem !== null) {
                        setQuilometragem(String(eq.quilometragem));
                      }
                      if (eq.horimetro !== undefined && eq.horimetro !== null) {
                        setHorimetro(String(eq.horimetro));
                      }
                      setShowEquipDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between text-slate-700 transition"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{eq.tipo} - {eq.fabricante} {eq.modelo}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Série: {eq.numeroSerie || 'N/A'} {eq.patrimonio ? `| Patr: ${eq.patrimonio}` : ''}
                      </span>
                    </div>
                    <span className="bg-[#003366]/10 text-[#003366] text-[10px] font-bold font-mono px-2 py-1 rounded">
                      {eq.placa || 'SEM PLACA'}
                    </span>
                  </button>
                ))}
                <div className="p-2 bg-slate-50 text-center">
                  <button
                    type="button"
                    onClick={() => setShowEquipDropdown(false)}
                    className="text-[10px] text-[#003366] font-bold uppercase hover:underline cursor-pointer"
                  >
                    Fechar Lista
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Equipment Plate */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                Placa do Equipamento
              </label>
              <input
                id="input-placa"
                type="text"
                placeholder="Ex: ABC-1234 ou REM-55 (Opcional)"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] tracking-wider font-mono uppercase transition duration-200"
              />
            </div>

            {/* Responsible Technician */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                Técnico Responsável <span className="text-[#FF6600] font-bold">*</span>
              </label>
              <input
                id="input-tecnico"
                type="text"
                required
                placeholder="Ex: Danilo Rodrigues"
                value={tecnico}
                onChange={(e) => setTecnico(e.target.value)}
                className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
              />
            </div>
          </div>

          {/* CAMPO NOVO: Quilometragem & Horímetro Grid */}
          <div className="space-y-3 pt-2">
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex items-center justify-between">
              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                ⚠️ Preenchimento de Telemetria Solicitado
              </span>
              <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
                Recomendado
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Quilometragem (KM) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <Gauge className="w-3.5 h-3.5 text-[#003366]" />
                  Quilometragem (KM) (Opcional)
                  <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded-sm uppercase tracking-wide">Solicitado</span>
                </label>
                <input
                  id="input-quilometragem-os"
                  type="text"
                  placeholder="Ex: 55000 (Apenas números)"
                  value={quilometragem}
                  onChange={handleQuilometragemChange}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                />
              </div>

              {/* Horímetro */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <Gauge className="w-3.5 h-3.5 text-[#003366]" />
                  Horímetro (Opcional)
                  <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded-sm uppercase tracking-wide">Solicitado</span>
                </label>
                <input
                  id="input-horimetro-os"
                  type="text"
                  placeholder="Ex: 1250 (Apenas números)"
                  value={horimetro}
                  onChange={handleHorimetroChange}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons block */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <button
            id="btn-cancel-step-1"
            type="button"
            onClick={() => onCancel()}
            className="w-full sm:w-1/3 border-2 border-slate-200 text-slate-500 bg-transparent rounded-full py-3.5 font-bold tracking-widest text-[10px] uppercase hover:bg-slate-50 active:scale-98 transition duration-200 cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            id="btn-next-step-1"
            type="submit"
            className="w-full sm:w-2/3 bg-[#FF6600] text-white rounded-full py-3.5 px-6 font-bold tracking-[0.12em] text-[10px] uppercase shadow-lg shadow-[#FF6600]/25 hover:bg-[#E05500] active:scale-[0.99] flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
          >
            <span>Próxima Etapa</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>

      {/* Quick Add Customer Modal Dialog */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF6600]" />
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-tight">Cadastro Rápido de Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Danilo Rodrigues"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">CPF ou CNPJ (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: 123.456.789-00"
                  value={quickDoc}
                  onChange={(e) => setQuickDoc(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase">Celular / Whats (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: (73) 99907-0117"
                  value={quickTel}
                  onChange={(e) => setQuickTel(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white font-bold px-4 py-2 rounded-lg text-[10px] uppercase cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {quickSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
