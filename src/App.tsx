/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy, useContext } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ClipboardCheck, Sparkles, BookOpen, Layers, Check, Calendar, HardHat, FileText, Settings, Car, Building2, Users, Calculator, Menu, Wifi, WifiOff, Cloud, CloudOff, RefreshCw, ArrowLeft } from 'lucide-react';

import { OrdemDeServico, OSStep } from './types';
import { 
  saveOrdemDeServico, 
  fetchAllServiceOrders, 
  uploadPDFReport,
  isLocalSandbox,
  generateNewDocumentId,
  deleteServiceOrder
} from './db';

import { AuthContext } from './contexts/AuthContext';
import { EmpresaContext } from './contexts/EmpresaContext';
import { LicenseContext } from './contexts/LicenseContext';
import { SyncContext } from './contexts/SyncContext';

import { generateOSReportPDF } from './utils/pdfGenerator';
import { formatToBrazilianDate } from './utils/dateFormatter';

import officialAppBanner from './assets/images/official_app_banner_1784242870138.jpg';

import OfflineIndicator from './components/OfflineIndicator';
import CompanyHeader from './components/CompanyHeader';
import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';

const OSDashboard = lazy(() => import('./components/OSDashboard'));
const OSFormStep1 = lazy(() => import('./components/OSFormStep1'));
const OSFormStep2 = lazy(() => import('./components/OSFormStep2'));
const OSFormStep3 = lazy(() => import('./components/OSFormStep3'));
const OSFormStep4 = lazy(() => import('./components/OSFormStep4'));
const OSFormStep5 = lazy(() => import('./components/OSFormStep5'));
const PDFPreviewModal = lazy(() => import('./components/PDFPreviewModal'));
const MinhaEmpresa = lazy(() => import('./pages/MinhaEmpresa'));
const CadastroClientes = lazy(() => import('./pages/CadastroClientes'));
const CadastroEquipamentos = lazy(() => import('./pages/CadastroEquipamentos'));
const CentralPrecificacao = lazy(() => import('./pages/CentralPrecificacao'));
const Licenciamento = lazy(() => import('./pages/Licenciamento'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Relatorios = lazy(() => import('./pages/Relatorios'));

export default function App() {
  const auth = useContext(AuthContext);
  const empresaCtx = useContext(EmpresaContext);
  const licenseCtx = useContext(LicenseContext);
  const syncCtx = useContext(SyncContext);
  const activeUser = auth?.currentUser;

  // SaaS Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNome, setLoginNome] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submittingLogin, setSubmittingLogin] = useState(false);

  const [serviceOrders, setServiceOrders] = useState<OrdemDeServico[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Wizard states with local auto-recovery persistence
  const [viewingForm, setViewingForm] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('remaf_active_draft_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.viewingForm || false;
      }
    } catch (_) {}
    return false;
  });

  const [currentStep, setCurrentStep] = useState<OSStep>(() => {
    try {
      const saved = localStorage.getItem('remaf_active_draft_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return (parsed.currentStep as OSStep) || 1;
      }
    } catch (_) {}
    return 1;
  });

  const [formData, setFormData] = useState<Partial<OrdemDeServico>>(() => {
    try {
      const saved = localStorage.getItem('remaf_active_draft_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.formData || {};
      }
    } catch (_) {}
    return {};
  });

  const [draftRecovered, setDraftRecovered] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('remaf_active_draft_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.viewingForm && parsed.formData && Object.keys(parsed.formData).length > 0);
      }
    } catch (_) {}
    return false;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'dashboard' | 'list' | 'company' | 'clientes' | 'equipamentos' | 'banco_servicos' | 'precificacao' | 'licensing' | 'configuracoes' | 'relatorios'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // PDF Modal states
  const [activeReport, setActiveReport] = useState<OrdemDeServico | null>(null);
  const [activePDFDataURI, setActivePDFDataURI] = useState<string>('');
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Multi-tenant database fetch trigger
  useEffect(() => {
    if (activeUser?.empresaId) {
      loadServiceOrders();
    } else {
      setServiceOrders([]);
      setLoading(false);
    }
  }, [activeUser?.empresaId]);

  // 1. Persist the draft when viewingForm, currentStep or formData changes
  useEffect(() => {
    try {
      if (viewingForm) {
        const draft = {
          viewingForm,
          currentStep,
          formData,
        };
        localStorage.setItem('remaf_active_draft_v1', JSON.stringify(draft));
      } else {
        localStorage.removeItem('remaf_active_draft_v1');
      }
    } catch (err) {
      console.warn("Failed to persist active form draft to localStorage:", err);
    }
  }, [viewingForm, currentStep, formData]);

  // 2. Warn users when they attempt to exit the page with unsaved form progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (viewingForm) {
        e.preventDefault();
        e.returnValue = 'Você está preenchendo um protocolo. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [viewingForm]);

  const loadServiceOrders = async (silent = false) => {
    if (!activeUser?.empresaId) return;
    
    // Only block the display if search results/records are empty and we specifically need a loader
    if (!silent && serviceOrders.length === 0) {
      setLoading(true);
    }
    try {
      const list = await fetchAllServiceOrders(activeUser.empresaId);
      setServiceOrders(list);
    } catch (err) {
      console.error("Error reading database orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaaSLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError('Por favor, informe seu e-mail de acesso.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Por favor, informe sua senha de acesso.');
      return;
    }
    setSubmittingLogin(true);
    setLoginError('');
    try {
      await auth?.login(loginEmail.trim().toLowerCase(), loginPassword, loginNome.trim() || undefined);
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao realizar login.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleSaaSGoogleLogin = async () => {
    setSubmittingLogin(true);
    setLoginError('');
    try {
      await auth?.loginWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao autenticar com o Google.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleLogout = async () => {
    await auth?.logout();
  };

  // Begin a pristine creation draft
  const handleStartNewOS = () => {
    setFormData({});
    setCurrentStep(1);
    setViewingForm(true);
  };

  // Continue a draft OS in Progress
  const handleEditOS = (os: OrdemDeServico) => {
    setFormData(os);
    if (!os.descricaoAvaria) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
    setViewingForm(true);
  };

  // Duplicate an OS to facilitate creating the same budget for a different equipment
  const handleDuplicateOS = (os: OrdemDeServico) => {
    const duplicated: Partial<OrdemDeServico> = {
      id: generateNewDocumentId(),
      empresaId: os.empresaId,
      numeroOS: '', // will be auto-calculated in Step 1
      
      // Keep customer details
      clienteId: os.clienteId,
      clienteNome: os.clienteNome,
      
      // Clear equipment details as requested ("for different equipment")
      equipamento: '',
      placa: '',
      equipamentoId: '',
      quilometragem: undefined,
      horimetro: undefined,
      
      // Keep other reusable details
      tecnico: os.tecnico || '',
      descricaoAvaria: os.descricaoAvaria || '',
      observacoesFotosAntes: os.observacoesFotosAntes || '',
      servicoExecutado: os.servicoExecutado || '',
      
      // Deep copy the budget items to avoid shared references
      orcamento: os.orcamento ? os.orcamento.map(item => ({ ...item })) : [],
      valorTotalOrcamento: os.valorTotalOrcamento || 0,
      observacoesFinais: os.observacoesFinais || '',
      
      // Reset status and progress fields since it is a brand new draft
      status: 'Pendente',
      fotosAntes: [],
      fotosAntesDescricoes: [],
      fotosDepois: [],
      fotosDepoisDescricoes: [],
      dataConclusao: undefined,
      horaConclusao: undefined,
      pdfGerado: undefined,
      rentabilidade: undefined
    };

    setFormData(duplicated);
    setCurrentStep(1);
    setViewingForm(true);
  };

  // Delete a pending service order
  const handleDeleteOS = async (id: string) => {
    if (!activeUser?.empresaId) return;
    try {
      await deleteServiceOrder(id, activeUser.empresaId);
      await loadServiceOrders(true); // reload list silently
    } catch (err) {
      console.error("Failed to delete service order:", err);
      alert("Erro ao excluir Ordem de Serviço.");
    }
  };

  // Directly construct PDF in clients
  const handleCancelForm = () => {
    setViewingForm(false);
    setFormData({});
    setCurrentStep(1);
    setDraftRecovered(false);
    try {
      localStorage.removeItem('remaf_active_draft_v1');
    } catch (_) {}
  };

  const handleViewPDF = async (os: OrdemDeServico) => {
    try {
      const dataUri = await generateOSReportPDF(os);
      setActiveReport(os);
      setActivePDFDataURI(dataUri);
      setShowPDFPreview(true);
    } catch (err) {
      console.error("Failed to compile pdf preview:", err);
      alert("Não foi possível gerar a pré-visualização do PDF.");
    }
  };

  // Wizard action: Next
  const handleStep1Submit = (step1Data: Partial<OrdemDeServico>) => {
    const docId = formData.id || generateNewDocumentId();
    const empresaId = activeUser?.empresaId || 'default_tenant';
    
    const updated = {
      ...formData,
      ...step1Data,
      id: docId,
      empresaId,
      status: formData.status || 'Pendente',
    } as OrdemDeServico;

    setFormData(updated);
    setCurrentStep(2);

    // Asynchronously synchronize step progression to the database for robust auto-saving
    (async () => {
      try {
        await saveOrdemDeServico(updated);

        // Silently update list so the dashboard list has the correct local list
        if (activeUser?.empresaId) {
          const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
          setServiceOrders(updatedList);
        }
      } catch (err) {
        console.error("Failed to silently sync Step 1 transition:", err);
      }
    })();
  };

  const handleStep2Submit = (step2Data: Partial<OrdemDeServico>) => {
    const docId = formData.id || generateNewDocumentId();
    const empresaId = activeUser?.empresaId || 'default_tenant';

    const updated = {
      ...formData,
      ...step2Data,
      id: docId,
      empresaId,
      status: formData.status || 'Pendente',
    } as OrdemDeServico;

    setFormData(updated);
    setCurrentStep(3);

    // Asynchronously synchronize step progression to the database for robust auto-saving
    (async () => {
      try {
        await saveOrdemDeServico(updated);

        // Silently update list so the dashboard list has the correct local list
        if (activeUser?.empresaId) {
          const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
          setServiceOrders(updatedList);
        }
      } catch (err) {
        console.error("Failed to silently sync Step 2 transition:", err);
      }
    })();
  };

  const handleStep3Submit = (step3Data: Partial<OrdemDeServico>) => {
    const docId = formData.id || generateNewDocumentId();
    const empresaId = activeUser?.empresaId || 'default_tenant';

    const updated = {
      ...formData,
      ...step3Data,
      id: docId,
      empresaId,
      status: formData.status || 'Pendente',
    } as OrdemDeServico;

    setFormData(updated);
    setCurrentStep(4);

    (async () => {
      try {
        await saveOrdemDeServico(updated);
        if (activeUser?.empresaId) {
          const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
          setServiceOrders(updatedList);
        }
      } catch (err) {
        console.error("Failed to silently sync Step 3 transition:", err);
      }
    })();
  };

  const handleStep4Submit = (step4Data: Partial<OrdemDeServico>) => {
    const docId = formData.id || generateNewDocumentId();
    const empresaId = activeUser?.empresaId || 'default_tenant';

    const updated = {
      ...formData,
      ...step4Data,
      id: docId,
      empresaId,
      status: formData.status || 'Pendente',
    } as OrdemDeServico;

    setFormData(updated);
    setCurrentStep(5);

    (async () => {
      try {
        await saveOrdemDeServico(updated);
        if (activeUser?.empresaId) {
          const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
          setServiceOrders(updatedList);
        }
      } catch (err) {
        console.error("Failed to silently sync Step 4 transition:", err);
      }
    })();
  };

  // Save progress as a draft and generate its PDF immediately
  const handleSaveDraftAndPDF = async (stepData: Partial<OrdemDeServico>) => {
    setIsSaving(true);
    try {
      const docId = formData.id || generateNewDocumentId();
      const empresaId = activeUser?.empresaId || 'default_tenant';

      const draftDetails: OrdemDeServico = {
        ...formData,
        ...stepData,
        status: stepData.status || formData.status || 'Pendente',
        id: docId,
        empresaId,
      } as OrdemDeServico;

      // Update local state so if we proceed, the id and new inputs are preserved
      setFormData(draftDetails);

      // Generate PDF
      const pdfUriString = await generateOSReportPDF(draftDetails);

      // Show PDF Preview modal for download & share IMMEDIATELY
      setActiveReport(draftDetails);
      setActivePDFDataURI(pdfUriString);
      setShowPDFPreview(true);
      
      // Stop saving animation immediately
      setIsSaving(false);

      // Save database and upload report in the background asynchronously!
      (async () => {
        try {
          await saveOrdemDeServico(draftDetails);
          const hostedPdfUrl = await uploadPDFReport(pdfUriString, draftDetails.numeroOS);
          draftDetails.pdfGerado = hostedPdfUrl;
          await saveOrdemDeServico(draftDetails);
          
          // Silently refresh the list in the background
          if (activeUser?.empresaId) {
            const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
            setServiceOrders(updatedList);
          }
        } catch (uploadErr) {
          console.warn("Background Storage PDF upload bypassed or failed, falling back to local inline:", uploadErr);
        }
      })();
    } catch (err) {
      console.error("Failed to save draft: ", err);
      alert("Falha ao salvar rascunho em nuvem: " + err);
      setIsSaving(false);
    }
  };

  // Save full OS and render PDF
  const handleFullOSSave = async (step3Data: Partial<OrdemDeServico>) => {
    setIsSaving(true);
    try {
      const docId = formData.id || generateNewDocumentId();
      const empresaId = activeUser?.empresaId || 'default_tenant';

      const fullDetails: OrdemDeServico = {
        ...formData,
        ...step3Data,
        id: docId,
        empresaId,
        status: step3Data.status || formData.status || 'Concluído',
      } as OrdemDeServico;

      // Update local state is instantaneous
      setFormData(fullDetails);

      // Generate PDF
      const pdfUriString = await generateOSReportPDF(fullDetails);

      // Show preview and close wizard immediately
      setActiveReport(fullDetails);
      setActivePDFDataURI(pdfUriString);
      setShowPDFPreview(true);
      setViewingForm(false);
      
      // Stop saving animation immediately
      setIsSaving(false);

      // Upload PDF and save full details asynchronously in the background!
      (async () => {
        try {
          await saveOrdemDeServico(fullDetails);
          const hostedPdfUrl = await uploadPDFReport(pdfUriString, fullDetails.numeroOS);
          fullDetails.pdfGerado = hostedPdfUrl;
          await saveOrdemDeServico(fullDetails);
          
          // Refetch latest silently
          if (activeUser?.empresaId) {
            const updatedList = await fetchAllServiceOrders(activeUser.empresaId);
            setServiceOrders(updatedList);
          }
        } catch (uploadErr) {
          console.warn("Background full transaction assets sync bypassed:", uploadErr);
        }
      })();
    } catch (err) {
      console.error("Failed to complete OS transaction:", err);
      alert("Falha ao salvar Protocolo em nuvem: " + err);
      setIsSaving(false);
    }
  };

  if (auth?.isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500">
        <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-xs uppercase tracking-widest text-[#003366]">Carregando ambiente SaaS...</p>
      </div>
    );
  }

  if (!auth?.isAuthenticated || !auth?.currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
        <div className="w-full max-w-md md:max-w-5xl bg-white border border-slate-200 rounded-3xl md:grid md:grid-cols-12 overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
          
          {/* Banner Pane - Hidden on mobile, beautiful on desktop */}
          <div className="hidden md:block md:col-span-7 relative bg-[#001f3f] overflow-hidden group">
            <img 
              src={officialAppBanner} 
              alt="DG Gestão Automotiva - Orce Rápido. Venda Melhor." 
              className="w-full h-full object-cover select-none transition duration-700 group-hover:scale-101"
              referrerPolicy="no-referrer"
            />
            {/* Dark premium overlay with speed visual feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#001f3f]/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 text-left text-white space-y-2 pointer-events-none">
              <span className="px-3 py-1 bg-[#FF6600] text-[10px] uppercase font-black tracking-widest rounded-full">Oficial SaaS</span>
              <h3 className="text-xl font-extrabold tracking-tight">ORÇAMENTO DIGITAL INTELIGENTE</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Transforme as ordens de serviço da sua oficina em vendas de forma instantânea e totalmente profissional.
              </p>
            </div>
          </div>

          {/* Form Pane */}
          <div className="col-span-12 md:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-white">
            
            {/* Logo & Header */}
            <div className="text-center space-y-3">
              {/* Imagem Oficial do Aplicativo */}
              <div className="w-full max-w-[280px] mx-auto aspect-[16/9] rounded-2xl overflow-hidden border border-slate-200/80 shadow-md mb-3">
                <img 
                  src={officialAppBanner} 
                  alt="DG Gestão Automotiva" 
                  className="w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 justify-center">
                <span className="text-[#003366] font-black text-3xl tracking-tighter">DG</span>
                <span className="text-[#FF6600] font-black text-3xl tracking-tighter">Gestão Automotiva</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Acesse sua plataforma de gestão. Gerencie seus atendimentos técnicos e ordens de serviço de forma inteligente.
              </p>
            </div>

            {/* Login Options Container */}
            <div className="space-y-6">
              
              {/* Google Login button - Primary (at the top) */}
              <button
                id="btn-login-google"
                type="button"
                onClick={handleSaaSGoogleLogin}
                disabled={submittingLogin}
                className="w-full border-2 border-slate-200 text-slate-700 bg-white rounded-xl py-3.5 px-6 font-bold tracking-widest text-[10px] uppercase hover:bg-slate-50 hover:border-slate-350 active:scale-98 transition duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114a5.99 5.99 0 0 1-6-6c0-3.314 2.686-6 6-6 1.457 0 2.783.514 3.823 1.371l3.051-3.052A9.957 9.957 0 0 0 12.24 2c-5.523 0-10 4.477-10 10s4.477 10 10 10c5.523 0 10-4.477 10-10 0-.685-.068-1.354-.188-1.996L12.24 10.285z"/>
                </svg>
                <span>Entrar com o Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 tracking-wider uppercase">ou</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Email & Name Form */}
              <form onSubmit={handleSaaSLogin} className="space-y-4">
                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl p-3 text-center animate-shake">
                    {loginError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
                    Endereço de E-mail <span className="text-[#FF6600] font-bold">*</span>
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="seu-email@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-mono transition duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
                    Senha de Acesso <span className="text-[#FF6600] font-bold">*</span>
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    placeholder="Sua senha de acesso"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 tracking-wider uppercase">
                    Nome Completo <span className="text-slate-400 font-normal">(Opcional para novos cadastros)</span>
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={loginNome}
                    onChange={(e) => setLoginNome(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] transition duration-200"
                  />
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={submittingLogin}
                  className="w-full bg-[#003366] text-white rounded-xl py-3.5 px-6 font-bold tracking-[0.12em] text-[10px] uppercase shadow-lg shadow-[#003366]/10 hover:bg-[#002244] active:scale-[0.99] flex items-center justify-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  {submittingLogin ? 'Acessando...' : 'Acessar com E-mail'}
                </button>
              </form>

            </div>

            {/* License description footer */}
            <div className="text-center pt-4 border-t border-slate-150">
              <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                Licença Proprietária Ativa • 1 Empresa por Conta • Acesso Total
              </p>
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div id="app-root-frame" className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800 selection:bg-[#FF6600]/10 selection:text-[#FF6600]">
      
      {/* Main Structural Right Panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Main Header */}
        <header className="bg-white text-slate-800 h-16 flex items-center justify-between px-6 border-b border-slate-200 shrink-0 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            
            <button
              onClick={() => {
                setViewingForm(false);
                setActiveSubView('dashboard');
              }}
              className="hover:opacity-85 transition cursor-pointer text-left focus:outline-none"
              title="Voltar ao Painel Principal"
            >
              <CompanyHeader />
            </button>

            {/* Indicator de Sincronização em Nuvem (Firestore Sync Engine) */}
            <div className="hidden sm:block pl-4 border-l border-slate-200">
              <OfflineIndicator />
            </div>
          </div>

          {/* User profile section */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end text-xs leading-none">
              <span className="text-[#003366] text-[8px] uppercase font-black tracking-widest mb-0.5">Técnico Operador</span>
              <span className="font-bold text-slate-700">
                {activeUser?.nome || 'Ricardo Silva'}
              </span>
            </div>
            
            <button
              onClick={() => setActiveSubView('configuracoes')}
              className="w-9 h-9 bg-slate-100 hover:bg-[#FF6600]/10 border border-slate-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition group"
              title="Configurações"
            >
              <span className="text-[#003366] group-hover:text-[#FF6600] font-black text-xs uppercase">
                {activeUser?.nome ? activeUser.nome.substring(0, 2) : 'OP'}
              </span>
            </button>

            <button
              id="btn-logout"
              onClick={handleLogout}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer transition duration-150 uppercase tracking-wider"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Primary Application Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
          <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
            
            <AnimatePresence mode="wait">
          
          {/* VIEW: Form Wizard Mode */}
          {viewingForm ? (
            <motion.div
              key="os-wizard-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full space-y-6"
            >
              {/* Form Page Header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    id="btn-back-from-wizard"
                    type="button"
                    onClick={handleCancelForm}
                    className="p-2 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500"
                    title="Voltar"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-[#FF6600]" />
                      {formData.id ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {formData.id ? "Atualize as informações do atendimento." : "Abra um novo protocolo de atendimento técnico em campo."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active draft auto-recovery banner notification */}
              {draftRecovered && (
                <div id="draft-recovered-alert" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Sparkles className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                    </div>
                    <div className="text-xs text-left">
                      <strong className="text-amber-800 uppercase font-black tracking-wider text-[10px] block mb-0.5">Rascunho Recuperado</strong>
                      Seu protocolo em atendimento foi carregado de onde você parou, prevenindo qualquer perda devido ao fechamento ou suspensão da página.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      id="btn-discard-draft-app"
                      type="button"
                      onClick={() => {
                        if (confirm("Deseja mesmo descartar este rascunho e começar um novo? Esta ação não pode ser desfeita.")) {
                          localStorage.removeItem('remaf_active_draft_v1');
                          setFormData({});
                          setCurrentStep(1);
                          setDraftRecovered(false);
                        }
                      }}
                      className="flex-1 sm:flex-none text-rose-600 hover:bg-rose-50 border border-rose-250 hover:border-rose-350 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer text-center"
                    >
                      Descartar Rascunho
                    </button>
                    <button
                      id="btn-keep-draft-app"
                      type="button"
                      onClick={() => setDraftRecovered(false)}
                      className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer text-center"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {/* Progress Stepper Standalone Block */}
              <div className="bg-white border border-slate-200 py-6 px-4 sm:px-12 rounded-2xl shadow-sm shrink-0 w-full">
                <div className="flex items-center justify-between max-w-lg mx-auto relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-0"></div>
                  <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-[#FF6600] -translate-y-1/2 transition-all duration-305 -z-0"
                    style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '25%' : currentStep === 3 ? '50%' : currentStep === 4 ? '75%' : '100%' }}
                  ></div>
                  
                  {(() => {
                    const isStepClickable = (step: OSStep) => {
                      if (step <= currentStep) return true;
                      if (formData.id) return true;
                      return false;
                    };

                    return (
                      <>
                        {/* Step 1: Identificação */}
                        <button
                          type="button"
                          disabled={!isStepClickable(1)}
                          onClick={() => setCurrentStep(1)}
                          className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none transition ${isStepClickable(1) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition duration-200 font-bold ${
                            currentStep > 1 
                              ? 'bg-[#003366] text-white border-none' 
                              : currentStep === 1
                                ? 'bg-[#FF6600] text-white ring-4 ring-[#FF6600]/25'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {currentStep > 1 ? <Check className="w-5 h-5 text-white stroke-[3.5]" /> : '1'}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStep === 1 ? 'text-[#FF6600]' : currentStep > 1 ? 'text-[#003366]' : 'text-slate-400'}`}>Identificação</span>
                        </button>
                        
                        {/* Step 2: Fotos Antes */}
                        <button
                          type="button"
                          disabled={!isStepClickable(2)}
                          onClick={() => setCurrentStep(2)}
                          className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none transition ${isStepClickable(2) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition duration-200 font-bold ${
                            currentStep > 2
                              ? 'bg-[#003366] text-white border-none'
                              : currentStep === 2
                                ? 'bg-[#FF6600] text-white ring-4 ring-[#FF6600]/25'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {currentStep > 2 ? <Check className="w-5 h-5 text-white stroke-[3.5]" /> : '2'}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStep === 2 ? 'text-[#FF6600]' : currentStep > 2 ? 'text-[#003366]' : 'text-slate-400'}`}>Fotos Antes</span>
                        </button>
                        
                        {/* Step 3: Orçamento */}
                        <button
                          type="button"
                          disabled={!isStepClickable(3)}
                          onClick={() => setCurrentStep(3)}
                          className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none transition ${isStepClickable(3) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition duration-200 font-bold ${
                            currentStep > 3
                              ? 'bg-[#003366] text-white border-none'
                              : currentStep === 3
                                ? 'bg-[#FF6600] text-white ring-4 ring-[#FF6600]/25'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {currentStep > 3 ? <Check className="w-5 h-5 text-white stroke-[3.5]" /> : '3'}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStep === 3 ? 'text-[#FF6600]' : currentStep > 3 ? 'text-[#003366]' : 'text-slate-400'}`}>Orçamento</span>
                        </button>

                        {/* Step 4: Fotos Depois */}
                        <button
                          type="button"
                          disabled={!isStepClickable(4)}
                          onClick={() => setCurrentStep(4)}
                          className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none transition ${isStepClickable(4) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition duration-200 font-bold ${
                            currentStep > 4
                              ? 'bg-[#003366] text-white border-none'
                              : currentStep === 4
                                ? 'bg-[#FF6600] text-white ring-4 ring-[#FF6600]/25'
                                : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            {currentStep > 4 ? <Check className="w-5 h-5 text-white stroke-[3.5]" /> : '4'}
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStep === 4 ? 'text-[#FF6600]' : currentStep > 4 ? 'text-[#003366]' : 'text-slate-400'}`}>Fotos Depois</span>
                        </button>

                        {/* Step 5: Conclusão */}
                        <button
                          type="button"
                          disabled={!isStepClickable(5)}
                          onClick={() => setCurrentStep(5)}
                          className={`relative z-10 flex flex-col items-center gap-2 focus:outline-none transition ${isStepClickable(5) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition duration-200 font-bold ${
                            currentStep === 5
                              ? 'bg-[#FF6600] text-white ring-4 ring-[#FF6600]/25'
                              : 'bg-white border-2 border-slate-200 text-slate-400'
                          }`}>
                            5
                          </div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${currentStep === 5 ? 'text-[#FF6600]' : 'text-slate-400'}`}>Conclusão</span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Main Form Split Layout */}
              <div className="flex flex-col md:flex-row gap-6 items-start w-full">
                {/* Left Column: Sidebar Info Cards */}
                <div className="w-full md:w-72 shrink-0 space-y-4">
                  <div className="bg-[#003366] text-white p-5 rounded-2xl shadow-md space-y-4 border border-[#002244] shrink-0">
                    <div className="border-b border-white/10 pb-3">
                      <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest mb-1">Protocolo</p>
                      <h2 className="text-2xl font-black tracking-tighter font-mono">{formData.numeroOS || 'Novo Protocolo'}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="opacity-60 mb-0.5">Data</p>
                        <p className="font-bold">{formData.dataAbertura ? formatToBrazilianDate(formData.dataAbertura) : '-'}</p>
                      </div>
                      <div>
                        <p className="opacity-60 mb-0.5">Hora</p>
                        <p className="font-bold">{formData.horaAbertura || '-'}</p>
                      </div>
                      {formData.clienteNome && (
                        <div className="col-span-2">
                          <p className="opacity-60 mb-0.5">Cliente Proprietário</p>
                          <p className="font-bold truncate text-[#FF6600]">{formData.clienteNome}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="opacity-60 mb-0.5">Equipamento</p>
                        <p className="font-bold line-clamp-2">{formData.equipamento || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="opacity-60 mb-0.5">Placa/Série</p>
                        <p className="font-bold tracking-widest text-[#FF6600] font-mono">{formData.placa || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Dicas de Campo</p>
                    <ul className="text-xs space-y-2 text-slate-600 italic">
                      <li>• Capture as fotos em locais iluminados</li>
                      <li>• Detalhe vazamentos visíveis</li>
                      <li>• Verifique o horímetro do painel</li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: Working Area */}
                <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Form step rendered panel */}
                  <div className="p-5 sm:p-6">
                    <Suspense fallback={
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando formulário...</p>
                      </div>
                    }>
                      {currentStep === 1 && (
                        <OSFormStep1
                          initialData={formData}
                          onNext={handleStep1Submit}
                          onCancel={handleCancelForm}
                          serviceOrders={serviceOrders}
                        />
                      )}
                      {currentStep === 2 && (
                        <OSFormStep2
                          initialData={formData}
                          onNext={handleStep2Submit}
                          onBack={() => setCurrentStep(1)}
                          onCancel={handleCancelForm}
                          onSaveDraftAndPDF={handleSaveDraftAndPDF}
                          isSavingDraft={isSaving}
                        />
                      )}
                      {currentStep === 3 && (
                        <OSFormStep3
                          initialData={formData}
                          onNext={handleStep3Submit}
                          onBack={() => setCurrentStep(2)}
                          onCancel={handleCancelForm}
                        />
                      )}
                      {currentStep === 4 && (
                        <OSFormStep4
                          initialData={formData}
                          onNext={handleStep4Submit}
                          onBack={() => setCurrentStep(3)}
                          onCancel={handleCancelForm}
                          onSaveDraftAndPDF={handleSaveDraftAndPDF}
                          isSavingDraft={isSaving}
                        />
                      )}
                      {currentStep === 5 && (
                        <OSFormStep5
                          initialData={formData}
                          onSave={handleFullOSSave}
                          onBack={() => setCurrentStep(4)}
                          onCancel={handleCancelForm}
                          onSaveDraftAndPDF={handleSaveDraftAndPDF}
                          isSaving={isSaving}
                        />
                      )}
                    </Suspense>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : activeSubView === 'dashboard' ? (
            
            // VIEW: Dashboard Home Page
            <motion.div
              key="dashboard-home-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full animate-in fade-in duration-200"
            >
              <DashboardHome
                orders={serviceOrders}
                onNewOS={handleStartNewOS}
                onEditOS={handleEditOS}
                onViewPDF={handleViewPDF}
                onNavigate={(view) => setActiveSubView(view)}
              />
            </motion.div>
          ) : activeSubView === 'company' ? (
            
            // VIEW: Minha Empresa Page
            <motion.div
              key="company-profile-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Configurações...</p>
                </div>
              }>
                <MinhaEmpresa onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : activeSubView === 'clientes' ? (
            
            // VIEW: Clientes Page
            <motion.div
              key="clientes-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Clientes...</p>
                </div>
              }>
                <CadastroClientes onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : activeSubView === 'equipamentos' ? (
            
            // VIEW: Equipamentos Page
            <motion.div
              key="equipamentos-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Equipamentos...</p>
                </div>
              }>
                <CadastroEquipamentos onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : (activeSubView === 'banco_servicos' || activeSubView === 'precificacao') ? (
            
            // VIEW: Central de Precificação / Banco de Serviços
            <motion.div
              key="precificacao-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Precificação...</p>
                </div>
              }>
                <CentralPrecificacao onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : activeSubView === 'licensing' ? (
            
            // VIEW: Licenciamento SaaS
            <motion.div
              key="licensing-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Licenciamento...</p>
                </div>
              }>
                <Licenciamento onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : activeSubView === 'relatorios' ? (
            
            // VIEW: Relatórios Inteligentes
            <motion.div
              key="relatorios-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Relatórios...</p>
                </div>
              }>
                <Relatorios 
                  orders={serviceOrders}
                  onBack={() => setActiveSubView('dashboard')}
                  onViewCustomPDF={(pseudoOS, pdfUriString) => {
                    setActiveReport(pseudoOS);
                    setActivePDFDataURI(pdfUriString);
                    setShowPDFPreview(true);
                  }}
                />
              </Suspense>
            </motion.div>
          ) : activeSubView === 'configuracoes' ? (
            
            // VIEW: Configurações do Sistema
            <motion.div
              key="configuracoes-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#003366]">Carregando Configurações...</p>
                </div>
              }>
                <Configuracoes onBack={() => setActiveSubView('dashboard')} />
              </Suspense>
            </motion.div>
          ) : (
            
            // VIEW: Histórico de OS Dashboard
            <motion.div
              key="os-dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 w-full"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold tracking-brand-wide text-sm uppercase">Carregando Ordens de Serviço...</p>
                </div>
              ) : (
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold tracking-brand-wide text-sm uppercase">Carregando Histórico...</p>
                  </div>
                }>
                  <OSDashboard
                    orders={serviceOrders}
                    onNewOS={handleStartNewOS}
                    onEditOS={handleEditOS}
                    onViewPDF={handleViewPDF}
                    onDeleteOS={handleDeleteOS}
                    onDuplicateOS={handleDuplicateOS}
                    onBack={() => setActiveSubView('dashboard')}
                  />
                </Suspense>
              )}
            </motion.div>
          )}

        </AnimatePresence>
          </div> {/* Closes max-w-7xl */}
        </main>

        {/* Bottom Status Bar */}
        <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between text-[10px] text-slate-500 font-medium shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-green-600 font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              Banco Local IndexedDB Ativo
            </span>
            <span className="font-mono">Versão PWA 1.2.0 Offline</span>
          </div>
          <div className="uppercase font-semibold tracking-wider text-slate-400 hidden sm:block">
            Gestão de Ordens de Serviço em Tempo Real
          </div>
        </footer>

      </div> {/* Closes Right Panel Container */}

      {/* Overlay: PDF Document Previewer modal */}
      {showPDFPreview && activeReport && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full mx-4">
              <div className="w-12 h-12 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="font-bold text-slate-800 text-sm">Gerando visualização do PDF...</p>
            </div>
          </div>
        }>
          <PDFPreviewModal
            os={activeReport}
            pdfDataUri={activePDFDataURI}
            onClose={() => setShowPDFPreview(false)}
          />
        </Suspense>
      )}

    </div>
  );
}
