/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface CompanyLogoProps {
  logo?: string;
  onChange: (logo: string | undefined) => void;
}

export default function CompanyLogo({ logo, onChange }: CompanyLogoProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [compressing, setCompressing] = useState(false);
  const [sizes, setSizes] = useState<{ original?: number; compressed?: number } | null>(null);

  const handleFileProcess = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCompressing(true);

    try {
      const file = files[0];
      // Auto compress logo using our browser canvas-based compressor
      const result = await compressImage(file, 0.75);
      
      setSizes({
        original: result.originalSizeKB,
        compressed: result.compressedSizeKB
      });
      onChange(result.dataUrl);
    } catch (err) {
      console.error("Could not compress or process uploaded image file: ", err);
      alert("Falha no processamento: Certifique-se de escolher um arquivo de imagem válido.");
    } finally {
      setCompressing(false);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const removeLogo = () => {
    if (confirm("Tem certeza de que deseja remover a logomarca da empresa?")) {
      onChange(undefined);
      setSizes(null);
    }
  };

  const getSavings = () => {
    if (!sizes?.original || !sizes?.compressed) return null;
    const diff = sizes.original - sizes.compressed;
    const p = Math.round((diff / sizes.original) * 100);
    return p > 0 ? `${p}%` : null;
  };

  return (
    <div id="company-logo-section" className="space-y-4">
      {/* Hidden native input files */}
      <input
        ref={cameraInputRef}
        id="company-camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileProcess(e.target.files)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        id="company-gallery-input"
        type="file"
        accept="image/*"
        onChange={(e) => handleFileProcess(e.target.files)}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
        {/* Visual Preview frame */}
        <div className="relative w-36 h-36 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
          {logo ? (
            <img 
              id="company-logo-preview"
              src={logo} 
              alt="Logomarca da Empresa" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center p-3 flex flex-col items-center gap-1.5 text-slate-400">
              <ImageIcon className="w-8 h-8 text-slate-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sem Logo</span>
            </div>
          )}

          {compressing && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 text-[#003366] animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 animate-pulse">Comprimindo...</span>
            </div>
          )}
        </div>

        {/* Buttons & Metadata controls */}
        <div className="flex-1 space-y-3 text-center sm:text-left w-full">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Logomarca da Empresa</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Esta imagem será inserida automaticamente no cabeçalho de todos os relatórios em PDF gerados pelo aplicativo.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {logo ? (
              <>
                <button
                  id="btn-replace-logo-gallery"
                  type="button"
                  onClick={triggerGallery}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Substituir
                </button>
                <button
                  id="btn-remove-logo"
                  type="button"
                  onClick={removeLogo}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </button>
              </>
            ) : (
              <>
                <button
                  id="btn-logo-gallery"
                  type="button"
                  onClick={triggerGallery}
                  className="bg-white hover:bg-slate-50 text-[#003366] border border-slate-200 font-bold px-3.5 py-2.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Galeria
                </button>
                <button
                  id="btn-logo-camera"
                  type="button"
                  onClick={triggerCamera}
                  className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-3.5 py-2.5 rounded-lg text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Usar Câmera
                </button>
              </>
            )}
          </div>

          {logo && sizes && (
            <div className="text-[10px] text-slate-400 font-medium">
              Tamanho: <span className="font-bold text-slate-500">{sizes.compressed} KB</span> (Original: {sizes.original} KB) 
              {getSavings() && <span className="text-[#FF6600] font-black uppercase ml-1">Comprimido {getSavings()}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
