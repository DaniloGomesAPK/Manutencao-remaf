/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useContext } from 'react';
import { 
  Building2, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Save, 
  ShieldCheck,
  Building,
  Hash,
  Activity,
  ArrowLeft,
  Percent,
  Wallet,
  CreditCard,
  Landmark,
  Coins
} from 'lucide-react';
import { Empresa } from '../models/Empresa';
import { EmpresaService } from '../services/EmpresaService';
import { EmpresaContext } from '../contexts/EmpresaContext';
import CompanyLogo from '../components/CompanyLogo';

interface MinhaEmpresaProps {
  onBack?: () => void;
}

export default function MinhaEmpresa({ onBack }: MinhaEmpresaProps) {
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro'>('geral');

  // Form Fields State (Geral)
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [slogan, setSlogan] = useState('');
  const [logomarca, setLogomarca] = useState<string | undefined>(undefined);
  
  // Tax configuration states
  const [regimeTributario, setRegimeTributario] = useState('Simples Nacional');
  const [aliquotaImposto, setAliquotaImposto] = useState('6.00');

  // Form Fields State (Dados Financeiros)
  const [tipoChavePix, setTipoChavePix] = useState('Chave Aleatória');
  const [chavePix, setChavePix] = useState('');
  const [favorecidoPix, setFavorecidoPix] = useState('');

  const [banco, setBanco] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [tipoConta, setTipoConta] = useState('Corrente');
  const [favorecidoConta, setFavorecidoConta] = useState('');
  const [cpfCnpjConta, setCpfCnpjConta] = useState('');

  const [observacoesComerciaisPadrao, setObservacoesComerciaisPadrao] = useState(
    'Este orçamento possui validade de 15 dias. O início dos serviços está condicionado à aprovação do orçamento e à disponibilidade de agenda.'
  );

  // Load existing company data
  useEffect(() => {
    if (company) {
      setNomeFantasia(company.nomeFantasia || '');
      setRazaoSocial(company.razaoSocial || '');
      setCnpj(company.cnpj || '');
      setInscricaoEstadual(company.inscricaoEstadual || '');
      setEndereco(company.endereco || '');
      setNumero(company.numero || '');
      setBairro(company.bairro || '');
      setCidade(company.cidade || '');
      setEstado(company.estado || '');
      setCep(company.cep || '');
      setTelefone(company.telefone || '');
      setWhatsapp(company.whatsapp || '');
      setEmail(company.email || '');
      setSite(company.site || '');
      setSlogan(company.slogan || '');
      setLogomarca(company.logomarca);
      setRegimeTributario(company.regimeTributario || 'Simples Nacional');
      setAliquotaImposto(company.aliquotaImposto !== undefined ? company.aliquotaImposto.toString() : '6.00');
      
      // Load Dados Financeiros
      setTipoChavePix(company.tipoChavePix || 'Chave Aleatória');
      setChavePix(company.chavePix || '');
      setFavorecidoPix(company.favorecidoPix || '');
      setBanco(company.banco || '');
      setAgencia(company.agencia || '');
      setConta(company.conta || '');
      setTipoConta(company.tipoConta || 'Corrente');
      setFavorecidoConta(company.favorecidoConta || '');
      setCpfCnpjConta(company.cpfCnpjConta || '');
      setObservacoesComerciaisPadrao(
        company.observacoesComerciaisPadrao || 
        'Este orçamento possui validade de 15 dias. O início dos serviços está condicionado à aprovação do orçamento e à disponibilidade de agenda.'
      );
    }
  }, [company]);

  // Simple mask formatters to keep UI highly professional
  const formatCNPJ = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 14) {
      return raw
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return val.substring(0, 18);
  };

  const formatCEP = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 8) {
      return raw.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    return val.substring(0, 9);
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      if (raw.length > 10) {
        return raw.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return raw.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return val.substring(0, 15);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!company) {
      alert('Nenhuma empresa carregada no momento.');
      return;
    }

    // Email verification (only if email is provided)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert('Por favor, insira um endereço de e-mail válido.');
        return;
      }
    }

    setSaving(true);

    const empresaData: Empresa = {
      ...company,
      nomeFantasia: nomeFantasia.trim(),
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      inscricaoEstadual: inscricaoEstadual.trim(),
      endereco: endereco.trim(),
      numero: numero.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado: estado.trim(),
      cep: cep.trim(),
      telefone: telefone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim().toLowerCase(),
      site: site.trim() || undefined,
      slogan: slogan.trim() || undefined,
      logomarca: logomarca,
      regimeTributario: regimeTributario,
      aliquotaImposto: Number(aliquotaImposto) || 0,
      
      // Dados Financeiros
      tipoChavePix: tipoChavePix,
      chavePix: chavePix.trim(),
      favorecidoPix: favorecidoPix.trim(),
      banco: banco.trim(),
      agencia: agencia.trim(),
      conta: conta.trim(),
      tipoConta: tipoConta,
      favorecidoConta: favorecidoConta.trim(),
      cpfCnpjConta: cpfCnpjConta.trim(),
      observacoesComerciaisPadrao: observacoesComerciaisPadrao.trim(),
    };

    try {
      if (empresaCtx) {
        await empresaCtx.saveEmpresa(empresaData);
      }
    } catch (err) {
      console.error('Falha ao salvar dados:', err);
      alert('Erro ao gravar dados no banco offline.');
      setSaving(false);
      return;
    }

    setSaving(true); // set saving finished
    setSaving(false);
    setSuccessMessage('Dados salvos com sucesso!');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hide message after 4 seconds
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (empresaCtx?.isLoadingEmpresa && !company) {
    return (
      <div id="company-loading-screen" className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest text-sm uppercase text-[#003366]">Carregando Informações da Empresa...</p>
      </div>
    );
  }

  return (
    <div id="company-settings-page" className="space-y-6">
      
      {/* Page header controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              id="btn-back-from-company"
              type="button"
              onClick={onBack}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[#003366] uppercase tracking-tight">Minha Empresa</h2>
            <p className="text-xs text-slate-500">Gerencie os dados e identidade corporativa da sua oficina para os relatórios em PDF.</p>
          </div>
        </div>
        <span className="text-[9px] bg-[#003366]/5 border border-[#003366]/10 text-[#003366] px-3 py-1.5 rounded-full font-black uppercase tracking-widest hidden sm:inline-block">
          MODO SAAS READY
        </span>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div id="company-save-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-1.5 bg-emerald-100 rounded-full shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xs text-left">
            <strong className="text-emerald-800 uppercase font-black tracking-wider text-[10px] block mb-0.5">Alteração Gravada</strong>
            {successMessage} O cabeçalho dos novos relatórios em PDF foi atualizado imediatamente.
          </div>
        </div>
      )}

      {/* Pre-fill/Instruction Banner for New Users */}
      {(!company?.nomeFantasia && !company?.cnpj && !company?.endereco) && (
        <div id="company-new-user-instructions" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-5 flex flex-col md:flex-row items-start gap-4 shadow-sm">
          <div className="p-2.5 bg-amber-100 rounded-xl shrink-0 text-amber-700">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-left space-y-2">
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-tight">
              📋 Instruções de Preenchimento do Perfil da Empresa
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Seja bem-vindo! Você iniciou o aplicativo como novo. Para que as suas Ordens de Serviço (OS), Relatórios e Prontuários Inteligentes sejam gerados com a identidade visual e dados corretos da sua oficina, siga os passos abaixo para configurar seu perfil:
            </p>
            <ul className="text-xs text-amber-700 list-disc pl-5 space-y-1 font-medium">
              <li><strong>Passo 1:</strong> Faça o upload da sua <strong>Logomarca</strong> (Identidade Visual) clicando na área de upload abaixo. Ela ocupará o cabeçalho dos seus PDFs gerados de forma proeminente.</li>
              <li><strong>Passo 2:</strong> Insira os <strong>Dados da Empresa</strong> como Nome Fantasia, Razão Social, CNPJ, e Slogan.</li>
              <li><strong>Passo 3:</strong> Insira o <strong>Endereço e Localização</strong> da sua oficina para que os clientes saibam onde retirar e realizar os serviços.</li>
              <li><strong>Passo 4:</strong> Configure a sua <strong>Alíquota Tributária</strong> padrão para cálculo automático de impostos em orçamentos.</li>
              <li><strong>Passo 5:</strong> Insira os <strong>Contatos</strong> como Telefone, WhatsApp, E-mail e Site.</li>
            </ul>
            <p className="text-[11px] text-amber-600 font-bold pt-1">
              💡 Após preencher os dados, não se esqueça de clicar no botão "Salvar Dados da Empresa" no final da página para aplicar as alterações instantaneamente!
            </p>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-xs gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition duration-200 cursor-pointer ${
            activeTab === 'geral'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-500 hover:text-[#003366] hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Dados Gerais</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition duration-200 cursor-pointer ${
            activeTab === 'financeiro'
              ? 'bg-[#003366] text-white shadow-sm'
              : 'text-slate-500 hover:text-[#003366] hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Dados Financeiros</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {activeTab === 'geral' && (
          <div className="space-y-6">
            {/* LOGO CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Activity className="w-5 h-5 text-[#FF6600]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Identidade Visual</h3>
              </div>
              <CompanyLogo logo={logomarca} onChange={setLogomarca} />
            </div>

            {/* DETAILS CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Building2 className="w-5 h-5 text-[#003366]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Dados da Empresa</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nome Fantasia */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Building className="w-3.5 h-3.5 text-[#003366]" />
                    Nome Fantasia
                  </label>
                  <input
                    id="input-company-name-fantasia"
                    type="text"
                    placeholder="Ex: Minha Empresa Serviços"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Razão Social */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Building2 className="w-3.5 h-3.5 text-[#003366]" />
                    Razão Social
                  </label>
                  <input
                    id="input-company-razao-social"
                    type="text"
                    placeholder="Ex: Minha Empresa Prestadora Ltda"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Hash className="w-3.5 h-3.5 text-[#003366]" />
                    CNPJ
                  </label>
                  <input
                    id="input-company-cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Inscrição Estadual */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <FileText className="w-3.5 h-3.5 text-[#003366]" />
                    Inscrição Estadual
                  </label>
                  <input
                    id="input-company-ie"
                    type="text"
                    placeholder="Ex: 123.456.789.110 ou Isento"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <FileText className="w-3.5 h-3.5 text-[#003366]" />
                    Slogan da Empresa
                  </label>
                  <input
                    id="input-company-slogan"
                    type="text"
                    placeholder="Ex: EXCELÊNCIA EM PRESTAÇÃO DE SERVIÇO"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* ADDRESS CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <MapPin className="w-5 h-5 text-[#003366]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Endereço e Localização</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* CEP */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    CEP
                  </label>
                  <input
                    id="input-company-cep"
                    type="text"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Endereço */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Logradouro (Rua, Av, etc)
                  </label>
                  <input
                    id="input-company-endereco"
                    type="text"
                    placeholder="Rua da Manutenção"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Número */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Número
                  </label>
                  <input
                    id="input-company-numero"
                    type="text"
                    placeholder="123"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Bairro */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Bairro
                  </label>
                  <input
                    id="input-company-bairro"
                    type="text"
                    placeholder="Distrito Industrial"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Cidade & Estado split */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
                      Cidade
                    </label>
                    <input
                      id="input-company-cidade"
                      type="text"
                      placeholder="São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
                      UF
                    </label>
                    <input
                      id="input-company-estado"
                      type="text"
                      maxLength={2}
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TAX CONFIGURATION CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Percent className="w-5 h-5 text-[#003366]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Configuração Tributária</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Regime Tributário */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Regime Tributário
                  </label>
                  <select
                    id="select-company-regime"
                    value={regimeTributario}
                    onChange={(e) => setRegimeTributario(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                    <option value="Isento">Isento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Alíquota Efetiva de Imposto (%) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Alíquota Efetiva de Imposto (%)
                  </label>
                  <div className="relative">
                    <input
                      id="input-company-aliquota"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="6.00"
                      value={aliquotaImposto}
                      onChange={(e) => setAliquotaImposto(e.target.value)}
                      className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg pl-4 pr-12 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTACTS CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Phone className="w-5 h-5 text-[#003366]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Contatos e Comunicação</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Phone className="w-3.5 h-3.5 text-[#003366]" />
                    Telefone de Contato
                  </label>
                  <input
                    id="input-company-telefone"
                    type="text"
                    placeholder="(00) 0000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Phone className="w-3.5 h-3.5 text-[#003366]" />
                    WhatsApp Comercial
                  </label>
                  <input
                    id="input-company-whatsapp"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Mail className="w-3.5 h-3.5 text-[#003366]" />
                    E-mail de Contato
                  </label>
                  <input
                    id="input-company-email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Site */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    <Globe className="w-3.5 h-3.5 text-[#003366]" />
                    Site da Empresa (Opcional)
                  </label>
                  <input
                    id="input-company-site"
                    type="text"
                    placeholder="www.suaoficina.com.br"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* PIX CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Coins className="w-5 h-5 text-[#FF6600]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">PIX (Chave de Recebimento)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Tipo de Chave */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Tipo de Chave
                  </label>
                  <select
                    id="select-company-pix-type"
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Celular">Celular</option>
                    <option value="Chave Aleatória">Chave Aleatória</option>
                  </select>
                </div>

                {/* Chave PIX */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Chave PIX
                  </label>
                  <input
                    id="input-company-pix-key"
                    type="text"
                    placeholder="Insira sua chave PIX para preenchimento rápido"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Favorecido PIX */}
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Favorecido (Nome do Titular)
                  </label>
                  <input
                    id="input-company-pix-favorecido"
                    type="text"
                    placeholder="Nome completo do beneficiário da chave PIX"
                    value={favorecidoPix}
                    onChange={(e) => setFavorecidoPix(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* CONTA BANCÁRIA CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <Landmark className="w-5 h-5 text-[#003366]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Conta Bancária (Transferências)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Banco */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Banco
                  </label>
                  <input
                    id="input-company-bank"
                    type="text"
                    placeholder="Ex: Itaú, Bradesco, NuBank"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Agência */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Agência
                  </label>
                  <input
                    id="input-company-agencia"
                    type="text"
                    placeholder="Ex: 0001"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Conta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Número da Conta
                  </label>
                  <input
                    id="input-company-conta"
                    type="text"
                    placeholder="Ex: 12345-6"
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* Tipo de Conta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Tipo de Conta
                  </label>
                  <select
                    id="select-company-account-type"
                    value={tipoConta}
                    onChange={(e) => setTipoConta(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  >
                    <option value="Corrente">Conta Corrente</option>
                    <option value="Poupança">Conta Poupança</option>
                  </select>
                </div>

                {/* Favorecido Conta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    Favorecido (Beneficiário)
                  </label>
                  <input
                    id="input-company-account-favorecido"
                    type="text"
                    placeholder="Nome completo do favorecido"
                    value={favorecidoConta}
                    onChange={(e) => setFavorecidoConta(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                {/* CPF/CNPJ Conta */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                    CPF/CNPJ do Favorecido
                  </label>
                  <input
                    id="input-company-account-cpfcnpj"
                    type="text"
                    placeholder="Ex: 00.000.000/0000-00"
                    value={cpfCnpjConta}
                    onChange={(e) => setCpfCnpjConta(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>
              </div>
            </div>

            {/* OBSERVAÇÕES COMERCIAIS PADRÃO CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-5">
                <FileText className="w-5 h-5 text-[#FF6600]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Observações Comerciais Padrão</h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esse texto será incluído automaticamente como observação comercial em todos os novos orçamentos e Ordens de Serviço em PDF, economizando tempo e padronizando as condições da sua oficina.
                </p>
                <textarea
                  id="textarea-company-comercial-obs"
                  rows={4}
                  placeholder="Ex: Este orçamento possui validade de 15 dias..."
                  value={observacoesComerciaisPadrao}
                  onChange={(e) => setObservacoesComerciaisPadrao(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* CTA Save button */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl shadow-xs shrink-0">
          {onBack && (
            <button
              id="btn-company-cancel"
              type="button"
              onClick={onBack}
              className="w-full sm:w-1/4 border border-slate-200 text-slate-500 hover:bg-slate-100 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer text-center"
            >
              Cancelar
            </button>
          )}
          <button
            id="btn-save-company-details"
            type="submit"
            disabled={saving}
            className="w-full sm:w-1/3 bg-[#003366] hover:bg-[#002244] disabled:bg-[#003366]/50 text-white font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-widest transition duration-200 cursor-pointer shadow-lg shadow-[#003366]/15 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Dados da Empresa</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
