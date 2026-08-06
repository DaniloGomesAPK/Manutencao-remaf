/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useContext } from 'react';
import { 
  Building2, 
  Building, 
  Briefcase, 
  ChevronDown, 
  Hash, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  Activity,
  Send
} from 'lucide-react';
import { EmpresaContext } from '../contexts/EmpresaContext';
import { Empresa } from '../models/Empresa';
import { PERFIL_EMPRESA_OPCOES } from '../constants/perfilEmpresa';
import CompanyLogo from './CompanyLogo';

interface InitialSetupWizardProps {
  onCompleted?: () => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({ onCompleted }) => {
  const empresaCtx = useContext(EmpresaContext);
  const company = empresaCtx?.empresa;

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Form Fields State
  const [perfilEmpresa, setPerfilEmpresa] = useState<string>('Oficina Mecânica');
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
  const [logomarca, setLogomarca] = useState<string | undefined>(undefined);

  // Pre-load from company object if available
  useEffect(() => {
    if (company) {
      setPerfilEmpresa(company.perfilEmpresa || 'Oficina Mecânica');
      setNomeFantasia(company.nomeFantasia || '');
      setRazaoSocial(company.razaoSocial || company.nomeFantasia || '');
      setCnpj(company.cnpj || '');
      setInscricaoEstadual(company.inscricaoEstadual || '');
      setEndereco(company.endereco || '');
      setNumero(company.numero || '');
      setBairro(company.bairro || '');
      setCidade(company.cidade || '');
      setEstado(company.estado || '');
      setCep(company.cep || '');
      setTelefone(company.telefone || company.whatsapp || '');
      setWhatsapp(company.whatsapp || company.telefone || '');
      setEmail(company.email || '');
      setLogomarca(company.logomarca);
    }
  }, [company]);

  // Mask Formatters
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nomeFantasia.trim()) {
      setErro('Por favor, preencha o Nome Fantasia da empresa.');
      return;
    }

    if (!perfilEmpresa) {
      setErro('Por favor, selecione o Perfil da Empresa.');
      return;
    }

    if (!empresaCtx) {
      setErro('Contexto de empresa indisponível no momento.');
      return;
    }

    setSaving(true);

    try {
      const currentCompany = company || { id: localStorage.getItem('empresaId') || `emp_${Date.now()}` };

      const updatedCompanyData: Empresa = {
        ...(currentCompany as Empresa),
        nomeFantasia: nomeFantasia.trim(),
        razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
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
        logomarca: logomarca,
        perfilEmpresa: perfilEmpresa,
        configuracaoInicialConcluida: true, // Conclusão do assistente
        updatedAt: new Date().toISOString()
      };

      await empresaCtx.saveEmpresa(updatedCompanyData);

      if (onCompleted) {
        onCompleted();
      }
    } catch (err: any) {
      console.error('[InitialSetupWizard] Erro ao salvar dados:', err);
      setErro('Falha ao concluir configuração. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="initial-setup-wizard-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Wizard Header Banner */}
        <div className="bg-gradient-to-r from-[#002244] via-[#003366] to-[#004080] text-white p-6 sm:p-8 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistente de Configuração Inicial</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
            Configure Sua Empresa no DG Orçamentos
          </h2>
          <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-2xl font-medium">
            Preencha a identidade e os contatos do seu negócio. As informações serão salvas no seu perfil e utilizadas automaticamente nos cabeçalhos de orçamentos e relatórios em PDF.
          </p>
        </div>

        {/* Wizard Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {erro && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span>{erro}</span>
            </div>
          )}

          {/* Section 1: Perfil e Identidade Visual */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Briefcase className="w-4 h-4 text-[#FF6600]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366]">1. Perfil da Empresa & Logomarca</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Perfil da Empresa */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Briefcase className="w-3.5 h-3.5 text-[#003366]" />
                  Perfil da Empresa *
                </label>
                <div className="relative">
                  <select
                    required
                    value={perfilEmpresa}
                    onChange={(e) => setPerfilEmpresa(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione o Perfil da Empresa...</option>
                    {PERFIL_EMPRESA_OPCOES.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Isso ajuda a otimizar o sistema para o seu segmento de mercado.
                </p>
              </div>

              {/* Logomarca Upload */}
              <div className="md:col-span-2 pt-2">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase mb-2">
                  <Activity className="w-3.5 h-3.5 text-[#FF6600]" />
                  Logomarca da Empresa (Opcional)
                </label>
                <CompanyLogo logo={logomarca} onChange={setLogomarca} />
              </div>
            </div>
          </div>

          {/* Section 2: Dados Principais */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Building2 className="w-4 h-4 text-[#003366]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366]">2. Identificação da Empresa</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome Fantasia */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Building className="w-3.5 h-3.5 text-[#003366]" />
                  Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Auto Elétrica & Mecânica Modelo"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Razão Social */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Building2 className="w-3.5 h-3.5 text-[#003366]" />
                  Razão Social
                </label>
                <input
                  type="text"
                  placeholder="Ex: Modelo Serviços Automotivos LTDA"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Hash className="w-3.5 h-3.5 text-[#003366]" />
                  CNPJ
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Inscrição Estadual */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <FileText className="w-3.5 h-3.5 text-[#003366]" />
                  Inscrição Estadual
                </label>
                <input
                  type="text"
                  placeholder="Ex: Isento ou 123.456.789"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Endereço e Contatos */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <MapPin className="w-4 h-4 text-[#003366]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366]">3. Localização & Contatos</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Endereço */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-[#003366]" />
                  Endereço / Logradouro
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Principal"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Número */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="Ex: 500"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Bairro */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  Bairro
                </label>
                <input
                  type="text"
                  placeholder="Ex: Centro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Cidade */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Estado */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  UF / Estado
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition uppercase"
                />
              </div>

              {/* CEP */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  CEP
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Phone className="w-3.5 h-3.5 text-[#003366]" />
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  placeholder="(00) 0000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <label className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                  <Mail className="w-3.5 h-3.5 text-[#003366]" />
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  placeholder="contato@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] transition"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-[#003366] to-[#004080] hover:from-[#002244] hover:to-[#003366] text-white font-black py-4 px-6 rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-[#003366]/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-sky-400/20 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-sky-200" />
                  <span>Salvando Configuração...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Concluir Configuração e Acessar o Sistema</span>
                  <Send className="w-4 h-4 text-sky-200 ml-auto" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
