import React from 'react';
import {
  Store,
  ImageIcon,
  MapPin,
  Hash,
  Phone,
  Mail,
  Trash2,
  Plus,
  Building2,
  FileSpreadsheet,
  Clock,
  MessageCircle
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { generateUniqueId } from '../../lib/utils';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function StoreSection({ formData, setFormData }: SectionProps) {
  const anyData = formData as any;

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const inputCls =
    "w-full h-11 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs font-bold";

  return (
    <div className="space-y-6">
      {/* Bloc 1 : Identité Principale */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Store size={17} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Identité du Magasin & Coordonnées</h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Informations imprimées sur les tickets de caisse, factures A4 et catalogues</p>
            </div>
          </div>
          {formData.logoUrl && (
            <img
              src={formData.logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-lg object-contain border border-slate-200 dark:border-zinc-700 bg-white p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Nom de l'établissement</label>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => updateField('name', e.target.value)}
                className={inputCls}
                placeholder="Ex: Supermarché Nexus Pro"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Slogan / Sous-titre commercial</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={anyData.slogan || ''}
                onChange={e => updateField('slogan', e.target.value)}
                className={inputCls}
                placeholder="Ex: Alimentation Générale, Gros & Détail"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Téléphone Principal</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => updateField('phone', e.target.value)}
                className={inputCls}
                placeholder="Ex: 0550 00 00 00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">WhatsApp Service Client</label>
            <div className="relative">
              <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
              <input
                type="text"
                value={anyData.whatsappPhone || formData.phone || ''}
                onChange={e => updateField('whatsappPhone', e.target.value)}
                className={inputCls}
                placeholder="Ex: +213 550 00 00 00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Adresse Physique & Wilaya</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => updateField('address', e.target.value)}
                className={inputCls}
                placeholder="Ex: Rue Didouche Mourad, Alger (16)"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">E-mail Professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => updateField('email', e.target.value)}
                className={inputCls}
                placeholder="contact@monmagasin.dz"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">URL du Logo (Ticket & Factures)</label>
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={formData.logoUrl || ''}
                onChange={e => updateField('logoUrl', e.target.value)}
                className={inputCls}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Horaires d'ouverture (Affichés sur ticket)</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={anyData.openingHours || ''}
                onChange={e => updateField('openingHours', e.target.value)}
                className={inputCls}
                placeholder="Ex: Sam - Jeu : 08h00 à 21h00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 2 : Mentions Légales & Fiscales Algérie (NIF / NIS / RC / AI) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet size={17} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Identifiants Légaux & Fiscaux (Algérie)</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Mentions obligatoires pour vos factures, bons de livraison et déclarations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">N° Identification Fiscale (NIF)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={formData.taxNumber || ''}
                onChange={e => updateField('taxNumber', e.target.value)}
                className={inputCls}
                placeholder="NIF : 0000..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Registre de Commerce (RC)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={anyData.rcNumber || ''}
                onChange={e => updateField('rcNumber', e.target.value)}
                className={inputCls}
                placeholder="RC : 16/00-..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Article d'Imposition (AI)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={anyData.aiNumber || ''}
                onChange={e => updateField('aiNumber', e.target.value)}
                className={inputCls}
                placeholder="AI : 1600..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase tracking-wider">N° Statistique (NIS)</label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={anyData.nisNumber || ''}
                onChange={e => updateField('nisNumber', e.target.value)}
                className={inputCls}
                placeholder="NIS : 099..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bloc 3 : Multi-Sites (Magasins & Dépôts) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin size={17} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Gestion Multi-Sites (Points de Vente & Dépôts)</h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Ajoutez vos magasins secondaires ou dépôts de stockage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                siteLocations: [
                  ...(formData.siteLocations || []),
                  { id: generateUniqueId(), name: '', address: '', type: 'store' }
                ]
              })
            }
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} /> Ajouter un site
          </button>
        </div>

        <div className="space-y-2.5">
          {(formData.siteLocations || []).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500 py-3 text-center">
              Aucun site secondaire configuré. Cliquez sur « + Ajouter un site » pour ajouter un dépôt ou point de vente.
            </p>
          ) : (
            formData.siteLocations?.map((site, idx) => (
              <div
                key={site.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700"
              >
                <input
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none text-xs font-bold"
                  placeholder="Nom du site (ex: Dépôt Central / Magasin 2)"
                  value={site.name}
                  onChange={e => {
                    const newSites = [...(formData.siteLocations || [])];
                    newSites[idx].name = e.target.value;
                    setFormData({ ...formData, siteLocations: newSites });
                  }}
                />
                <input
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none text-xs"
                  placeholder="Adresse / Emplacement"
                  value={site.address || ''}
                  onChange={e => {
                    const newSites = [...(formData.siteLocations || [])];
                    newSites[idx].address = e.target.value;
                    setFormData({ ...formData, siteLocations: newSites });
                  }}
                />
                <select
                  value={site.type}
                  onChange={e => {
                    const newSites = [...(formData.siteLocations || [])];
                    newSites[idx].type = e.target.value as 'warehouse' | 'store';
                    setFormData({ ...formData, siteLocations: newSites });
                  }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                >
                  <option value="store">🏪 Point de Vente</option>
                  <option value="warehouse">📦 Entrepôt / Dépôt</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      siteLocations: formData.siteLocations?.filter((_, i) => i !== idx)
                    })
                  }
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Supprimer ce site"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
