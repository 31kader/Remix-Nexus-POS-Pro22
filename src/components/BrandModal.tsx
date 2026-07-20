import React, { useState } from 'react';
import { Modal, Button } from './ui';
import { Sparkles, Upload, AlignLeft } from 'lucide-react';
import { callGeminiAI } from '../services/geminiService';
import { uploadImageBlobToStorage } from '../supabase';
import { cn } from '../lib/utils';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  name: string;
  setName: (name: string) => void;
  logo: string;
  setLogo: (logo: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  editingBrand: any;
}

export function BrandModal({ 
  isOpen, onClose, onSave, 
  name, setName, logo, setLogo, 
  description, setDescription, 
  editingBrand
}: BrandModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIInfo = async () => {
    if (!name) {
      alert("Veuillez d'abord saisir le nom de la marque.");
      return;
    }
    setIsGenerating(true);
    try {
      const systemPrompt = `Génère des informations professionnelles pour la marque de superrette/commerce: "${name}". 
      Je veux:
      1. Une description vendeuse et courte (max 150 caractères).
      2. Une suggestion d'URL de logo (priorise Clearbit logo API: https://logo.clearbit.com/domain.com si tu connais le domaine, sinon cherche une URL publique stable ou laisse vide si inconnu).
      Réponds UNIQUEMENT en format JSON: {"description": "...", "logoUrl": "..."}`;

      const responseText = await callGeminiAI({}, "Génère le JSON pour cette marque.", systemPrompt);
      
      const data = JSON.parse(responseText.replace(/```json|```/g, '').trim());
      
      if (data.description) setDescription(data.description);
      if (data.logoUrl) setLogo(data.logoUrl);
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      const errorMessage = error.message || String(error);
      if (errorMessage.includes("Quota atteint") || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("credits")) {
        alert("Génération IA impossible : Votre quota d'utilisation de l'IA (ou vos crédits Google AI Studio) est épuisé.");
      } else {
        alert(`La génération IA a échoué : ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBrand ? "PROFIL MARQUE CORPORATE" : "ENREGISTREMENT NOUVELLE MARQUE"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={onSave} className="space-y-8 bg-[#05070a] p-8 rounded-[3rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex justify-between items-center group">
            IDENTITÉ DE MARQUE *
            <button 
              type="button" 
              onClick={generateAIInfo}
              disabled={isGenerating || !name}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[9px] font-black text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-[0.15em] disabled:opacity-30 italic group/ia shadow-2xl"
            >
              <Sparkles size={12} className={cn("group-hover/ia:rotate-12 transition-transform", isGenerating ? "animate-pulse" : "")} />
              {isGenerating ? "SYNTÉSIS..." : "GÉNÉRER PAR IA"}
            </button>
          </label>
          <div className="relative group">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-black placeholder:text-slate-800 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner uppercase italic group-hover:border-white/20"
              placeholder="NOM DE LA MARQUE..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1">ASSET GRAPHIQUE / LOGOTYPE</label>
          <div className="flex flex-col gap-5 bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-inner ring-1 ring-white/5">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-white text-[10px] font-black italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner placeholder:text-slate-800 group-hover:border-white/20"
                  placeholder="HTTPS://CDN.BRAND.COM/LOGO.PNG"
                />
              </div>
              {logo && (
                <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center p-2 shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <img 
                    src={logo} 
                    alt="Preview" 
                    className="w-full h-full object-contain" 
                    onError={(e) => { 
                      e.currentTarget.onerror = null; 
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'B')}&background=6366f1&color=fff&bold=true`;
                    }} 
                  />
                </div>
              )}
            </div>

            <label className="flex items-center justify-center gap-3 py-3 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-all group/up">
              <Upload size={16} className="text-slate-700 group-hover/up:text-indigo-400 group-hover/up:scale-110 transition-all" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover/up:text-indigo-400 transition-colors italic">IMPORTER FICHIER LOGO</span>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const img = document.createElement('img');
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_WIDTH = 400;
                      const MAX_HEIGHT = 400;
                      let width = img.width;
                      let height = img.height;

                      if (width > height) {
                        if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                        }
                      } else {
                        if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                        }
                      }
                      
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      
                      let dataUrl = canvas.toDataURL('image/webp', 0.5);
                      const targetType = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
                      if (targetType === 'image/jpeg') {
                        dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                      }

                      canvas.toBlob(async (blob) => {
                        if (!blob) {
                          setLogo(dataUrl);
                          return;
                        }
                        try {
                          const publicUrl = await uploadImageBlobToStorage(blob, 'brands', targetType);
                          if (publicUrl) {
                            setLogo(publicUrl);
                          } else {
                            setLogo(dataUrl);
                          }
                        } catch (err) {
                          console.warn("[Brand storage upload] Failed, using offline dataUrl", err);
                          setLogo(dataUrl);
                        }
                      }, targetType, 0.5);
                    };
                    img.src = reader.result as string;
                  };
                  reader.readAsDataURL(file);
                }} 
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-2">
            <AlignLeft size={12} /> SYNOPSIS / DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-6 text-xs font-black text-white outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner placeholder:text-slate-800 uppercase italic tracking-widest h-28 resize-none"
            placeholder="ÉCRIRE UNE BRÈVE DESCRIPTION DE LA MARQUE..."
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-6 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-neon-indigo border border-indigo-400 ring-1 ring-white/20 transition-all active:scale-95 italic relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
            VALIDER PROFIL MARQUE
          </button>
        </div>
      </form>
    </Modal>
  );
}
