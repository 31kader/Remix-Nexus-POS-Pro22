import React from 'react';
import { motion } from 'motion/react';
import { FileText, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { CompanySettings, Employee } from '../../../types';

interface TabContractProps {
  formData: any;
  setFormData: (fd: any) => void;
  settings: CompanySettings;
  editingEmployee: Employee | null;
  setRecruitmentTab: (tab: 'info' | 'identity' | 'contract') => void;
  clearCanvas: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDrawing: (e: any) => void;
  drawSign: (e: any) => void;
  endDrawing: () => void;
  saveSignature: () => void;
}

export function TabContract({
  formData,
  setFormData,
  settings,
  editingEmployee,
  setRecruitmentTab,
  clearCanvas,
  canvasRef,
  startDrawing,
  drawSign,
  endDrawing,
  saveSignature
}: TabContractProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-white animate-fade-in">
      <div className="space-y-3">
        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 flex items-center gap-2 font-black">
          <FileText size={14} /> Prévisualisation du Contrat de Travail
        </label>
        <div className="w-full bg-zinc-950 border border-white/10 rounded-[1.8rem] p-6 text-[11px] font-mono leading-relaxed text-white/70 whitespace-pre-wrap max-h-48 overflow-y-auto shadow-inner">
          {`CONTRAT DE TRAVAIL INDIVIDUEL (NEXUS POS PRO)

Entre l'employeur : ${settings.name || 'NEXUS AUTOMATION SAS'}
Et le salarié : ${formData.name ? formData.name.toUpperCase() : '___________________'}

1. FONCTIONS ET ATTRIBUTIONS :
Le salarié est recruté en qualité de : ${formData.role ? formData.role.toUpperCase() : 'COLLABORATEUR'}.

2. DATE D'ENTRÉE :
Le présent contrat prend effet à compter du : ${formData.hireDate || format(new Date(), 'yyyy-MM-dd')} pour une durée indéterminée.

3. SÉCURITÉ & CONNEXION :
Le salarié s'engage à respecter scrupuleusement la confidentialité des codes d'accès Nexus POS Pro générés au point de vente.

4. RÉMUNÉRATION :
Le type de rémunération convenu est : ${
            formData.salaryType === 'monthly' ? 'MENSUEL FIXE' : 
            formData.salaryType === 'hourly' ? 'TAUX HORAIRE' : 'TAUX JOURNALIER'
          }.
La base de rémunération brute est fixée à : ${
            formData.salaryType === 'monthly' ? formData.baseSalary :
            formData.salaryType === 'hourly' ? formData.hourlyRate : formData.dailyRate
          } ${settings.currency || 'DA'}.

Fait de manière numérique de plein accord des deux parties.`}
        </div>
      </div>

      {/* Signature Canvas Pad Container */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-black">Signature Numérique</p>
          <button type="button" onClick={clearCanvas} className="text-[9px] font-black text-rose-500 hover:text-rose-400 uppercase tracking-wider cursor-pointer">Effacer</button>
        </div>

        {formData.digitalSignatureUrl ? (
          <div className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-6 text-center space-y-3 flex flex-col items-center">
            <CheckSquare className="text-emerald-400" size={24} />
            <p className="text-[10px] font-black tracking-widest text-emerald-400 uppercase font-black">Signature Sécurisée Enregistrée</p>
            <img src={formData.digitalSignatureUrl} className="max-h-20 bg-white dark:bg-black/40 rounded-xl p-3 shadow-inner border border-white/10" alt="Signed" />
            <button type="button" onClick={() => setFormData((prev: any) => ({ ...prev, digitalSignatureUrl: '' }))} className="text-[9px] font-bold text-rose-500 underline uppercase tracking-widest cursor-pointer">Effacer et recommencer</button>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            <canvas
              ref={canvasRef as any}
              width={1000}
              height={400}
              onMouseDown={startDrawing}
              onMouseMove={drawSign}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={drawSign}
              onTouchEnd={endDrawing}
              className="w-full h-80 bg-black/60 rounded-2xl border border-dashed border-indigo-500/30 cursor-crosshair shadow-inner"
            />
            <button
              type="button"
              onClick={saveSignature}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all shadow-md cursor-pointer"
            >
              ✍️ Sauvegarder la signature
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => setRecruitmentTab('identity')}
          className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
        >
          Précédent
        </button>
        
        <button type="submit" className="px-8 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:bg-indigo-500 transition-all cursor-pointer">
          {editingEmployee ? "💾 Enregistrer le profil" : "🤝 Enregistrer & Recruter"}
        </button>
      </div>
    </motion.div>
  );
}
