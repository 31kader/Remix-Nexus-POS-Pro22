import React from 'react';
import { motion } from 'motion/react';
import { Camera, Image, Trash2, CheckSquare } from 'lucide-react';

interface TabIdentityProps {
  formData: any;
  setFormData: (fd: any) => void;
  setRecruitmentTab: (tab: 'info' | 'identity' | 'contract') => void;
  cameraActiveSection: 'recto' | 'verso' | null;
  startCamera: (section: 'recto' | 'verso') => void;
  stopCamera: () => void;
  takePhoto: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, section: 'recto' | 'verso') => void;
}

export function TabIdentity({
  formData,
  setFormData,
  setRecruitmentTab,
  cameraActiveSection,
  startCamera,
  stopCamera,
  takePhoto,
  videoRef,
  handleFileUpload
}: TabIdentityProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-white animate-fade-in">
      <div className="p-4 bg-indigo-500/5 rounded-[1.5rem] border border-indigo-500/10 flex items-start gap-4">
        <CheckSquare className="text-indigo-400 shrink-0 mt-0.5" size={16} />
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-white uppercase tracking-wider">Vérification de l'identité Légale</p>
          <p className="text-[9px] text-white/30 leading-relaxed font-black uppercase tracking-wider mt-1">Capturez ou chargez le scan recto et verso de la pièce d'identité du collaborateur pour certifier son dossier professionnel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recto Card Capture Slot */}
        <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Scan Recto (Face Avant)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startCamera('recto')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Camera size={12} /> Caméra
              </button>
              <label className="px-3 py-1.5 bg-black/60 hover:bg-black/80 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer">
                <Image size={12} /> Charger
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'recto')} />
              </label>
            </div>
          </div>
          
          {cameraActiveSection === 'recto' ? (
            <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-neon-indigo bg-black/95">
              <video ref={videoRef as any} className="w-full h-full object-cover" autoPlay playsInline muted></video>
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <button type="button" onClick={takePhoto} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">📸 Déclencher</button>
                <button type="button" onClick={stopCamera} className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center">
              {formData.idCardRectoUrl ? (
                <>
                  <img src={formData.idCardRectoUrl} className="w-full h-full object-cover" alt="ID Card Recto" />
                  <button type="button" onClick={() => setFormData((prev: any) => ({...prev, idCardRectoUrl: ''}))} className="absolute top-3 right-3 p-2.5 bg-black/60 rounded-xl text-rose-500 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"><Trash2 size={14} /></button>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Image size={24} className="mx-auto text-white/10" />
                  <p className="text-[9px] font-black tracking-widest text-white/20 uppercase font-black">Aucune photo enregistrée</p>
                  <p className="text-[8px] text-white/20 italic uppercase font-medium">Utilisez l'appareil photo ou chargez un fichier scané</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verso Card Capture Slot */}
        <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Scan Verso (Face Arrière)</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startCamera('verso')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Camera size={12} /> Caméra
              </button>
              <label className="px-3 py-1.5 bg-black/60 hover:bg-black/80 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer">
                <Image size={12} /> Charger
                <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'verso')} />
              </label>
            </div>
          </div>
          
          {cameraActiveSection === 'verso' ? (
            <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-indigo-500 shadow-neon-indigo bg-black/95">
              <video ref={videoRef as any} className="w-full h-full object-cover" autoPlay playsInline muted></video>
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <button type="button" onClick={takePhoto} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">📸 Déclencher</button>
                <button type="button" onClick={stopCamera} className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">Annuler</button>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-dashed border-white/10 bg-black/40 flex flex-col items-center justify-center">
              {formData.idCardVersoUrl ? (
                <>
                  <img src={formData.idCardVersoUrl} className="w-full h-full object-cover" alt="ID Card Verso" />
                  <button type="button" onClick={() => setFormData((prev: any) => ({...prev, idCardVersoUrl: ''}))} className="absolute top-3 right-3 p-2.5 bg-black/60 rounded-xl text-rose-500 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"><Trash2 size={14} /></button>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Image size={24} className="mx-auto text-white/10" />
                  <p className="text-[9px] font-black tracking-widest text-white/20 uppercase font-black">Aucune photo enregistrée</p>
                  <p className="text-[8px] text-white/20 italic uppercase font-medium">Utilisez l'appareil photo ou chargez un fichier scané</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/10 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setRecruitmentTab('info')}
          className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
        >
          Précédent
        </button>
        <button
          type="submit"
          className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
        >
          💼 Enregistrer sans signature
        </button>
        <button
          type="button"
          onClick={() => setRecruitmentTab('contract')}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg cursor-pointer"
        >
          Suivant : Contrat ➔
        </button>
      </div>
    </motion.div>
  );
}
