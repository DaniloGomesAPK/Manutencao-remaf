/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useEffect } from 'react';
import { 
  Car, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  Save, 
  User, 
  FileText, 
  ArrowLeft,
  Settings,
  Grid,
  Info,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { EquipamentoContext } from '../contexts/EquipamentoContext';
import { ClienteContext } from '../contexts/ClienteContext';
import { Equipamento } from '../types';
import * as XLSX from 'xlsx';
import EquipamentoImportExport from '../components/EquipamentoImportExport';

interface CadastroEquipamentosProps {
  onBack?: () => void;
}

export default function CadastroEquipamentos({ onBack }: CadastroEquipamentosProps) {
  const equipCtx = useContext(EquipamentoContext);
  const clienteCtx = useContext(ClienteContext);

  const { equipamentos, isLoadingEquipamentos, saveEquipamento, deleteEquipamento, reloadEquipamentos } = equipCtx || {
    equipamentos: [],
    isLoadingEquipamentos: false,
    saveEquipamento: async () => ({} as Equipamento),
    deleteEquipamento: async () => {},
    reloadEquipamentos: async () => {},
  };

  const { clientes } = clienteCtx || { clientes: [] };

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEquipamentos, setFilteredEquipamentos] = useState<Equipamento[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // --- DOWNLOAD TEMPLATE EXCEL ---
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          "Cliente": "Exemplo Danilo Empreendimentos",
          "Tipo de Equipamento": "Carro",
          "Fabricante": "Toyota",
          "Modelo": "Corolla Altis",
          "Placa / Identificação": "ABC1D23"
        },
        {
          "Cliente": "Exemplo Metalúrgica Silva",
          "Tipo de Equipamento": "Caminhão",
          "Fabricante": "Volvo",
          "Modelo": "FH 540",
          "Placa / Identificação": "XYZ9E87"
        }
      ];

      const wsTemplate = XLSX.utils.json_to_sheet(templateData);
      wsTemplate['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 22 }
      ];

      const instructionsData = [
        { "Instrução": "REGRAS IMPORTANTES PARA PREENCHIMENTO DA PLANILHA", "Detalhe": "" },
        { "Instrução": "1. Campos de preenchimento obrigatório:", "Detalhe": "Cliente, Tipo de Equipamento, Fabricante, Modelo. A Placa / Identificação é opcional." },
        { "Instrução": "2. Cliente", "Detalhe": "Nome do cliente do equipamento. Se o cliente não existir no sistema, ele será criado automaticamente com este nome." },
        { "Instrução": "3. Tipo de Equipamento", "Detalhe": "Ex: Carro, Caminhão, Empilhadeira, Trator, Gerador, Ar Condicionado." },
        { "Instrução": "4. Fabricante", "Detalhe": "Ex: Toyota, Volvo, Caterpillar, Scania, Komatsu, etc." },
        { "Instrução": "5. Modelo", "Detalhe": "Ex: Corolla, FH 540, D6T, Hilux, etc." },
        { "Instrução": "6. Placa / Identificação (Opcional)", "Detalhe": "Chave de identificação opcional. Se preenchida, deve ser única para cada equipamento para evitar duplicados." },
        { "Instrução": "7. Não altere o cabeçalho", "Detalhe": "Mantenha a primeira linha da planilha exatamente com os nomes originais das colunas." }
      ];

      const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
      wsInstructions['!cols'] = [
        { wch: 45 },
        { wch: 75 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsTemplate, "Equipamentos");
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

      XLSX.writeFile(wb, "Modelo_Importacao_Equipamentos.xlsx");
    } catch (err) {
      console.error('Erro ao baixar modelo:', err);
      alert('Falha ao gerar o modelo de planilha Excel.');
    }
  };

  // --- EXPORT CURRENT BASE ---
  const handleExportEquipamentos = () => {
    try {
      if (equipamentos.length === 0) {
        alert("Não há equipamentos cadastrados para exportar.");
        return;
      }

      const exportData = equipamentos.map(e => ({
        "Cliente": e.clienteNome || "Sem Cliente",
        "Tipo de Equipamento": e.tipo || "",
        "Fabricante": e.fabricante || "",
        "Modelo": e.modelo || "",
        "Placa / Identificação": e.placa || ""
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 22 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Equipamentos");

      XLSX.writeFile(wb, `Exportacao_Equipamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Erro ao exportar base:', err);
      alert('Falha ao exportar a base de equipamentos.');
    }
  };

  // Form Fields
  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [placa, setPlaca] = useState('');
  const [chassi, setChassi] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [quilometragem, setQuilometragem] = useState<number | ''>('');
  const [horimetro, setHorimetro] = useState<number | ''>('');
  const [observacoes, setObservacoes] = useState('');

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEquipamentos(equipamentos);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = equipamentos.filter(e => 
        (e.placa && e.placa.toLowerCase().includes(term)) ||
        (e.chassi && e.chassi.toLowerCase().includes(term)) ||
        (e.numeroSerie && e.numeroSerie.toLowerCase().includes(term)) ||
        (e.clienteNome && e.clienteNome.toLowerCase().includes(term)) ||
        (e.tipo && e.tipo.toLowerCase().includes(term)) ||
        (e.fabricante && e.fabricante.toLowerCase().includes(term)) ||
        (e.modelo && e.modelo.toLowerCase().includes(term))
      );
      setFilteredEquipamentos(filtered);
    }
  }, [searchTerm, equipamentos]);

  const handleOpenCreate = () => {
    setSelectedEquipamento(null);
    setClienteId('');
    setTipo('');
    setFabricante('');
    setModelo('');
    setAno('');
    setPlaca('');
    setChassi('');
    setNumeroSerie('');
    setPatrimonio('');
    setQuilometragem('');
    setHorimetro('');
    setObservacoes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (eq: Equipamento) => {
    setSelectedEquipamento(eq);
    setClienteId(eq.clienteId || '');
    setTipo(eq.tipo || '');
    setFabricante(eq.fabricante || '');
    setModelo(eq.modelo || '');
    setAno(eq.ano || '');
    setPlaca(eq.placa || '');
    setChassi(eq.chassi || '');
    setNumeroSerie(eq.numeroSerie || '');
    setPatrimonio(eq.patrimonio || '');
    setQuilometragem(eq.quilometragem !== undefined ? eq.quilometragem : '');
    setHorimetro(eq.horimetro !== undefined ? eq.horimetro : '');
    setObservacoes(eq.observacoes || '');
    setIsFormOpen(true);
  };

  const handleOpenView = (eq: Equipamento) => {
    setSelectedEquipamento(eq);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: string, identificacao: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o equipamento "${identificacao}"?`)) {
      try {
        await deleteEquipamento(id);
      } catch (err) {
        console.error('Erro ao excluir equipamento:', err);
        alert('Não foi possível excluir o equipamento.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Equipamento = {
      id: selectedEquipamento?.id || '',
      empresaId: selectedEquipamento?.empresaId || '',
      clienteId,
      tipo: tipo.trim() || 'Equipamento',
      fabricante: fabricante.trim() || 'Não Informado',
      modelo: modelo.trim() || 'Não Informado',
      ano,
      placa: placa.toUpperCase(),
      chassi: chassi.toUpperCase(),
      numeroSerie: numeroSerie.trim() || 'S/N',
      patrimonio,
      quilometragem: quilometragem !== '' ? Number(quilometragem) : undefined,
      horimetro: horimetro !== '' ? Number(horimetro) : undefined,
      observacoes,
      createdAt: selectedEquipamento?.createdAt,
    };

    try {
      await saveEquipamento(payload);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Erro ao salvar equipamento:', err);
      alert('Erro ao salvar os dados do equipamento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-equipamentos"
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <Car className="w-5 h-5 text-[#FF6600]" />
              Cadastro de Equipamentos
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gerencie frotas, máquinas e ativos vinculados a cada cliente do sistema.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-start sm:justify-end">
          <button
            id="btn-new-equipamento"
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 bg-[#FF6600] hover:bg-[#e05900] active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Equipamento</span>
          </button>
          
          <button
            id="btn-import-excel-equipamentos"
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-[#003366] hover:bg-[#002244] active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Ativos</span>
          </button>

          <button
            id="btn-export-excel-equipamentos"
            type="button"
            onClick={handleExportEquipamentos}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>

          <button
            id="btn-download-template-equipamentos"
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
            title="Baixar Planilha Modelo Oficial"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FF6600]" />
            <span>Modelo Excel</span>
          </button>
        </div>
      </div>

      {/* Main List view */}
      {!isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                id="input-search-equipamentos"
                type="text"
                placeholder="Pesquisar por Placa, Chassi, Série, Cliente, Tipo, Marca ou Modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 shadow-xs"
              />
            </div>
          </div>

          {isLoadingEquipamentos ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando equipamentos...</p>
            </div>
          ) : filteredEquipamentos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-800 font-bold text-sm">Nenhum equipamento encontrado</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                {searchTerm ? 'Nenhum resultado corresponde à sua pesquisa. Experimente outro termo.' : 'Adicione seu primeiro equipamento faturado clicando em "Novo Equipamento" acima.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-6 py-4">Equipamento / Modelo</th>
                      <th className="px-6 py-4">Cliente Responsável</th>
                      <th className="px-6 py-4">Placa / Série</th>
                      <th className="px-6 py-4">KM / Horas</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredEquipamentos.map((eq) => (
                      <tr key={eq.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="block font-bold text-slate-900">{eq.tipo}</span>
                            <span className="block text-[10px] text-slate-500">{eq.fabricante} {eq.modelo} ({eq.ano || '-'})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {eq.clienteNome || 'Carregando...'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            {eq.placa && (
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700 font-mono tracking-widest border border-slate-200">
                                {eq.placa}
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400 font-mono">Série: {eq.numeroSerie}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-slate-500 font-medium">
                            {eq.quilometragem !== undefined && <span className="block">KM: {eq.quilometragem}</span>}
                            {eq.horimetro !== undefined && <span className="block">HR: {eq.horimetro}</span>}
                            {eq.quilometragem === undefined && eq.horimetro === undefined && <span className="text-slate-350">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Visualizar Detalhes"
                              onClick={() => handleOpenView(eq)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              title="Editar"
                              onClick={() => handleOpenEdit(eq)}
                              className="p-1.5 bg-slate-100 text-[#003366] hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Excluir"
                              onClick={() => handleDelete(eq.id, `${eq.tipo} ${eq.modelo}`)}
                              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredEquipamentos.map((eq) => (
                  <div key={eq.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{eq.tipo}</h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {eq.fabricante} {eq.modelo} ({eq.ano || '-'})
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenView(eq)}
                          className="p-2 bg-slate-100 text-slate-600 active:bg-slate-200 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(eq)}
                          className="p-2 bg-slate-100 text-[#003366] active:bg-slate-200 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(eq.id, `${eq.tipo} ${eq.modelo}`)}
                          className="p-2 bg-rose-50 text-rose-600 active:bg-rose-100 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Cliente</span>
                        <span className="font-semibold text-slate-700 truncate block">{eq.clienteNome}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Identificação</span>
                        {eq.placa ? (
                          <span className="font-bold text-[#003366] font-mono tracking-wider">{eq.placa}</span>
                        ) : (
                          <span className="font-mono text-slate-500">Série: {eq.numeroSerie}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Editor Panel Form */}
      {isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight">
                  {selectedEquipamento ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {selectedEquipamento ? 'Modificando os parâmetros técnicos do ativo' : 'Insira os dados técnicos e patrimoniais do equipamento'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
            {/* Secção: Associação de Cliente */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF6600]" />
                Vínculo com Cliente proprietário
              </h4>
              <div className="space-y-1">
                <label htmlFor="eq-cli-select" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Selecione o Cliente Proprietário (Opcional)
                </label>
                {clientes.length === 0 ? (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Nenhum cliente cadastrado no sistema. Por favor, cadastre um cliente primeiro na aba de Clientes para poder associar equipamentos (ou salve sem cliente).</span>
                  </div>
                ) : (
                  <select
                    id="eq-cli-select"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-semibold"
                  >
                    <option value="">-- Sem Cliente (Opcional) --</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} {c.documento ? `(${c.documento})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Secção: Detalhes Técnicos */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#FF6600]" />
                Ficha de Especificações Técnicas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="eq-tipo" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Tipo do Equipamento (Opcional)
                  </label>
                  <input
                    id="eq-tipo"
                    type="text"
                    placeholder="Ex: Escavadeira Hidráulica, Caminhão, etc."
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-fab" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Fabricante / Marca (Opcional)
                  </label>
                  <input
                    id="eq-fab"
                    type="text"
                    placeholder="Ex: Caterpillar, Scania, Mercedes"
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-mod" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Modelo (Opcional)
                  </label>
                  <input
                    id="eq-mod"
                    type="text"
                    placeholder="Ex: CAT 320D, R 440"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-ano" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Ano de Fabricação
                  </label>
                  <input
                    id="eq-ano"
                    type="text"
                    maxLength={4}
                    placeholder="Ex: 2020"
                    value={ano}
                    onChange={(e) => setAno(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-placa" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Placa (se houver)
                  </label>
                  <input
                    id="eq-placa"
                    type="text"
                    maxLength={8}
                    placeholder="Ex: ABC-1234"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-chassi" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Chassi / Nº Identificador
                  </label>
                  <input
                    id="eq-chassi"
                    type="text"
                    placeholder="Ex: 9BWZZZ377..."
                    value={chassi}
                    onChange={(e) => setChassi(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-serie" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Número de Série / Identificação (Opcional)
                  </label>
                  <input
                    id="eq-serie"
                    type="text"
                    placeholder="Ex: SER-99281"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-patr" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Nº Patrimônio (Opcional)
                  </label>
                  <input
                    id="eq-patr"
                    type="text"
                    placeholder="Ex: PAT-291"
                    value={patrimonio}
                    onChange={(e) => setPatrimonio(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Secção: Telemetria Inicial */}
            <div className="space-y-4 bg-slate-50/50 p-4.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h4 className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-[#FF6600]" />
                  Quilometragem / Horímetro Inicial (Telemetria)
                </h4>
                <span className="bg-amber-500/10 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse border border-amber-200/50">
                  Preenchimento Solicitado ⚠️
                </span>
              </div>
              
              <p className="text-[10px] text-slate-500 font-medium">
                Insira os dados de rodagem/uso atuais do veículo/máquina. Essas informações são fundamentais para calcular os prazos de revisões futuras e emitir alertas automáticos de manutenção preventiva.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label htmlFor="eq-km" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    Quilometragem Atual (KM)
                    <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded-sm uppercase tracking-wide">Solicitado</span>
                  </label>
                  <input
                    id="eq-km"
                    type="text"
                    placeholder="Ex: 55000 (Apenas números)"
                    value={quilometragem}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setQuilometragem(val === '' ? '' : Number(val));
                    }}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="eq-hor" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    Horímetro Atual (Horas de Uso)
                    <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 rounded-sm uppercase tracking-wide">Solicitado</span>
                  </label>
                  <input
                    id="eq-hor"
                    type="text"
                    placeholder="Ex: 1450 (Apenas números)"
                    value={horimetro}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setHorimetro(val === '' ? '' : Number(val));
                    }}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Secção: Observações */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF6600]" />
                Observações Adicionais
              </h4>
              <div className="space-y-1">
                <textarea
                  id="eq-obs"
                  rows={3}
                  placeholder="Informações contratuais adicionais, datas de manutenção preventiva sugeridas, etc."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 resize-none"
                />
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                id="btn-cancel-equipamento-form"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-save-equipamento"
                type="submit"
                className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Ativo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Detail Modal Overlay */}
      {isViewOpen && selectedEquipamento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#003366]/10 rounded-full text-[#003366]">
                  <Car className="w-5 h-5 text-[#003366]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight">Ficha Técnica do Ativo</h3>
                  <p className="text-[10px] text-slate-500 font-medium">EquipamentoID: {selectedEquipamento.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Tipo</span>
                  <span className="text-sm font-bold text-slate-900">{selectedEquipamento.tipo}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Fabricante / Modelo</span>
                  <span className="text-sm font-bold text-slate-700">
                    {selectedEquipamento.fabricante} {selectedEquipamento.modelo}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Cliente Vinculado</span>
                  <span className="text-xs font-bold text-[#003366]">{selectedEquipamento.clienteNome}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Ano de Fabricação</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedEquipamento.ano || 'Não Informado'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Placa</span>
                  <span className="text-xs font-semibold font-mono tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-block">
                    {selectedEquipamento.placa || 'Sem Placa'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Chassi</span>
                  <span className="text-xs font-semibold font-mono tracking-wider text-slate-800 truncate block">
                    {selectedEquipamento.chassi || 'Não Informado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Número de Série</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-50 border border-slate-250 px-2 py-1 rounded inline-block">
                    {selectedEquipamento.numeroSerie}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Patrimônio</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono">{selectedEquipamento.patrimonio || 'Não Informado'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 bg-slate-50 p-3.5 rounded-xl">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#003366] block mb-0.5 font-black">Quilometragem Inicial</span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedEquipamento.quilometragem !== undefined ? `${selectedEquipamento.quilometragem} KM` : 'Não Informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-[#003366] block mb-0.5 font-black">Horímetro Inicial</span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedEquipamento.horimetro !== undefined ? `${selectedEquipamento.horimetro} Horas` : 'Não Informado'}
                  </span>
                </div>
              </div>

              {selectedEquipamento.observacoes && (
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Notas Observacionais</span>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs text-slate-600 leading-relaxed italic">
                    {selectedEquipamento.observacoes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / Export Modal */}
      <EquipamentoImportExport 
        isOpen={isImportExportOpen} 
        onClose={() => setIsImportExportOpen(false)} 
        onImportComplete={reloadEquipamentos}
      />
    </div>
  );
}
