import React from 'react';
import { motion } from 'motion/react';
import { Camera, Image, Trash2, FileText, CheckSquare, Lock, UserCog } from 'lucide-react';
import { format } from 'date-fns';
import { Employee, CompanySettings } from '../../types';
import { Modal } from '../ui';
import { cn } from '../../lib/utils';
import { TabInfo } from './recruitment-tabs/TabInfo';
import { TabIdentity } from './recruitment-tabs/TabIdentity';
import { TabContract } from './recruitment-tabs/TabContract';

interface RecruitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmployee: Employee | null;
  handleSubmit: (e: React.FormEvent) => void;
  recruitmentTab: 'info' | 'identity' | 'contract';
  setRecruitmentTab: (tab: 'info' | 'identity' | 'contract') => void;
  formData: any;
  setFormData: (fd: any) => void;
  settings: CompanySettings;
  cameraActiveSection: 'recto' | 'verso' | null;
  startCamera: (section: 'recto' | 'verso') => void;
  stopCamera: () => void;
  takePhoto: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, section: 'recto' | 'verso') => void;
  clearCanvas: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startDrawing: (e: any) => void;
  drawSign: (e: any) => void;
  endDrawing: () => void;
  saveSignature: () => void;
}

export function RecruitmentModal({
  isOpen,
  onClose,
  editingEmployee,
  handleSubmit,
  recruitmentTab,
  setRecruitmentTab,
  formData,
  setFormData,
  settings,
  cameraActiveSection,
  startCamera,
  stopCamera,
  takePhoto,
  videoRef,
  handleFileUpload,
  clearCanvas,
  canvasRef,
  startDrawing,
  drawSign,
  endDrawing,
  saveSignature
}: RecruitmentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingEmployee ? "MODIFIER L'EMPLOYÉ" : "RECRUTEMENT NEXUS"} maxWidth="max-w-5xl" maxHeight="max-h-[94vh]">
      <form onSubmit={handleSubmit} className="p-3 space-y-8 text-left">
        {/* Wizard Navigation Tab bar */}
        <div className="flex bg-zinc-900 p-1.5 rounded-[1.8rem] border border-white/10 backdrop-blur-md overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => { stopCamera(); setRecruitmentTab('info'); }}
            className={cn(
              "flex-1 px-4 py-3 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-center text-white cursor-pointer",
              recruitmentTab === 'info' 
                ? "bg-indigo-600 shadow-neon-indigo border border-indigo-500/20" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            📋 Informations & Rôle *
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setRecruitmentTab('identity'); }}
            className={cn(
              "flex-1 px-4 py-3 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-center text-white cursor-pointer",
              recruitmentTab === 'identity' 
                ? "bg-indigo-600 shadow-neon-indigo border border-indigo-500/20" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            🪪 Pièce d'Identité (Optionnel)
          </button>
          <button
            type="button"
            onClick={() => { stopCamera(); setRecruitmentTab('contract'); }}
            className={cn(
              "flex-1 px-4 py-3 rounded-[1.3rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap text-center text-white cursor-pointer",
              recruitmentTab === 'contract' 
                ? "bg-indigo-600 shadow-neon-indigo border border-indigo-500/20" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            ✍️ Signature & Contrat (Optionnel)
          </button>
        </div>

        {/* TAB 1: General Info & Salary Settings */}
        {recruitmentTab === 'info' && (
          <TabInfo
            formData={formData}
            setFormData={setFormData}
            settings={settings}
            setRecruitmentTab={setRecruitmentTab}
          />
        )}

        {/* TAB 2: Identify Card (Double Sided Recto / Verso Photo taking) */}
        {recruitmentTab === 'identity' && (
          <TabIdentity
            formData={formData}
            setFormData={setFormData}
            setRecruitmentTab={setRecruitmentTab}
            cameraActiveSection={cameraActiveSection}
            startCamera={startCamera}
            stopCamera={stopCamera}
            takePhoto={takePhoto}
            videoRef={videoRef}
            handleFileUpload={handleFileUpload}
          />
        )}

        {/* TAB 3: Contract Preview & Digital Signature Canvas */}
        {recruitmentTab === 'contract' && (
          <TabContract
            formData={formData}
            setFormData={setFormData}
            settings={settings}
            editingEmployee={editingEmployee}
            setRecruitmentTab={setRecruitmentTab}
            clearCanvas={clearCanvas}
            canvasRef={canvasRef}
            startDrawing={startDrawing}
            drawSign={drawSign}
            endDrawing={endDrawing}
            saveSignature={saveSignature}
          />
        )}
      </form>
    </Modal>
  );
}
