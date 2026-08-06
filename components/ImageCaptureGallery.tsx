/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw, Layers, CheckCircle } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface CapturedPhoto {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}

interface ImageCaptureGalleryProps {
  label: string;
  photos: string[]; // List of base64 URLs or paths
  onChange: (photos: string[]) => void;
  descriptions?: string[];
  onChangeDescriptions?: (descriptions: string[]) => void;
}

export default function ImageCaptureGallery({ 
  label, 
  photos, 
  onChange,
  descriptions = [],
  onChangeDescriptions
}: ImageCaptureGalleryProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  
  const [compressing, setCompressing] = useState(false);
  const [sizes, setSizes] = useState<Record<string, { original: number; compressed: number }>>({});
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Parse photos that might already exist and set dummy metadata sizes just in case
  const getSavings = (orig?: number, comp?: number) => {
    if (!orig || !comp) return null;
    const diff = orig - comp;
    const p = Math.round((diff / orig) * 100);
    return p > 0 ? `${p}%` : null;
  };

  const handleFileProcess = async (files: FileList | null, isReplacement: boolean = false) => {
    if (!files || files.length === 0) return;
    setCompressing(true);

    try {
      const processedList: string[] = [...photos];
      const newSizes = { ...sizes };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Compressing automatically before saving
        const result = await compressImage(file, 0.75); // 75% JPEG compression quality for high performance is optimal
        
        const photoId = result.dataUrl.substring(20, 50); // unique substring identifier
        newSizes[photoId] = {
          original: result.originalSizeKB,
          compressed: result.compressedSizeKB
        };

        if (isReplacement && replacingIndex !== null) {
          processedList[replacingIndex] = result.dataUrl;
          break; // replacement only does one file
        } else {
          processedList.push(result.dataUrl);
        }
      }

      setSizes(newSizes);
      onChange(processedList);

      if (onChangeDescriptions) {
        const updatedDescriptions = [...descriptions];
        if (isReplacement && replacingIndex !== null) {
          // Keep existing description for replaced item position
        } else {
          for (let i = 0; i < files.length; i++) {
            updatedDescriptions.push('');
          }
        }
        onChangeDescriptions(updatedDescriptions);
      }
    } catch (err) {
      console.error("Could not compress or process uploaded image files: ", err);
      alert("Falha no processamento: Certifique-se de escolher um arquivo de imagem válido.");
    } finally {
      setCompressing(false);
      setReplacingIndex(null);
    }
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    galleryInputRef.current?.click();
  };

  const triggerReplacement = (index: number) => {
    setReplacingIndex(index);
    replaceInputRef.current?.click();
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, idx) => idx !== index);
    onChange(updated);
    if (onChangeDescriptions) {
      const updatedDescs = descriptions.filter((_, idx) => idx !== index);
      onChangeDescriptions(updatedDescs);
    }
  };

  return (
    <div id={`gallery-block-${label.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-4">
      {/* Hidden file selectors */}
      <input
        ref={cameraInputRef}
        id={`camera-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
        type="file"
        accept="image/*"
        capture="environment" /* Mandated: Direct mobile camera launch */
        onChange={(e) => handleFileProcess(e.target.files, false)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        id={`gallery-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileProcess(e.target.files, false)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        id={`replace-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileProcess(e.target.files, true)}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#003366]" />
            {label}
          </h3>
          <p className="text-xs text-slate-500">Múltiplas capturas suportadas. Resolução otimizada 1000px (JPEG ~75%)</p>
        </div>

        {/* Compression Spinner */}
        {compressing && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FF6600] animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Processando e Comprimindo...</span>
          </div>
        )}
      </div>

      {/* Launcher controls - large buttons for field use as requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          id={`btn-camera-${label.replace(/\s+/g, '-').toLowerCase()}`}
          type="button"
          onClick={triggerCamera}
          className="flex items-center justify-center gap-1.5 bg-[#FF6600] text-white py-3.5 px-5 rounded-full font-bold tracking-widest text-[10px] uppercase shadow-lg shadow-[#FF6600]/20 hover:bg-[#E05500] active:scale-98 transition duration-150 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-white" />
          <span>Tirar Foto (Câmera)</span>
        </button>

        <button
          id={`btn-gallery-${label.replace(/\s+/g, '-').toLowerCase()}`}
          type="button"
          onClick={triggerGallery}
          className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 px-5 rounded-full font-bold tracking-widest text-[10px] uppercase active:scale-98 transition duration-150 cursor-pointer border border-slate-250"
        >
          <ImageIcon className="w-4 h-4 text-slate-500" />
          <span>Escolher da Galeria</span>
        </button>
      </div>

      {/* Grid gallery of thumbnails */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {photos.map((src, idx) => {
            const photoId = src.substring(20, 50);
            const metadata = sizes[photoId];
            const sizeLabel = metadata 
              ? `${metadata.compressed.toFixed(0)} KB` 
              : src.startsWith('data:') 
                ? `${Math.round((src.length * 3 / 4) / 1024)} KB`
                : 'Salva';

            const savingPercentage = metadata 
              ? getSavings(metadata.original, metadata.compressed) 
              : null;

            return (
              <div 
                id={`thumb-wrapper-${label.replace(/\s+/g, '-').toLowerCase()}-${idx}`} 
                key={idx} 
                className="group relative flex flex-col bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm"
              >
                {/* Image item wrapping */}
                <div className="relative aspect-4/3 bg-slate-200 overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={src}
                    alt={`${label} ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  
                  {/* Indicator labels on photo */}
                  <div className="absolute top-1.5 left-1.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm">
                    {idx + 1}
                  </div>

                  {/* Savings Pill */}
                  {savingPercentage && (
                    <div className="absolute top-1.5 right-1.5 bg-[#FF6600] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      -{savingPercentage}
                    </div>
                  )}
                </div>

                {/* Info and file size indicators bar */}
                <div className="p-2 flex items-center justify-between bg-white text-[10px] font-medium border-t border-slate-100">
                  <span className="text-slate-500 font-mono font-bold uppercase">{sizeLabel}</span>
                  <div className="flex gap-1">
                    {/* Action: Substitute */}
                    <button
                      id={`btn-replace-${label.replace(/\s+/g, '-').toLowerCase()}-${idx}`}
                      type="button"
                      onClick={() => triggerReplacement(idx)}
                      title="Substituir foto"
                      className="p-1.5 bg-slate-100 hover:bg-[#FF6600]/10 hover:text-[#FF6600] rounded-md text-slate-500 transition duration-150 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {/* Action: Delete */}
                    <button
                      id={`btn-delete-${label.replace(/\s+/g, '-').toLowerCase()}-${idx}`}
                      type="button"
                      onClick={() => removePhoto(idx)}
                      title="Excluir foto"
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-md text-slate-500 transition duration-150 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Caption description input box element */}
                <div className="px-2 pb-2 bg-white border-t border-slate-150/50">
                  <input
                    type="text"
                    placeholder="O que é esta foto? Ex: Detalhe do motor"
                    value={descriptions[idx] || ''}
                    onChange={(e) => {
                      const updated = [...descriptions];
                      while (updated.length < photos.length) {
                        updated.push('');
                      }
                      updated[idx] = e.target.value;
                      onChangeDescriptions?.(updated);
                    }}
                    className="w-full text-[11px] bg-slate-50 text-slate-750 border border-slate-200 rounded-md px-2 py-1.2 focus:outline-none focus:ring-2 focus:ring-[#003366]/10 focus:border-[#003366] font-medium transition duration-150 placeholder:text-slate-400"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50">
          <Camera className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-500">Nenhuma imagem adicionada para esta etapa.</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Use os botões acima para fotografar com a câmera do celular.</p>
        </div>
      )}
    </div>
  );
}
