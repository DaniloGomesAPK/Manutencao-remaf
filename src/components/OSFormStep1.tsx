/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Clipboard, 
  Settings, 
  User, 
  Plus, 
  X, 
  Search, 
  Gauge,
  Building2,
  HardHat,
  MapPin,
  Cpu,
  Factory,
  Layers,
  HelpCircle
} from 'lucide-react';
import { generateNextOSNumber } from '../db';
import { OrdemDeServico, Cliente } from '../types';
import { ClienteContext } from '../contexts/ClienteContext';
import { EquipamentoContext } from '../contexts/EquipamentoContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import {
  isCampoVisivel,
  isCampoObrigatorio,
  getCampoLabel,
  getCampoPlaceholder,
  getCampoTooltip,
  getCampoValidationMessage
} from '../config/perfis';
import { applySmartFocus } from '../utils/navigationState';

interface OSFormStep1Props {
  initialData?: Partial<OrdemDeServico>;
  onNext: (data: Partial<OrdemDeServico>) => void;
  onCancel: () => void;
  serviceOrders?: OrdemDeServico[];
}

export default function OSFormStep1({ initialData, onNext, onCancel, serviceOrders }: OSFormStep1Props) {
  const { perfilConfig } = useEmpresa();

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
  const [tecnico, setTecnico] = useState(initialData?.tecnico || '');
  const [loading, setLoading] = useState(false);

  // Profile-aware state fields
  const [equipamento, setEquipamento] = useState(initialData?.equipamento || '');
  const [placa, setPlaca] = useState(initialData?.placa || '');
  const [chassi, setChassi] = useState(initialData?.chassi || '');
  const [modelo, setModelo] = useState(initialData?.modelo || '');
  const [fabricante, setFabricante] = useState(initialData?.fabricante || '');
  const [numeroSerie, setNumeroSerie] = useState(initialData?.numeroSerie || '');
  const [patrimonio, setPatrimonio] = useState(initialData?.patrimonio || '');
  const [localObra, setLocalObra] = useState(initialData?.localObra || '');
  const [responsavelObra, setResponsavelObra] = useState(initialData?.responsavelObra || '');
  const [setor, setSetor] = useState(initialData?.setor || '');
  const [linhaProducao, setLinhaProducao] = useState(initialData?.linhaProducao || '');
  const [quilometragem, setQuilometragem] = useState(initialData?.quilometragem !== undefined ? String(initialData.quilometragem) : '');
  const [horimetro, setHorimetro] = useState(initialData?.horimetro !== undefined ? String(initialData.horimetro) : '');

  // Integrated Customer states
  const [clienteId, setClienteId] = useState(initialData?.clienteId || '');
  const [clienteNome, setClienteNome] = useState(initialData?.clienteNome || '');
  const [searchQuery, setSearchQuery] = useState(initialData?.clienteNome || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEquipDropdown, setShowEquipDropdown] = useState(false);

  // Quick Customer modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickNome, setQuickNome] = useState('');
  const [quickDoc, setQuickDoc] = useState('');
  const [quickTel, setQuickTel] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applySmartFocus(firstInputRef.current);
  }, []);

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

    if (!numeroOS.trim() || !dataAbertura || !horaAbertura || !tecnico.trim()) {
      alert("Por favor, preencha os dados do cabeçalho do documento.");
      return;
    }

    // Dynamic validations based on perfilConfig
    if (isCampoObrigatorio(perfilConfig, 'cliente') && !clienteId && !clienteNome.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'cliente'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'equipamento') && !equipamento.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'equipamento'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'placa') && !placa.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'placa'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'patrimonio') && !patrimonio.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'patrimonio'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'localObra') && !localObra.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'localObra'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'responsavelObra') && !responsavelObra.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'responsavelObra'));
      return;
    }
    if (isCampoObrigatorio(perfilConfig, 'setor') && !setor.trim()) {
      alert(getCampoValidationMessage(perfilConfig, 'setor'));
      return;
    }

    onNext({
      numeroOS: numeroOS.trim(),
      dataAbertura,
      horaAbertura,
      tecnico: tecnico.trim(),
      clienteId: clienteId || undefined,
      clienteNome: clienteNome || undefined,
      equipamento: equipamento.trim(),
      placa: isCampoVisivel(perfilConfig, 'placa') ? placa.trim().toUpperCase() : '',
      chassi: isCampoVisivel(perfilConfig, 'chassi') ? chassi.trim() : '',
      modelo: isCampoVisivel(perfilConfig, 'modelo') ? modelo.trim() : '',
      fabricante: isCampoVisivel(perfilConfig, 'fabricante') ? fabricante.trim() : '',
      numeroSerie: isCampoVisivel(perfilConfig, 'numeroSerie') ? numeroSerie.trim() : '',
      patrimonio: isCampoVisivel(perfilConfig, 'patrimonio') ? patrimonio.trim() : '',
      localObra: isCampoVisivel(perfilConfig, 'localObra') ? localObra.trim() : '',
      responsavelObra: isCampoVisivel(perfilConfig, 'responsavelObra') ? responsavelObra.trim() : '',
      setor: isCampoVisivel(perfilConfig, 'setor') ? setor.trim() : '',
      linhaProducao: isCampoVisivel(perfilConfig, 'linhaProducao') ? linhaProducao.trim() : '',
      quilometragem: isCampoVisivel(perfilConfig, 'quilometragem') && quilometragem ? Number(quilometragem) : undefined,
      horimetro: isCampoVisivel(perfilConfig, 'horimetro') && horimetro ? Number(horimetro) : undefined,
    });
  };

  // Filter clients based on search input
  const filteredClients = searchQuery.trim() === ''
    ? clientes
    : clientes.filter(c =>
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.documento.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Filter customer's assets for dropdown
  const clientAssets = clienteId
    ? equipamentos.filter(eq => eq.clienteId === clienteId)
    : [];

  const filteredAssets = clientAssets.filter(eq => {
    const label = `${eq.tipo} ${eq.fabricante} ${eq.modelo} ${eq.placa || ''} ${eq.numeroSerie || ''}`.toLowerCase();
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
        {/* Banner descritivo adaptado ao perfil */}
        <div className="bg-[#003366]/5 rounded-xl p-4 border border-[#003366]/10 flex gap-3">
          <Settings className="w-5 h-5 text-[#003366] shrink-0 self-center" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-[#003366] block uppercase tracking-wider text-[11px] mb-0.5">
              Abertura de {perfilConfig.labels.ordemServico}
            </span>
            Preencha as informações de atendimento referentes a {perfilConfig.labels.equipamento.toLowerCase()} e ao responsável técnico do serviço.
          </div>
        </div>

        {/* Cabeçalho Fixo da OS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Número do documento */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              <Clipboard className="w-3.5 h-3.5 text-[#003366]" />
              Nº de Protocolo <span className="text-[#FF6600] font-bold">*</span>
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
          </div>

          {/* Data de Abertura */}
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

          {/* Hora de Abertura */}
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

        {/* Renderização dinâmica dos campos com base no Perfil da Empresa */}
        <div className="space-y-5">
          {/* CLIENTE */}
          {isCampoVisivel(perfilConfig, 'cliente') && (
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center justify-between uppercase">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#003366]" />
                  {getCampoLabel(perfilConfig, 'cliente')}
                  {isCampoObrigatorio(perfilConfig, 'cliente') && <span className="text-[#FF6600] font-bold">*</span>}
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
                  ref={firstInputRef}
                  id="input-search-client-os"
                  type="text"
                  placeholder={getCampoPlaceholder(perfilConfig, 'cliente', 'Pesquisar cliente...')}
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

              {/* Dropdown de clientes */}
              {showDropdown && (
                <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-100">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center">
                      Nenhum cliente encontrado.
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
                          {client.documento || 'Sem documento'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* EQUIPAMENTO */}
          {isCampoVisivel(perfilConfig, 'equipamento') && (
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                {getCampoLabel(perfilConfig, 'equipamento')}
                {isCampoObrigatorio(perfilConfig, 'equipamento') && <span className="text-[#FF6600] font-bold">*</span>}
              </label>
              <input
                id="input-equipamento"
                type="text"
                required={isCampoObrigatorio(perfilConfig, 'equipamento')}
                placeholder={getCampoPlaceholder(perfilConfig, 'equipamento')}
                value={equipamento}
                onFocus={() => setShowEquipDropdown(true)}
                onChange={(e) => {
                  setEquipamento(e.target.value);
                  setShowEquipDropdown(true);
                }}
                className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-semibold"
              />
              {/* Dropdown para ativos vinculados do cliente */}
              {showEquipDropdown && clienteId && filteredAssets.length > 0 && (
                <div className="absolute z-20 w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-100">
                  {filteredAssets.map((eq) => (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => {
                        setEquipamento(`${eq.tipo} - ${eq.fabricante} ${eq.modelo}`.trim());
                        if (eq.placa) setPlaca(eq.placa);
                        if (eq.chassi) setChassi(eq.chassi);
                        if (eq.modelo) setModelo(eq.modelo);
                        if (eq.fabricante) setFabricante(eq.fabricante);
                        if (eq.numeroSerie) setNumeroSerie(eq.numeroSerie);
                        if (eq.patrimonio) setPatrimonio(eq.patrimonio);
                        if (eq.localObra) setLocalObra(eq.localObra);
                        if (eq.responsavelObra) setResponsavelObra(eq.responsavelObra);
                        if (eq.setor) setSetor(eq.setor);
                        if (eq.linhaProducao) setLinhaProducao(eq.linhaProducao);
                        if (eq.quilometragem !== undefined && eq.quilometragem !== null) setQuilometragem(String(eq.quilometragem));
                        if (eq.horimetro !== undefined && eq.horimetro !== null) setHorimetro(String(eq.horimetro));
                        setShowEquipDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between text-slate-700 transition"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{eq.tipo} - {eq.fabricante} {eq.modelo}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {eq.placa ? `Placa: ${eq.placa} | ` : ''}
                          {eq.localObra ? `Obra: ${eq.localObra} | ` : ''}
                          Série: {eq.numeroSerie || 'N/A'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GRID DINÂMICO PARA OUTROS CAMPOS VISÍVEIS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* LOCAL DA OBRA (Especial para Construção Civil e Energia Solar) */}
            {isCampoVisivel(perfilConfig, 'localObra') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-[#003366]" />
                  {getCampoLabel(perfilConfig, 'localObra')}
                  {isCampoObrigatorio(perfilConfig, 'localObra') && <span className="text-[#FF6600] font-bold">*</span>}
                  {getCampoTooltip(perfilConfig, 'localObra') && (
                    <span className="text-slate-400 font-normal normal-case text-[9px] italic" title={getCampoTooltip(perfilConfig, 'localObra')}>
                      ({getCampoTooltip(perfilConfig, 'localObra')})
                    </span>
                  )}
                </label>
                <input
                  id="input-local-obra"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'localObra')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'localObra')}
                  value={localObra}
                  onChange={(e) => setLocalObra(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* RESPONSÁVEL PELA OBRA (Especial para Construção Civil) */}
            {isCampoVisivel(perfilConfig, 'responsavelObra') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <HardHat className="w-3.5 h-3.5 text-[#003366]" />
                  {getCampoLabel(perfilConfig, 'responsavelObra')}
                  {isCampoObrigatorio(perfilConfig, 'responsavelObra') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-responsavel-obra"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'responsavelObra')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'responsavelObra')}
                  value={responsavelObra}
                  onChange={(e) => setResponsavelObra(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* PLACA */}
            {isCampoVisivel(perfilConfig, 'placa') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'placa')}
                  {isCampoObrigatorio(perfilConfig, 'placa') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-placa"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'placa')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'placa')}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono uppercase tracking-wider transition duration-200"
                />
              </div>
            )}

            {/* CHASSI */}
            {isCampoVisivel(perfilConfig, 'chassi') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'chassi')}
                  {isCampoObrigatorio(perfilConfig, 'chassi') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-chassi"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'chassi')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'chassi')}
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono uppercase transition duration-200"
                />
              </div>
            )}

            {/* NÚMERO DE SÉRIE */}
            {isCampoVisivel(perfilConfig, 'numeroSerie') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'numeroSerie')}
                  {isCampoObrigatorio(perfilConfig, 'numeroSerie') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-numero-serie"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'numeroSerie')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'numeroSerie')}
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono uppercase transition duration-200"
                />
              </div>
            )}

            {/* PATRIMÔNIO */}
            {isCampoVisivel(perfilConfig, 'patrimonio') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'patrimonio')}
                  {isCampoObrigatorio(perfilConfig, 'patrimonio') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-patrimonio"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'patrimonio')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'patrimonio')}
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono uppercase transition duration-200"
                />
              </div>
            )}

            {/* SETOR */}
            {isCampoVisivel(perfilConfig, 'setor') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <Building2 className="w-3.5 h-3.5 text-[#003366]" />
                  {getCampoLabel(perfilConfig, 'setor')}
                  {isCampoObrigatorio(perfilConfig, 'setor') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-setor"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'setor')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'setor')}
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* LINHA DE PRODUÇÃO */}
            {isCampoVisivel(perfilConfig, 'linhaProducao') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <Factory className="w-3.5 h-3.5 text-[#003366]" />
                  {getCampoLabel(perfilConfig, 'linhaProducao')}
                  {isCampoObrigatorio(perfilConfig, 'linhaProducao') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-linha-producao"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'linhaProducao')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'linhaProducao')}
                  value={linhaProducao}
                  onChange={(e) => setLinhaProducao(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* FABRICANTE */}
            {isCampoVisivel(perfilConfig, 'fabricante') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'fabricante')}
                  {isCampoObrigatorio(perfilConfig, 'fabricante') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-fabricante"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'fabricante')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'fabricante')}
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* MODELO */}
            {isCampoVisivel(perfilConfig, 'modelo') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  {getCampoLabel(perfilConfig, 'modelo')}
                  {isCampoObrigatorio(perfilConfig, 'modelo') && <span className="text-[#FF6600] font-bold">*</span>}
                </label>
                <input
                  id="input-modelo"
                  type="text"
                  required={isCampoObrigatorio(perfilConfig, 'modelo')}
                  placeholder={getCampoPlaceholder(perfilConfig, 'modelo')}
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            )}

            {/* TÉCNICO RESPONSÁVEL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                {perfilConfig.labels.tecnico} <span className="text-[#FF6600] font-bold">*</span>
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

          {/* TELEMETRIA OPCIONAL (QUILOMETRAGEM / HORÍMETRO) SE VISÍVEL */}
          {(isCampoVisivel(perfilConfig, 'quilometragem') || isCampoVisivel(perfilConfig, 'horimetro')) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {isCampoVisivel(perfilConfig, 'quilometragem') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Gauge className="w-3.5 h-3.5 text-[#003366]" />
                    {getCampoLabel(perfilConfig, 'quilometragem')}
                    {isCampoObrigatorio(perfilConfig, 'quilometragem') && <span className="text-[#FF6600] font-bold">*</span>}
                  </label>
                  <input
                    id="input-quilometragem-os"
                    type="text"
                    required={isCampoObrigatorio(perfilConfig, 'quilometragem')}
                    placeholder={getCampoPlaceholder(perfilConfig, 'quilometragem', 'Ex: 55000')}
                    value={quilometragem}
                    onChange={(e) => setQuilometragem(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono transition duration-200"
                  />
                </div>
              )}

              {isCampoVisivel(perfilConfig, 'horimetro') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Gauge className="w-3.5 h-3.5 text-[#003366]" />
                    {getCampoLabel(perfilConfig, 'horimetro')}
                    {isCampoObrigatorio(perfilConfig, 'horimetro') && <span className="text-[#FF6600] font-bold">*</span>}
                  </label>
                  <input
                    id="input-horimetro-os"
                    type="text"
                    required={isCampoObrigatorio(perfilConfig, 'horimetro')}
                    placeholder={getCampoPlaceholder(perfilConfig, 'horimetro', 'Ex: 1200')}
                    value={horimetro}
                    onChange={(e) => setHorimetro(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50/50 text-slate-800 border border-slate-200 rounded-lg px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono transition duration-200"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="btn-next-step1"
            type="submit"
            className="bg-[#003366] hover:bg-[#002244] text-white px-7 py-3 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
          >
            Avançar para Registros
            <X className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </form>

      {/* MODAL DE CADASTRO RÁPIDO DE CLIENTE */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-[#003366]" />
                Cadastro Rápido de Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:border-[#003366] focus:outline-none"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={quickDoc}
                    onChange={(e) => setQuickDoc(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:border-[#003366] focus:outline-none"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={quickTel}
                    onChange={(e) => setQuickTel(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs font-mono focus:border-[#003366] focus:outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickSaving}
                  className="bg-[#003366] text-white px-5 py-2 text-xs font-bold rounded-lg hover:bg-[#002244] disabled:opacity-50"
                >
                  {quickSaving ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
