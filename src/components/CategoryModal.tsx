import React, { useRef, useState } from 'react';
import { Modal, Button } from './ui';
import { Category } from '../types';
import { getHierarchicalCategories } from '../lib/utils';
import { Image as ImageIcon, Upload, Link as LinkIcon, Trash2, FolderTree, ChevronDown } from 'lucide-react';
import { uploadImageBlobToStorage } from '../supabase';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  name: string;
  setName: (name: string) => void;
  parentId: string;
  setParentId: (id: string) => void;
  imageUrl?: string;
  setImageUrl?: (url: string) => void;
  categories: Category[];
  editingCategory: Category | null;
}

export function CategoryModal({ 
  isOpen, onClose, onSave, onDelete, 
  name, setName, parentId, setParentId, 
  imageUrl, setImageUrl,
  categories, editingCategory 
}: CategoryModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? "CONFIGURATION CATÉGORIE" : "DÉPLOYER NOUVELLE CATÉGORIE"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-8 bg-[#05070a] p-8 rounded-[3rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1">NOM DE LA CLASSIFICATION *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-base font-black placeholder:text-slate-800 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner uppercase italic"
            placeholder="EX: ÉLECTRONIQUE, ALIMENTATION..."
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1 flex items-center gap-2">
            <FolderTree size={12} /> ARCHITECTURE PARENTE
          </label>
          <div className="relative group">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all shadow-inner cursor-pointer appearance-none italic"
            >
              <option value="" className="bg-[#0a0c10] text-slate-700">RACINE DU SYSTÈME (MAIN)</option>
              {getHierarchicalCategories(categories.filter((c: Category) => c.id !== editingCategory?.id)).map((c: any) => (
                <option key={c.id} value={c.id} className="bg-[#0a0c10] text-white">
                  {'—'.repeat(c.level)} {c.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
          </div>
        </div>
        
        {setImageUrl && (
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic ml-1">ASSET VISUEL</label>
            <div className="flex gap-6 items-center bg-black/20 p-6 rounded-[2rem] border border-white/5 ring-1 ring-white/5 shadow-inner">
              <div className="w-24 h-24 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-2xl">
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Aperçu" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <button 
                      onClick={() => setImageUrl('')}
                      className="absolute inset-0 bg-rose-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-all backdrop-blur-sm"
                    >
                      <Trash2 size={24} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={32} className="text-slate-800" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                  <button 
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'url' ? 'bg-indigo-600 text-white shadow-neon-indigo italic' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <LinkIcon size={12} /> URL CLOUD
                  </button>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-neon-indigo italic' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    <Upload size={12} /> LOCAL DISK
                  </button>
                </div>
                
                {activeTab === 'url' ? (
                  <input
                    type="url"
                    value={imageUrl || ''}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="HTTPS://ASSETS.NEXUS.CLOUD/..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-[10px] font-black italic outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner placeholder:text-slate-800"
                  />
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
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
                              
                              // Convert to WebP with 0.5 quality for maximum compression, fallback to JPEG if needed
                              let dataUrl = canvas.toDataURL('image/webp', 0.5);
                              const targetType = dataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
                              if (targetType === 'image/jpeg') {
                                dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                              } 
                              
                              if (setImageUrl) {
                                // Upload blob to active Supabase storage bucket, falling back to dataUrl
                                canvas.toBlob(async (blob) => {
                                  if (!blob) {
                                    setImageUrl(dataUrl);
                                    return;
                                  }
                                  try {
                                    const publicUrl = await uploadImageBlobToStorage(blob, 'categories', targetType);
                                    if (publicUrl) {
                                      setImageUrl(publicUrl);
                                    } else {
                                      setImageUrl(dataUrl);
                                    }
                                  } catch (err) {
                                    console.warn("[Category storage upload] Failed, using offline dataUrl", err);
                                    setImageUrl(dataUrl);
                                  }
                                }, targetType, 0.5);
                              }
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-[9px] font-black text-slate-600 flex justify-center items-center gap-3 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-all shadow-inner italic">
                      <Upload size={14} strokeWidth={3} />
                      INITIALISER UPLOAD DISQUE
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            onClick={onSave}
            className="flex-1 py-5 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-neon-indigo border border-indigo-400 ring-1 ring-white/20 transition-all active:scale-95 italic relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
            VALIDER DATA
          </button>
          {editingCategory && (
            <button
              onClick={onDelete}
              className="flex-1 py-5 rounded-[1.5rem] bg-rose-600/10 border border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 italic"
            >
              PURGER / DELETE
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
