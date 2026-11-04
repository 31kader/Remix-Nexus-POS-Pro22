import React from 'react';
import { Customer, CompanySettings } from '../../../types';
import { 
  Contact, Phone, MapPin, Briefcase, Calendar, 
  Smartphone, Store, Compass, Navigation, Copy, Quote,
  CreditCard, ShieldCheck, Mail
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatSafe, cn } from '../../../lib/utils';
import { 
  hasCustomerGps, 
  getCustomerGpsCoordinates, 
  getCustomerGoogleMapsUrl, 
  getCustomerWazeUrl 
} from '../../../lib/delivery-itinerary';

export interface CustomerIdentityAndCommercialCardProps {
  selectedCustomer: Customer;
  settings?: CompanySettings;
  onOpenStatement?: () => void;
}

export function CustomerIdentityAndCommercialCard({
  selectedCustomer,
  settings,
  onOpenStatement
}: CustomerIdentityAndCommercialCardProps) {
  const currency = settings?.currency || 'DA';
  const balance = Number(selectedCustomer.balance) || 0;
  const gps = hasCustomerGps(selectedCustomer) ? getCustomerGpsCoordinates(selectedCustomer) : null;

  return (
    <div className="space-y-4 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Carte Identité & Coordonnées Satinée */}
        <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Contact size={15} />
              <span>Coordonnées & Contact</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
              ID: {selectedCustomer.id.slice(0, 8)}…
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Nom */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1">
                Nom complet
              </span>
              <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm block truncate">
                {selectedCustomer.name || 'Client sans nom'}
              </span>
            </div>

            {/* Téléphone */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1">
                Téléphone mobile
              </span>
              {selectedCustomer.phone ? (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {selectedCustomer.phone}
                  </span>
                  <a 
                    href={`tel:${selectedCustomer.phone}`}
                    className="p-1 px-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all flex items-center gap-1 text-[10px] font-bold"
                    title="Appeler directement"
                  >
                    <Phone size={11} /> Appeler
                  </a>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-zinc-500 text-xs italic">Non renseigné</span>
              )}
            </div>

            {/* Email */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1">
                Adresse e-mail
              </span>
              {selectedCustomer.email ? (
                <a 
                  href={`mailto:${selectedCustomer.email}`} 
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-xs flex items-center gap-1.5 truncate"
                >
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{selectedCustomer.email}</span>
                </a>
              ) : (
                <span className="text-slate-400 dark:text-zinc-500 text-xs italic">Non renseignée</span>
              )}
            </div>

            {/* Date d'adhésion */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1">
                Date d'inscription
              </span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300 text-xs flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400 shrink-0" />
                <span>
                  {selectedCustomer.joinDate 
                    ? formatSafe(selectedCustomer.joinDate, 'dd MMMM yyyy', { locale: fr })
                    : 'Date inconnue'
                  }
                </span>
              </span>
            </div>

            {/* Adresse & GPS pleine largeur */}
            <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04] space-y-2">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                <MapPin size={12} className="text-rose-400" />
                <span>Adresse postale & Localisation</span>
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(', ') || (
                  <span className="text-slate-400 dark:text-zinc-500 font-normal italic">Aucune adresse renseignée</span>
                )}
              </p>

              {gps && (
                <div className="p-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      GPS: {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={getCustomerGoogleMapsUrl(selectedCustomer)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Compass size={11} /> Maps
                    </a>
                    <a
                      href={getCustomerWazeUrl(selectedCustomer)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      <Navigation size={11} /> Waze
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${gps.latitude},${gps.longitude}`);
                        toast.success("Coordonnées GPS copiées !");
                      }}
                      className="p-1 rounded-lg bg-slate-200/60 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 transition-all cursor-pointer"
                      title="Copier les coordonnées GPS"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Carte Profil Commercial & Avantages Satinée */}
        <div className="bg-white/85 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Briefcase size={15} />
              <span>Profil Commercial & Conditions</span>
            </h4>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
              selectedCustomer.isWholesale 
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30" 
                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30"
            )}>
              {selectedCustomer.isWholesale ? "Grossiste B2B" : "Client Particulier"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-financial">
            {/* N° Carte Fidélité */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1 font-sans">
                N° Carte Fidélité
              </span>
              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md inline-block">
                {selectedCustomer.loyaltyCardNumber || 'NON ASSIGNÉ'}
              </span>
            </div>

            {/* Tarification */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1 font-sans">
                Grille Tarifaire
              </span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs font-sans">
                {selectedCustomer.isWholesale ? "Tarif Grossiste appliqué" : "Prix Public Standard"}
              </span>
            </div>

            {/* Plafond de Crédit */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1 font-sans">
                Plafond de Crédit Autorisé
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs tabular-nums">
                {(selectedCustomer.creditLimit || 0) > 0 
                  ? `${Number(selectedCustomer.creditLimit).toFixed(0)} ${currency}` 
                  : <span className="font-sans font-medium text-slate-500 dark:text-zinc-400">Illimité / Sans plafond</span>
                }
              </span>
            </div>

            {/* Situation Solde */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04]">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block mb-1 font-sans">
                Situation Solde Net
              </span>
              {balance < 0 ? (
                <span className="font-bold text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-lg inline-block tabular-nums">
                  Dette : {Math.abs(balance).toFixed(0)} {currency}
                </span>
              ) : balance > 0 ? (
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg inline-block tabular-nums">
                  Avoir : +{balance.toFixed(0)} {currency}
                </span>
              ) : (
                <span className="font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg inline-block text-xs">
                  À jour (0 DA)
                </span>
              )}
            </div>

            {/* Canal & Accès App Mobile */}
            <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block font-sans">
                  Canal d'origine & Accès Mobile
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5 font-sans">
                  {selectedCustomer.isAppUser ? (
                    <>
                      <Smartphone size={13} className="text-indigo-400" />
                      <span>Compte synchronisé sur l'Application Mobile</span>
                    </>
                  ) : (
                    <>
                      <Store size={13} className="text-slate-400" />
                      <span>Client enregistré au terminal de caisse physique</span>
                    </>
                  )}
                </span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                selectedCustomer.isAppUser
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700"
              )}>
                {selectedCustomer.isAppUser ? "Actif Mobile" : "Caisse Seule"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Note Interne si présente */}
      {selectedCustomer.notes && (
        <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 shadow-2xs">
          <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-1">
            <Quote size={14} />
            <span>Mémo Interne sur le Client</span>
          </h5>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed font-medium">
            "{selectedCustomer.notes}"
          </p>
        </div>
      )}
    </div>
  );
}
