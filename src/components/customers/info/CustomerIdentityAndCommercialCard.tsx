import React from 'react';
import { Customer, CompanySettings } from '../../../types';
import { 
  Contact, Phone, MapPin, Briefcase, Calendar, 
  Smartphone, Store, Compass, Navigation, Copy, Quote 
} from 'lucide-react';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatSafe } from '../../../lib/utils';
import { 
  hasCustomerGps, 
  getCustomerGpsCoordinates, 
  getCustomerGoogleMapsUrl, 
  getCustomerWazeUrl 
} from '../../../lib/delivery-itinerary';

export interface CustomerIdentityAndCommercialCardProps {
  selectedCustomer: Customer;
  settings: CompanySettings;
}

export function CustomerIdentityAndCommercialCard({
  selectedCustomer,
  settings
}: CustomerIdentityAndCommercialCardProps) {
  const currency = settings.currency || 'DA';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tableau Coordonnées & Identité */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Contact size={15} /> Identité & Coordonnées
            </h4>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              ID: {selectedCustomer.id}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] w-1/3">Nom Complet</td>
                  <td className="py-2.5 px-3.5 font-black text-white text-xs uppercase tracking-wide">{selectedCustomer.name || 'Client sans nom'}</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Téléphone</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.phone ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400 text-xs tracking-wider">{selectedCustomer.phone}</span>
                        <a 
                          href={`tel:${selectedCustomer.phone}`}
                          className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                          title="Appeler"
                        >
                          <Phone size={11} /> Appeler
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-500">Non renseigné</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Email</td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-200">
                    {selectedCustomer.email ? (
                      <a href={`mailto:${selectedCustomer.email}`} className="text-indigo-400 hover:underline">
                        {selectedCustomer.email}
                      </a>
                    ) : (
                      <span className="text-slate-500">Non renseigné</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] align-top">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-rose-400" />
                      <span>Adresse & GPS</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex flex-col gap-2">
                      <div className="text-slate-200 font-medium">
                        {[selectedCustomer.address, selectedCustomer.city].filter(Boolean).join(', ') || (
                          <span className="text-slate-500 italic">Non renseignée</span>
                        )}
                      </div>

                      {hasCustomerGps(selectedCustomer) && (() => {
                        const gps = getCustomerGpsCoordinates(selectedCustomer);
                        if (!gps) return null;
                        return (
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                🎯
                              </div>
                              <div>
                                <span className="text-[10px] font-mono font-bold text-emerald-400 block tracking-tight">
                                  GPS: {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Adresse Principale Enregistrée
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getCustomerGoogleMapsUrl(selectedCustomer)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                title="Ouvrir itinéraire Google Maps"
                              >
                                <Compass size={12} /> Maps
                              </a>
                              <a
                                href={getCustomerWazeUrl(selectedCustomer)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                                title="Ouvrir navigation Waze"
                              >
                                <Navigation size={12} /> Waze
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${gps.latitude},${gps.longitude}`);
                                  toast.success("Coordonnées GPS copiées !");
                                }}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                                title="Copier les coordonnées GPS"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Canal d'adhésion</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.isAppUser ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider">
                        <Smartphone size={12} className="text-indigo-400" />
                        Compte Créé sur l'Application Mobile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                        <Store size={12} />
                        Client Enregistré en Caisse (POS)
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Date d'adhésion</td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-300">
                    {selectedCustomer.joinDate ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-indigo-400" />
                        {formatSafe(selectedCustomer.joinDate, 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    ) : (
                      <span className="text-slate-500">Inconnue</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tableau Profil Commercial & Conditions */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={15} /> Profil Commercial & Conditions
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              selectedCustomer.isWholesale 
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
            }`}>
              {selectedCustomer.isWholesale ? "Grossiste" : "Détail / Standard"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-slate-800/60">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px] w-1/3">N° Carte Fidélité</td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-mono font-black text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md">
                      {selectedCustomer.loyaltyCardNumber || 'NON ASSIGNÉ'}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Tarification</td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-bold text-white text-xs">
                      {selectedCustomer.isWholesale ? "Prix de gros appliqué" : "Prix public normal"}
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Plafond Crédit</td>
                  <td className="py-2.5 px-3.5 font-mono font-bold text-amber-400 text-xs">
                    {(selectedCustomer.creditLimit || 0) > 0 
                      ? `${Number(selectedCustomer.creditLimit).toFixed(2)} ${currency}` 
                      : <span className="text-slate-400 font-sans font-bold">Sans plafond</span>
                    }
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Accès App Client</td>
                  <td className="py-2.5 px-3.5">
                    {selectedCustomer.isAppUser ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Smartphone size={10} /> Compte Actif
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Non enregistré sur l'App</span>
                    )}
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3.5 text-slate-400 font-bold uppercase text-[11px]">Situation Solde</td>
                  <td className="py-2.5 px-3.5">
                    {(Number(selectedCustomer.balance) || 0) < 0 ? (
                      <span className="font-mono font-black text-xs text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md">
                        Dette : {Math.abs(Number(selectedCustomer.balance) || 0).toFixed(2)} {currency}
                      </span>
                    ) : (Number(selectedCustomer.balance) || 0) > 0 ? (
                      <span className="font-mono font-black text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        Solde : +{Number(selectedCustomer.balance || 0).toFixed(2)} {currency}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-xs">
                        À jour (0.00 {currency})
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Note Interne si présente */}
      {selectedCustomer.notes && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-md">
          <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-1.5">
            <Quote size={14} /> Note Interne sur le Client
          </h5>
          <p className="text-xs font-medium text-amber-200/90 leading-relaxed">
            "{selectedCustomer.notes}"
          </p>
        </div>
      )}
    </>
  );
}
