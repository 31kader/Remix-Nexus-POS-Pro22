import React, { useState } from 'react';
import { 
  Smartphone, Eye, EyeOff, User, Phone, Mail, MapPin, 
  Award, ShieldCheck, Briefcase, Sparkles, Compass, Crosshair 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from './ui';

interface CustomersEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: any;
  formData: any;
  setFormData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function CustomersEditModal({
  isOpen,
  onClose,
  editingCustomer,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  handleSubmit
}: CustomersEditModalProps) {
  const [modalTab, setModalTab] = useState<'general' | 'commercial' | 'app'>('general');

  const generateFidelityCard = () => {
    let digits = "";
    for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10).toString();
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    setFormData({ ...formData, loyaltyCardNumber: digits + checkDigit });
  };

  const generateRandomPassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0; i < 8; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password: retVal });
    setShowPassword(true);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingCustomer ? "Modifier la Fiche Client" : "Nouveau Client"}
    >
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
        <button
          type="button"
          onClick={() => setModalTab('general')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'general'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <User size={14} /> Identité & Contact
        </button>
        <button
          type="button"
          onClick={() => setModalTab('commercial')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'commercial'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase size={14} /> Conditions & Fidélité
        </button>
        <button
          type="button"
          onClick={() => setModalTab('app')}
          className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
            modalTab === 'app'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Smartphone size={14} /> Accès Mobile
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-slate-900 dark:text-white">
        {modalTab === 'general' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-indigo-500" />
                Nom Complet *
              </label>
              <input 
                required 
                placeholder="Ex: Mohamed Benali"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 dark:text-white transition-all" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={13} className="text-indigo-500" />
                  Téléphone
                </label>
                <input 
                  placeholder="0550 00 00 00"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 dark:text-white transition-all" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={13} className="text-indigo-500" />
                  Email
                </label>
                <input 
                  type="email" 
                  placeholder="client@exemple.com"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-900 dark:text-white transition-all" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-indigo-500" />
                  Adresse de Livraison
                </label>
                <input 
                  placeholder="Rue, N°, Bâtiment..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-900 dark:text-white transition-all" 
                  value={formData.address || ''} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ville / Wilaya
                </label>
                <input 
                  placeholder="Ex: Alger, Oran..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-900 dark:text-white transition-all" 
                  value={formData.city || ''} 
                  onChange={e => setFormData({ ...formData, city: e.target.value })} 
                />
              </div>
            </div>

            {/* Localisation GPS Principale */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass size={14} className="text-emerald-500" />
                  Position GPS Principale
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error("Géolocalisation non supportée par ce navigateur.");
                      return;
                    }
                    toast.info("Acquisition de la position GPS en cours...");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        setFormData({
                          ...formData,
                          latitude: lat,
                          longitude: lng,
                          mapsUrl: `https://maps.google.com/?q=${lat},${lng}`
                        });
                        toast.success(`Position GPS acquise : ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                      },
                      (err) => {
                        toast.error("Impossible de récupérer la position GPS : " + err.message);
                      },
                      { enableHighAccuracy: true, timeout: 10000 }
                    );
                  }}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-all flex items-center gap-1 border border-emerald-300 dark:border-emerald-800"
                >
                  <Crosshair size={12} /> Capturer GPS Actuel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Latitude</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: 35.75495"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.latitude ?? ''}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Longitude</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Ex: -0.55099"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={formData.longitude ?? ''}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    🎯 Coordonnées : {formData.latitude}, {formData.longitude}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${formData.latitude},${formData.longitude}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Compass size={11} /> Tester sur Maps
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Notes & Remarques Internes
              </label>
              <textarea 
                placeholder="Préférences de commande, instructions spécifiques..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-900 dark:text-white transition-all h-20" 
                value={formData.notes} 
                onChange={e => setFormData({ ...formData, notes: e.target.value })} 
              />
            </div>
          </div>
        )}

        {modalTab === 'commercial' && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} className="text-amber-500" />
                Numéro de Carte de Fidélité
              </label>
              <div className="relative">
                <input 
                  placeholder="Code barre ou identifiant de carte..."
                  className="w-full p-3 pr-28 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider" 
                  value={formData.loyaltyCardNumber} 
                  onChange={e => setFormData({ ...formData, loyaltyCardNumber: e.target.value })} 
                />
                <button
                  type="button"
                  onClick={generateFidelityCard}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                >
                  <Sparkles size={12} /> Auto
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Tarif Client Grossiste
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Appliquer automatiquement les prix de gros lors des ventes en caisse
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                  checked={!!formData.isWholesale}
                  onChange={e => setFormData({ ...formData, isWholesale: e.target.checked })}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Plafond de Crédit Autorisé (DA)
                </label>
                <input 
                  type="number" 
                  min="0"
                  step="100"
                  placeholder="0 = Pas de limite"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-sm text-slate-900 dark:text-white"
                  value={formData.creditLimit || ''}
                  onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Alerte en caisse si la dette du client dépasse ce seuil.
                </p>
              </div>
            </div>
          </div>
        )}

        {modalTab === 'app' && (
          <div className="flex flex-col gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Accès Application Client
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Permet au client de consulter son solde, ses points et son historique en ligne
                </p>
              </div>
              <input 
                type="checkbox" 
                className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                checked={formData.isAppUser}
                onChange={e => setFormData({ ...formData, isAppUser: e.target.checked })}
              />
            </div>
            
            {formData.isAppUser && (
              <div className="mt-2 pt-4 border-t border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div>
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Mot de passe de Connexion
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder={editingCustomer ? "Laisser vide pour conserver le mot de passe..." : "Définir un mot de passe..."}
                      className="w-full p-3 pr-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono font-bold text-slate-900 dark:text-white"
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-bold uppercase transition-colors"
                      >
                        Générer
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
                  L'adresse email <strong className="font-bold">{formData.email || '(non renseignée)'}</strong> servira d'identifiant de connexion pour le client sur l'application.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose} 
            className="w-1/3 py-3"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            className="w-2/3 py-3 font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {editingCustomer ? "Enregistrer les modifications" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
