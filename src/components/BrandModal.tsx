import React, { useState } from 'react';
import { Modal, SafeImage } from './ui';
import { Sparkles, Upload, AlignLeft, Award } from 'lucide-react';
import { callGeminiAI } from '../services/geminiService';
import { uploadImageBlobToStorage } from '../supabase';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function BrandModal({
  isOpen,
  onClose,
  onSave,
  name,
  setName,
  logo,
  setLogo,
  description,
  setDescription,
  editingBrand
}: BrandModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIInfo = async () => {
    if (!name) {
      toast.error("Veuillez d'abord saisir le nom de la marque.");
      return;
    }
    setIsGenerating(true);
    try {
      const systemPrompt = `Génère des informations professionnelles pour la marque de superrette/commerce: "${name}". 
      Je veux:
      1. Une description vendeuse et courte (max 150 caractères).
      2. Une suggestion d'URL de logo (priorise Clearbit logo API: https://logo.clearbit.com/domain.com si tu connais le domaine, sinon cherche une URL publique stable ou laisse vide si inconnu).
      Réponds UNIQUEMENT en format JSON: {"description": "...", "logoUrl": "..."}`;

      const responseText = await callGeminiAI({}, 'Génère le JSON pour cette marque.', systemPrompt);
      const data = JSON.parse(responseText.replace(/```json|```/g, '').trim());

      if (data.description) setDescription(data.description);
      if (data.logoUrl) setLogo(data.logoUrl);
    } catch (error: any) {
      console.error('AI Generation failed:', error);
      const errorMessage = error.message || String(error);
      if (
        errorMessage.includes('Quota atteint') ||
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('credits')
      ) {
        toast.error(
          "Génération IA impossible : Votre quota d'utilisation de l'IA (ou vos crédits Google AI Studio) est épuisé."
        );
      } else {
        toast.error(`La génération IA a échoué : ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBrand ? 'Modifier la Marque' : 'Nouvelle Marque'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={onSave} className="space-y-5 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight">
              Nom de la Marque *
            </label>
            <button
              type="button"
              onClick={generateAIInfo}
              disabled={isGenerating || !name}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 border border-indigo-500/20 rounded-full text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles size={12} className={cn(isGenerating ? 'animate-pulse' : '')} />
              {isGenerating ? 'Génération...' : 'Compléter par IA'}
            </button>
          </div>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="Ex: Cevital, Soummam, Danone, Ifri..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight block">
            Logo de la Marque (URL ou Fichier)
          </label>
          <div className="flex flex-col gap-3 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
            <div className="flex gap-3 items-center">
              <div className="w-14 h-14 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0">
                {logo ? (
                  <SafeImage
                    src={logo}
                    alt="Aperçu"
                    className="w-full h-full object-contain"
                    fallback={<Award size={22} className="text-indigo-500" />}
                  />
                ) : (
                  <Award size={22} className="text-slate-400 dark:text-zinc-600" />
                )}
              </div>
              <input
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="flex-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg py-2.5 px-3 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                placeholder="https://exemple.com/logo.png"
              />
            </div>

            <label className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 cursor-pointer hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-bold text-slate-600 dark:text-zinc-300">
              <Upload size={15} />
              <span>Importer un fichier logo depuis l'appareil</span>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
                    toast.error('Format image non supporté (JPEG, PNG, WebP ou GIF uniquement).');
                    return;
                  }
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
                      const targetType = dataUrl.startsWith('data:image/webp')
                        ? 'image/webp'
                        : 'image/jpeg';
                      if (targetType === 'image/jpeg') {
                        dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                      }

                      canvas.toBlob(
                        async (blob) => {
                          if (!blob) {
                            setLogo(dataUrl);
                            return;
                          }
                          try {
                            const publicUrl = await uploadImageBlobToStorage(
                              blob,
                              'brands',
                              targetType
                            );
                            if (publicUrl) {
                              setLogo(publicUrl);
                            } else {
                              setLogo(dataUrl);
                            }
                          } catch (err) {
                            console.warn(
                              '[Brand storage upload] Failed, using offline dataUrl',
                              err
                            );
                            setLogo(dataUrl);
                          }
                        },
                        targetType,
                        0.5
                      );
                    };
                    img.src = reader.result as string;
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight flex items-center gap-1.5">
            <AlignLeft size={14} className="text-indigo-500" /> Description (Optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl p-3.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 h-24 resize-none"
            placeholder="Brève présentation de la marque ou du fournisseur..."
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Enregistrer la marque
          </button>
        </div>
      </form>
    </Modal>
  );
}
