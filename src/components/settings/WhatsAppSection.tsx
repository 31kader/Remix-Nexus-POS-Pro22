import React from 'react';
import { MessageSquare, Send, Smartphone, Sparkles, Info } from 'lucide-react';
import { CompanySettings } from '../../types';

interface SectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

export function WhatsAppSection({ formData, setFormData }: SectionProps) {
  const sampleDebtText = (formData.whatsappDebtReminderTemplate || 'Bonjour {customer_name}, votre solde restant dû chez {store_name} est de {debt_amount} {currency}. Merci de votre confiance !')
    .replace('{customer_name}', 'M. Karim')
    .replace('{store_name}', formData.name || 'NEXUS STORE')
    .replace('{debt_amount}', '12,500')
    .replace('{currency}', formData.currency || 'DA');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Modèle de Rappel de Dette */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-white uppercase flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-400" />
              Modèle de Rappel de Dette Client
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Message envoyé en 1 clic via WhatsApp depuis le Carnet de Dettes.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-emerald-400 px-2 py-1 rounded-md">{'{customer_name}'}</span>
              <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-emerald-400 px-2 py-1 rounded-md">{'{store_name}'}</span>
              <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-emerald-400 px-2 py-1 rounded-md">{'{debt_amount}'}</span>
              <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-emerald-400 px-2 py-1 rounded-md">{'{currency}'}</span>
            </div>
            <textarea
              rows={4}
              value={formData.whatsappDebtReminderTemplate ?? ''}
              onChange={e => setFormData({ ...formData, whatsappDebtReminderTemplate: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all font-medium resize-none leading-relaxed"
              placeholder="Bonjour {customer_name}, votre solde chez {store_name} est de {debt_amount} {currency}..."
            />
          </div>

          {/* Modèle de Ticket Dématérialisé */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <h4 className="text-xs font-extrabold text-white uppercase flex items-center gap-2">
              <Send size={16} className="text-indigo-400" />
              Modèle de Reçu Dématérialisé (Ticket WhatsApp)
            </h4>
            <textarea
              rows={3}
              value={formData.whatsappReceiptTemplate ?? ''}
              onChange={e => setFormData({ ...formData, whatsappReceiptTemplate: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-medium resize-none leading-relaxed"
              placeholder="Bonjour {customer_name}, voici votre reçu de chez {store_name} pour un total de {total} {currency}..."
            />
          </div>
        </div>

        {/* Aperçu Virtuel Smartphone */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-xs bg-slate-950 border border-white/10 rounded-[2rem] p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  <Smartphone size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Aperçu WhatsApp</p>
                  <p className="text-[8px] text-emerald-400">En direct</p>
                </div>
              </div>
              <span className="text-[9px] text-white/30">12:30</span>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 text-xs text-white/90 leading-relaxed font-sans shadow-inner">
              {sampleDebtText}
            </div>

            <div className="text-center">
              <p className="text-[9px] text-slate-500">Les variables s'adaptent automatiquement à chaque client.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
