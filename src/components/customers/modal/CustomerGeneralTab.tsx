import React from 'react';
import { User, Phone, Mail, MapPin, Compass, Crosshair } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerGeneralTabProps {
  formData: any;
  setFormData: (data: any) => void;
}

export const CustomerGeneralTab: React.FC<CustomerGeneralTabProps> = ({
  formData,
  setFormData,
}) => {
  const handleCaptureGps = () => {
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
  };

  return (
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
            onClick={handleCaptureGps}
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
  );
};
