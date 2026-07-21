/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Download, 
  Image as ImageIcon, 
  Monitor, 
  Smartphone, 
  Tablet,
  Laptop,
  Globe, 
  FileText, 
  ExternalLink, 
  ChevronLeft, 
  FileArchive,
  Eye,
  CheckCircle2,
  Share2,
  Sliders,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';

type ActiveTabType = 'html' | 'mockups' | 'instagram' | 'stories' | 'banners';

export default function MarketingDivulgacao({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('html');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [previewHtmlUrl, setPreviewHtmlUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');

  // File paths for zipping and displaying
  const instagramPosts = Array.from({ length: 10 }, (_, i) => ({
    id: `insta_${i + 1}`,
    name: `Post Instagram ${i + 1}`,
    url: `/marketing/assets/instagram_post_${i + 1}.png`,
    dimensions: '1080x1350'
  }));

  const stories = Array.from({ length: 5 }, (_, i) => ({
    id: `story_${i + 1}`,
    name: `Story ${i + 1}`,
    url: `/marketing/assets/story_${i + 1}.png`,
    dimensions: '1080x1920'
  }));

  const siteBanners = Array.from({ length: 3 }, (_, i) => ({
    id: `banner_site_${i + 1}`,
    name: `Banner para Site ${i + 1}`,
    url: `/marketing/assets/banner_site_${i + 1}.png`,
    dimensions: '1200x675'
  }));

  const whatsappBanners = Array.from({ length: 3 }, (_, i) => ({
    id: `banner_wa_${i + 1}`,
    name: `Banner WhatsApp ${i + 1}`,
    url: `/marketing/assets/banner_whatsapp_${i + 1}.png`,
    dimensions: '1080x1920'
  }));

  const mockups = [
    { id: 'mock_notebook', name: 'Mockup Notebook', url: '/marketing/assets/mockup_notebook.png', type: 'Notebook' },
    { id: 'mock_tablet', name: 'Mockup Tablet', url: '/marketing/assets/mockup_tablet.png', type: 'Tablet' },
    { id: 'mock_smart1', name: 'Mockup Smartphone Vertical', url: '/marketing/assets/mockup_smartphone_1.png', type: 'Smartphone' },
    { id: 'mock_smart2', name: 'Mockup Smartphone Horizontal', url: '/marketing/assets/mockup_smartphone_2.png', type: 'Smartphone' },
    { id: 'mock_desktop', name: 'Mockup Desktop', url: '/marketing/assets/mockup_desktop.png', type: 'Desktop' }
  ];

  // Function to download a single file
  const handleDownloadSingle = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ZIP Exporter Functionality
  const handleExportAllZIP = async () => {
    setIsExporting(true);
    setExportProgress(5);
    setExportSuccess(false);

    try {
      const zip = new JSZip();

      // HTML documents
      const docs = [
        { url: '/marketing/landing_page.html', path: 'landing_page.html' },
        { url: '/marketing/catalogo_comercial.html', path: 'catalogo_comercial.html' }
      ];

      // Add mockups to the assets/ folder under names expected by local HTML relative references
      docs.push({ url: '/marketing/assets/mockup_notebook.png', path: 'assets/mockup_notebook.png' });
      docs.push({ url: '/marketing/assets/mockup_tablet.png', path: 'assets/mockup_tablet.png' });
      docs.push({ url: '/marketing/assets/mockup_smartphone_1.png', path: 'assets/mockup_smartphone_1.png' });
      docs.push({ url: '/marketing/assets/mockup_smartphone_2.png', path: 'assets/mockup_smartphone_2.png' });
      docs.push({ url: '/marketing/assets/mockup_desktop.png', path: 'assets/mockup_desktop.png' });
      docs.push({ url: '/marketing/assets/mockup_pdf_os.png', path: 'assets/mockup_pdf_os.png' });

      // Add mockups in mockups/ directory as well for user convenience
      mockups.forEach((m) => {
        docs.push({ url: m.url, path: `mockups/${m.id}.png` });
      });

      // Add Instagram posts
      instagramPosts.forEach((p, idx) => {
        docs.push({ url: p.url, path: `instagram/instagram_post_${idx + 1}.png` });
      });

      // Add Stories
      stories.forEach((s, idx) => {
        docs.push({ url: s.url, path: `stories/story_${idx + 1}.png` });
      });

      // Add Site Banners
      siteBanners.forEach((b, idx) => {
        docs.push({ url: b.url, path: `banners/banner_site_${idx + 1}.png` });
      });

      // Add WhatsApp Banners
      whatsappBanners.forEach((b, idx) => {
        docs.push({ url: b.url, path: `banners/banner_whatsapp_${idx + 1}.png` });
      });

      let completed = 0;
      const totalFiles = docs.length;

      // Fetch and pack files
      await Promise.all(
        docs.map(async (file) => {
          try {
            const response = await fetch(file.url);
            if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            zip.file(file.path, arrayBuffer);
          } catch (err) {
            console.error(`Error zipping file ${file.url}:`, err);
          }
          completed++;
          setExportProgress(Math.round((completed / totalFiles) * 80));
        })
      );

      setExportProgress(85);
      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setExportProgress(85 + Math.round(metadata.percent * 0.15));
      });

      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'DG_Gestao_Automotiva_Marketing_Completo.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err) {
      console.error('Error generating marketing ZIP:', err);
      alert('Erro ao comprimir os materiais de marketing. Verifique os logs.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 min-h-screen">
      
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="bg-[#FF6600]/10 text-[#FF6600] font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">MODO DIREÇÃO DE ARTE</span>
          </div>
          <h1 className="text-2xl font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
            📣 Portal de Divulgação & Marketing B2B
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Acesso interno exclusivo às telas e materiais reais de alta conversão do sistema <strong>DG Gestão Automotiva</strong>. Baixe individualmente ou exporte todos de uma vez.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 bg-white hover:bg-slate-50 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao Sistema
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportAllZIP}
            className="flex items-center gap-2 bg-[#FF6600] hover:bg-[#E65100] disabled:bg-slate-300 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-[#FF6600]/15 cursor-pointer"
          >
            <FileArchive className="w-4 h-4 stroke-[2.5]" />
            {isExporting ? `Exportando ZIP (${exportProgress}%)` : 'Exportar todos os materiais'}
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-xl border border-emerald-100 text-center animate-in fade-in">
          🎉 <strong>Exportação Concluída!</strong> Todos os arquivos (Mockups, HTMLs, Stories, Banners e Instagram) foram compilados no arquivo ZIP baixado.
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'html', label: 'HTML (Landing & Catálogo)', icon: Globe },
          { id: 'mockups', label: 'Mockups Digitais', icon: Laptop },
          { id: 'instagram', label: 'Instagram (1080x1350)', icon: ImageIcon },
          { id: 'stories', label: 'Stories (1080x1920)', icon: Smartphone },
          { id: 'banners', label: 'Banners Divulgação', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ActiveTabType);
                setPreviewHtmlUrl(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                isSelected 
                  ? 'bg-[#003366] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div className="space-y-6">
        
        {/* Tab 1: HTML Landing & Catalog */}
        {activeTab === 'html' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Landing Page Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="bg-orange-100 text-[#FF6600] font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider">Alta Conversão B2B</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">HTML • CSS • JS</span>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">1. Landing Page Moderna</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Página web responsiva completa com visual prêmio, seção de recursos digitais, simulação de tela de ordens de serviço, depoimentos estruturados e botões interativos direcionando para conversão direta de vendas.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewHtmlUrl('/marketing/landing_page.html')}
                  className="flex-1 bg-[#003366]/5 hover:bg-[#003366]/10 text-[#003366] font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Prévia
                </button>
                <a
                  href="/marketing/landing_page.html"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#003366] hover:bg-[#001f3f] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Nova Aba
                </a>
                <button
                  type="button"
                  onClick={() => handleDownloadSingle('/marketing/landing_page.html', 'landing_page.html')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl transition cursor-pointer"
                  title="Baixar HTML"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catalog Commercial Preview */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="bg-blue-100 text-blue-800 font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider">Prospecção Corporativa</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">HTML • Impressão</span>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">2. Catálogo Comercial Interativo</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apresentação institucional focada em diretores e gerentes de oficinas mecânicas de médio e grande porte. Detalha o módulo de Ordem de Serviço Digital, Prontuário de Equipamentos, Simulador de Markup e vantagens exclusivas da operação offline do PWA.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewHtmlUrl('/marketing/catalogo_comercial.html')}
                  className="flex-1 bg-[#003366]/5 hover:bg-[#003366]/10 text-[#003366] font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar Prévia
                </button>
                <a
                  href="/marketing/catalogo_comercial.html"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#003366] hover:bg-[#001f3f] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Nova Aba
                </a>
                <button
                  type="button"
                  onClick={() => handleDownloadSingle('/marketing/catalogo_comercial.html', 'catalogo_comercial.html')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl transition cursor-pointer"
                  title="Baixar HTML"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Live HTML IFrame Preview */}
            {previewHtmlUrl && (
              <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#FF6600]" />
                    Pré-visualização Interativa Real
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewHtmlUrl(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Fechar Prévia
                  </button>
                </div>
                <div className="w-full aspect-[16/10] min-h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-slate-100 shadow-inner relative">
                  <iframe 
                    src={previewHtmlUrl} 
                    className="w-full h-full border-0 bg-white" 
                    title="Interactive HTML Marketing Preview" 
                  />
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Devices Mockups */}
        {activeTab === 'mockups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {mockups.map((mock) => (
              <div key={mock.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition flex flex-col justify-between">
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] bg-[#003366]/10 text-[#003366] font-black px-2.5 py-0.5 rounded uppercase">{mock.type}</span>
                    <span className="text-[10px] text-slate-400 font-bold">Resolução Ultra-HD</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{mock.name}</h4>
                </div>

                <div 
                  onClick={() => { setLightboxUrl(mock.url); setLightboxName(mock.name); }}
                  className="h-[28rem] md:h-[34rem] bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative group shadow-inner flex items-center justify-center p-4 cursor-zoom-in"
                >
                  <img
                    src={mock.url}
                    alt={mock.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition duration-300 select-none pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition duration-300 flex items-center justify-center">
                    <span className="bg-[#003366]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-md flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Clique para Ampliar
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadSingle(mock.url, `${mock.id}.png`)}
                  className="w-full bg-[#003366] hover:bg-[#001f3f] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Imagem
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Instagram */}
        {activeTab === 'instagram' && (
          <div className="space-y-6">
            <div className="bg-[#FF6600]/5 border border-[#FF6600]/10 rounded-2xl p-4 text-left text-xs text-[#FF6600]/90 flex gap-2.5 items-center">
              <Sparkles className="w-5 h-5 text-[#FF6600]" />
              <p>
                <strong>Coleção Instagram de Alto Impacto (1080x1350)</strong>: Artes projetadas com proporções ideais para o Feed, explorando as telas oficiais do painel de controle, ordens de serviço e precificação técnica. Clique em qualquer post para ver em tamanho real.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {instagramPosts.map((post) => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 transition">
                  <div 
                    onClick={() => { setLightboxUrl(post.url); setLightboxName(post.name); }}
                    className="aspect-[4/5] h-[24rem] md:h-[28rem] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner p-3 cursor-zoom-in group"
                  >
                    <img
                      src={post.url}
                      alt={post.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition duration-300 select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition duration-300 flex items-center justify-center">
                      <span className="bg-[#003366]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-md flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Ampliar Post
                      </span>
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{post.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">{post.dimensions}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(post.url, `${post.id}.png`)}
                    className="w-full bg-[#003366] hover:bg-[#001f3f] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Post
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Stories */}
        {activeTab === 'stories' && (
          <div className="space-y-6">
            <div className="bg-[#003366]/5 border border-[#003366]/10 rounded-2xl p-4 text-left text-xs text-[#003366] flex gap-2.5 items-center">
              <Sparkles className="w-5 h-5 text-[#003366]" />
              <p>
                <strong>Stories e Status (1080x1920)</strong>: Ideal para postagem no Instagram Stories e WhatsApp Status. Apresenta slogans fortes e vantagens competitivas, com o visual clássico da marca DG. Clique para ampliar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {stories.map((story) => (
                <div key={story.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 transition">
                  <div 
                    onClick={() => { setLightboxUrl(story.url); setLightboxName(story.name); }}
                    className="aspect-[9/16] h-[30rem] md:h-[36rem] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner p-3 cursor-zoom-in group"
                  >
                    <img
                      src={story.url}
                      alt={story.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition duration-300 select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition duration-300 flex items-center justify-center">
                      <span className="bg-[#003366]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-md flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Ampliar Story
                      </span>
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{story.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">{story.dimensions}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(story.url, `${story.id}.png`)}
                    className="w-full bg-[#003366] hover:bg-[#001f3f] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Story
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Banners (WhatsApp & Website) */}
        {activeTab === 'banners' && (
          <div className="space-y-12">
            
            {/* Website landscape banners */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest pl-1">Banners para Site e Mídias (1200x675)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {siteBanners.map((banner) => (
                  <div key={banner.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition flex flex-col justify-between">
                    <div 
                      onClick={() => { setLightboxUrl(banner.url); setLightboxName(banner.name); }}
                      className="aspect-video h-[18rem] md:h-[24rem] bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative shadow-inner p-2 cursor-zoom-in group flex items-center justify-center"
                    >
                      <img
                        src={banner.url}
                        alt={banner.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition duration-300 select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition duration-300 flex items-center justify-center">
                        <span className="bg-[#003366]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-md flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Ampliar Banner
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{banner.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{banner.dimensions}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(banner.url, `${banner.id}.png`)}
                        className="bg-[#003366] hover:bg-[#001f3f] text-white font-bold p-3 rounded-xl transition cursor-pointer"
                        title="Baixar Banner"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp tall banners */}
            <div className="space-y-4 border-t border-slate-200 pt-8">
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest pl-1">Banners Verticais para Transmissão WhatsApp (1080x1920)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {whatsappBanners.map((banner) => (
                  <div key={banner.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition flex flex-col justify-between">
                    <div 
                      onClick={() => { setLightboxUrl(banner.url); setLightboxName(banner.name); }}
                      className="aspect-[9/16] h-[30rem] md:h-[36rem] bg-slate-50 border border-slate-100 rounded-xl overflow-hidden relative shadow-inner p-3 cursor-zoom-in group flex items-center justify-center"
                    >
                      <img
                        src={banner.url}
                        alt={banner.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition duration-300 select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition duration-300 flex items-center justify-center">
                        <span className="bg-[#003366]/90 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-md flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Ampliar Banner
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{banner.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{banner.dimensions}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(banner.url, `${banner.id}.png`)}
                        className="bg-[#003366] hover:bg-[#001f3f] text-white font-bold p-3 rounded-xl transition cursor-pointer"
                        title="Baixar Banner"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ZOOM LIGHTBOX OVERLAY */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadSingle(lightboxUrl, lightboxName + '.png');
              }}
              className="bg-[#FF6600] hover:bg-orange-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>

          <div 
            className="w-full max-w-5xl h-[80vh] flex items-center justify-center relative mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={lightboxUrl} 
              alt={lightboxName} 
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800 bg-slate-900/20"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="mt-4 text-center space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-wider">{lightboxName}</h3>
            <p className="text-xs text-slate-500 font-mono">Clique em qualquer lugar fora da imagem para fechar</p>
          </div>
        </div>
      )}

    </div>
  );
}
