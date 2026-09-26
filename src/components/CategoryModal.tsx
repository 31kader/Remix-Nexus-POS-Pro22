import React, { useState } from 'react';
import { Modal } from './ui';
import { SafeImage } from './ui/SafeImage';
import { Category } from '../types';
import { getHierarchicalCategories } from '../lib/utils';
import { Image as ImageIcon, Upload, Link as LinkIcon, Trash2, FolderTree, ChevronDown } from 'lucide-react';
import { uploadImageBlobToStorage } from '../supabase';
import { toast } from 'sonner';

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

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  name,
  setName,
  parentId,
  setParentId,
  imageUrl,
  setImageUrl,
  categories,
  editingCategory
}: CategoryModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCategory ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight block">
            Nom de la Catégorie *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="Ex: Alimentation, Boissons, Hygiène..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight flex items-center gap-1.5">
            <FolderTree size={14} className="text-indigo-500" /> Catégorie Parente (Optionnel)
          </label>
          <div className="relative">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl py-3 px-4 pr-10 text-slate-900 dark:text-white text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
            >
              <option value="" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                — Catégorie Principale (Racine) —
              </option>
              {getHierarchicalCategories(
                categories.filter((c: Category) => c.id !== editingCategory?.id)
              ).map((c: any) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                >
                  {'—'.repeat(c.level)} {String(c.name || 'Catégorie')}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400 pointer-events-none"
            />
          </div>
        </div>

        {setImageUrl && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-tight block">
              Illustration / Icône (Optionnel)
            </label>
            <div className="flex gap-4 items-center bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
              <div className="w-20 h-20 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {imageUrl ? (
                  <>
                    <SafeImage
                      src={imageUrl}
                      alt="Aperçu"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute inset-0 bg-rose-600/75 opacity-90 sm:opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Supprimer l'image"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={28} className="text-slate-400 dark:text-zinc-600" />
                )}
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex bg-slate-200/70 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === 'url'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <LinkIcon size={12} /> Lien URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      activeTab === 'upload'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Upload size={12} /> Fichier local
                  </button>
                </div>

                {activeTab === 'url' ? (
                  <input
                    type="url"
                    value={imageUrl || ''}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.webp"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  />
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
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

                              if (setImageUrl) {
                                canvas.toBlob(
                                  async (blob) => {
                                    if (!blob) {
                                      setImageUrl(dataUrl);
                                      return;
                                    }
                                    try {
                                      const publicUrl = await uploadImageBlobToStorage(
                                        blob,
                                        'categories',
                                        targetType
                                      );
                                      if (publicUrl) {
                                        setImageUrl(publicUrl);
                                      } else {
                                        setImageUrl(dataUrl);
                                      }
                                    } catch (err) {
                                      console.warn(
                                        '[Category storage upload] Failed, using offline dataUrl',
                                        err
                                      );
                                      setImageUrl(dataUrl);
                                    }
                                  },
                                  targetType,
                                  0.5
                                );
                              }
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 flex justify-center items-center gap-2 group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <Upload size={14} />
                      Choisir une image sur l'appareil
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Enregistrer la catégorie
          </button>
          {editingCategory && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
