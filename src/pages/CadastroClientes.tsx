/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useContext, useEffect } from 'react';
import { 
  User, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ArrowLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { ClienteContext } from '../contexts/ClienteContext';
import { Cliente } from '../types';

interface CadastroClientesProps {
  onBack?: () => void;
}

export default function CadastroClientes({ onBack }: CadastroClientesProps) {
  const clienteCtx = useContext(ClienteContext);
  const { clientes, isLoadingClientes, saveCliente, deleteCliente } = clienteCtx || {
    clientes: [],
    isLoadingClientes: false,
    saveCliente: async () => ({} as Cliente),
    deleteCliente: async () => {},
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Form Fields
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClientes(clientes);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clientes.filter(c => 
        c.nome.toLowerCase().includes(term) ||
        c.documento.toLowerCase().includes(term) ||
        c.telefone.toLowerCase().includes(term) ||
        c.whatsapp.toLowerCase().includes(term)
      );
      setFilteredClientes(filtered);
    }
  }, [searchTerm, clientes]);

  const handleOpenCreate = () => {
    setSelectedCliente(null);
    setNome('');
    setDocumento('');
    setTelefone('');
    setWhatsapp('');
    setEmail('');
    setEndereco('');
    setNumero('');
    setBairro('');
    setCidade('');
    setEstado('');
    setCep('');
    setObservacoes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setNome(cliente.nome);
    setDocumento(cliente.documento);
    setTelefone(cliente.telefone);
    setWhatsapp(cliente.whatsapp);
    setEmail(cliente.email);
    setEndereco(cliente.endereco);
    setNumero(cliente.numero);
    setBairro(cliente.bairro);
    setCidade(cliente.cidade);
    setEstado(cliente.estado);
    setCep(cliente.cep);
    setObservacoes(cliente.observacoes || '');
    setIsFormOpen(true);
  };

  const handleOpenView = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${nome}"?`)) {
      try {
        await deleteCliente(id);
      } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        alert('Não foi possível excluir o cliente.');
      }
    }
  };

  // Mask formatting
  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      // CPF format: 000.000.000-00
      setDocumento(val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
    } else {
      // CNPJ format: 00.000.000/0001-00
      setDocumento(val.substring(0, 14).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
    }
  };

  const formatPhoneField = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 10) {
      return raw.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return raw.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      setTelefone(formatPhoneField(val));
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      setWhatsapp(formatPhoneField(val));
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 8);
    setCep(val.replace(/^(\d{5})(\d)/, '$1-$2'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('O campo Nome Completo é obrigatório.');
      return;
    }

    const payload: Cliente = {
      id: selectedCliente?.id || '',
      empresaId: selectedCliente?.empresaId || '',
      nome,
      documento,
      telefone,
      whatsapp,
      email,
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      observacoes,
      createdAt: selectedCliente?.createdAt,
    };

    try {
      await saveCliente(payload);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar os dados do cliente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-clientes"
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
              <User className="w-5 h-5 text-[#FF6600]" />
              Cadastro de Clientes
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Gerencie os clientes cadastrados no sistema para vincular em Ordens de Serviço.
            </p>
          </div>
        </div>
        <button
          id="btn-new-cliente"
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-[#FF6600] hover:bg-[#e05900] active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Cliente
        </button>
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
                id="input-search-clientes"
                type="text"
                placeholder="Pesquisar por Nome, CPF/CNPJ ou Telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 shadow-xs"
              />
            </div>
          </div>

          {isLoadingClientes ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando clientes...</p>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-16 px-4">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-800 font-bold text-sm">Nenhum cliente encontrado</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                {searchTerm ? 'Nenhum resultado corresponde à sua pesquisa. Experimente outro termo.' : 'Comece cadastrando seu primeiro cliente clicando em "Novo Cliente" acima.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Documento</th>
                      <th className="px-6 py-4">Contato</th>
                      <th className="px-6 py-4">Cidade / UF</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{cliente.nome}</td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{cliente.documento || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="block font-medium">{cliente.whatsapp || cliente.telefone || '-'}</span>
                            {cliente.email && <span className="block text-[10px] text-slate-400">{cliente.email}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-500">
                          {cliente.cidade ? `${cliente.cidade} - ${cliente.estado}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="Visualizar"
                              onClick={() => handleOpenView(cliente)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              title="Editar"
                              onClick={() => handleOpenEdit(cliente)}
                              className="p-1.5 bg-slate-100 text-[#003366] hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title="Excluir"
                              onClick={() => handleDelete(cliente.id, cliente.nome)}
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
                {filteredClientes.map((cliente) => (
                  <div key={cliente.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{cliente.nome}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{cliente.documento || 'Sem CPF/CNPJ'}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenView(cliente)}
                          className="p-2 bg-slate-100 text-slate-600 active:bg-slate-200 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cliente)}
                          className="p-2 bg-slate-100 text-[#003366] active:bg-slate-200 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id, cliente.nome)}
                          className="p-2 bg-rose-50 text-rose-600 active:bg-rose-100 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 border-t border-slate-50 pt-2">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Telefone / Whats</span>
                        <span className="font-semibold text-slate-700">{cliente.whatsapp || cliente.telefone || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Localidade</span>
                        <span className="font-semibold text-slate-700">
                          {cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : '-'}
                        </span>
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
                  {selectedCliente ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {selectedCliente ? `Editando as informações de ${selectedCliente.nome}` : 'Preencha os campos abaixo para registrar o cliente'}
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
            {/* Secção: Dados Pessoais */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF6600]" />
                Dados Principais
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="cli-nome" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Nome Completo <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    id="cli-nome"
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-doc" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    CPF ou CNPJ
                  </label>
                  <input
                    id="cli-doc"
                    type="text"
                    placeholder="Ex: 123.456.789-00"
                    value={documento}
                    onChange={handleDocumentoChange}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Secção: Contatos */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF6600]" />
                Contatos & Comunicação
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="cli-tel" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Telefone Fixo
                  </label>
                  <input
                    id="cli-tel"
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-whats" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    WhatsApp / Celular
                  </label>
                  <input
                    id="cli-whats"
                    type="text"
                    placeholder="(00) 90000-0000"
                    value={whatsapp}
                    onChange={handleWhatsappChange}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    E-mail
                  </label>
                  <input
                    id="cli-email"
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Secção: Localização */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF6600]" />
                Endereço de Correspondência
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-3 space-y-1">
                  <label htmlFor="cli-end" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Endereço / Logradouro
                  </label>
                  <input
                    id="cli-end"
                    type="text"
                    placeholder="Ex: Rua das Flores"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-num" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Número
                  </label>
                  <input
                    id="cli-num"
                    type="text"
                    placeholder="Ex: 123"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-bairro" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Bairro
                  </label>
                  <input
                    id="cli-bairro"
                    type="text"
                    placeholder="Centro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-cid" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Cidade
                  </label>
                  <input
                    id="cli-cid"
                    type="text"
                    placeholder="Salvador"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-est" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Estado (UF)
                  </label>
                  <input
                    id="cli-est"
                    type="text"
                    maxLength={2}
                    placeholder="BA"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cli-cep" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    CEP
                  </label>
                  <input
                    id="cli-cep"
                    type="text"
                    placeholder="00000-000"
                    value={cep}
                    onChange={handleCepChange}
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
                  id="cli-obs"
                  rows={3}
                  placeholder="Instruções adicionais de entrega, dados cadastrais secundários, etc."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200 resize-none"
                />
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                id="btn-cancel-cliente-form"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-save-cliente"
                type="submit"
                className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Cadastro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Detail Modal Overlay */}
      {isViewOpen && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#003366]/10 rounded-full text-[#003366]">
                  <User className="w-5 h-5 text-[#003366]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight">Ficha do Cliente</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Visualizando todos os campos cadastrados</p>
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
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Nome Completo</span>
                <span className="text-sm font-bold text-slate-900">{selectedCliente.nome}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">CPF ou CNPJ</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block">
                    {selectedCliente.documento || 'Não Informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">E-mail</span>
                  <span className="text-xs font-semibold text-slate-700 truncate block">
                    {selectedCliente.email || 'Não Informado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Telefone Fixo</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedCliente.telefone || 'Não Informado'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">WhatsApp</span>
                  <span className="text-xs font-semibold text-emerald-600 font-bold">{selectedCliente.whatsapp || 'Não Informado'}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#003366] tracking-wider block">Endereço Registrado</span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Endereço</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.endereco || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Número</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.numero || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Bairro</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.bairro || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Cidade</span>
                    <span className="font-semibold text-slate-700">{selectedCliente.cidade || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Estado / CEP</span>
                    <span className="font-semibold text-slate-700">
                      {selectedCliente.estado ? `${selectedCliente.estado} - ${selectedCliente.cep}` : 'Não Informado'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedCliente.observacoes && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Observações Internas</span>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-xs text-slate-600 leading-relaxed italic">
                    {selectedCliente.observacoes}
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
    </div>
  );
}
