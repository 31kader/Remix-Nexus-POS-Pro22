import React from 'react';
import { 
  Keyboard, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  Zap, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { Card } from '../ui';
import { toast } from 'sonner';

interface ShortcutsSectionProps {
  formData: CompanySettings;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettings>>;
}

interface ShortcutDef {
  key: string;
  description: string;
  action: string;
  category: 'caisse' | 'panier' | 'navigation';
  badgeColor?: string;
}

const POS_SHORTCUTS: ShortcutDef[] = [
  { key: 'F1', description: 'Recherche Produit / Focus Scan', action: 'Met le curseur directement dans la barre de code-barres', category: 'caisse', badgeColor: 'bg-indigo-600' },
  { key: 'F2', description: 'Encaissement Rapide Espèces', action: 'Valide la vente au montant exact sans calculatrice', category: 'caisse', badgeColor: 'bg-emerald-600' },
  { key: 'F3', description: 'Assigner Client', action: 'Ouvre le sélecteur rapide de client pour fidélité ou crédit', category: 'caisse', badgeColor: 'bg-blue-600' },
  { key: 'F4', description: 'Mise en Attente (Park Sale)', action: 'Parque le panier actuel ou rappelle un ticket en attente', category: 'caisse', badgeColor: 'bg-amber-600' },
  { key: 'F6', description: 'Remise Exceptionnelle', action: 'Applique une remise en pourcentage ou en DA sur le ticket', category: 'caisse', badgeColor: 'bg-purple-600' },
  { key: 'F8', description: 'Vente à Crédit / Dette', action: 'Enregistre le ticket sur le solde dette du client', category: 'caisse', badgeColor: 'bg-rose-600' },
  { key: 'F9', description: 'Bascule Mode Tarifaire', action: 'Alterne instantanément entre Prix Détail, Demi-Gros et Gros', category: 'caisse', badgeColor: 'bg-cyan-600' },
  { key: 'F10', description: 'Ouverture Tiroir-Caisse', action: 'Déclenche l\'impulsion du tiroir sans validation de vente', category: 'caisse', badgeColor: 'bg-zinc-700' },
  { key: 'Entrée', description: 'Valider / Ajouter Ligne', action: 'Confirme la saisie du code scanné ou valide le paiement', category: 'panier', badgeColor: 'bg-emerald-700' },
  { key: 'Échap', description: 'Fermer / Annuler', action: 'Ferme la fenêtre active, le tiroir ou annule la saisie en cours', category: 'panier', badgeColor: 'bg-rose-700' },
  { key: '+ / -', description: 'Quantité +/- 1', action: 'Incrémente ou décrémente la quantité de la dernière ligne scannée', category: 'panier', badgeColor: 'bg-slate-700' },
  { key: 'Suppr', description: 'Retirer la Ligne', action: 'Supprime l\'article sélectionné du panier de caisse', category: 'panier', badgeColor: 'bg-red-800' },
];

const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  { key: 'Ctrl + B', description: 'Menu Latéral Réduit/Déplié', action: 'Bascule la barre latérale en mode compact (68px) ou étendu', category: 'navigation' },
  { key: 'Ctrl + K', description: 'Recherche Globale', action: 'Ouvre la palette de commande instantanée de l\'application', category: 'navigation' },
  { key: 'Alt + C', description: 'Aller à la Caisse (POS)', action: 'Bascule immédiatement vers l\'écran de vente directe', category: 'navigation' },
  { key: 'Alt + V', description: 'Historique des Ventes', action: 'Ouvre le journal des transactions et reçus récents', category: 'navigation' },
  { key: 'Alt + S', description: 'Gestion des Stocks', action: 'Accède au catalogue produits et à l\'inventaire', category: 'navigation' },
];

export function ShortcutsSection({ formData, setFormData }: ShortcutsSectionProps) {
  const isEnabled = formData.enableKeyboardShortcuts ?? true;

  const handlePrintShortcuts = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=900');
    if (!printWindow) {
      toast.error('Veuillez autoriser les fenêtres pop-up pour imprimer.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Aide-Mémoire Raccourcis Caisse — Nexus POS Pro</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #111; line-height: 1.4; }
            h1 { font-size: 18px; margin-bottom: 4px; text-transform: uppercase; }
            .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; font-size: 12px; text-align: left; }
            th { background: #f4f4f5; text-transform: uppercase; font-size: 11px; }
            kbd { background: #18181b; color: #fff; padding: 3px 7px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 12px; }
            .footer { font-size: 10px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Touches Rapides de Caisse (POS)</h1>
          <div class="subtitle">Aide-mémoire à afficher près de la caisse — Nexus POS Pro v1.2.78</div>
          <table>
            <thead>
              <tr><th style="width: 100px;">Touche</th><th>Action & Rôle</th><th>Description</th></tr>
            </thead>
            <tbody>
              ${POS_SHORTCUTS.map(s => `
                <tr>
                  <td><kbd>${s.key}</kbd></td>
                  <td><strong>${s.description}</strong></td>
                  <td>${s.action}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h1>Navigation Clavier Globale</h1>
          <table>
            <thead>
              <tr><th style="width: 120px;">Combinaison</th><th>Navigation</th><th>Description</th></tr>
            </thead>
            <tbody>
              ${GLOBAL_SHORTCUTS.map(s => `
                <tr>
                  <td><kbd>${s.key}</kbd></td>
                  <td><strong>${s.description}</strong></td>
                  <td>${s.action}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">Imprimé depuis Nexus POS Pro — Solution de caisse offline-first</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Entête & Interrupteur Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-white/5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0">
            <Keyboard size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Raccourcis Clavier en Caisse</h3>
              <span className="text-[9px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                Haute Vitesse (POS)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active les touches de fonction directes F1 à F12 et le pilotage sans souris.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrintShortcuts}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 text-xs font-bold transition-all cursor-pointer"
            title="Imprimer un aide-mémoire plastifiable pour le comptoir"
          >
            <Printer size={15} />
            <span>Imprimer Aide-Mémoire</span>
          </button>

          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={isEnabled}
              onChange={e => setFormData({ ...formData, enableKeyboardShortcuts: e.target.checked })}
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>
      </div>

      {/* 2. Grille des Raccourcis de Caisse (POS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h4 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2 tracking-wider">
            <Zap size={15} className="text-amber-400" />
            Touches de Fonction Caisse Directe
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">12 raccourcis actifs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {POS_SHORTCUTS.map(shortcut => (
            <div 
              key={shortcut.key}
              className="p-3.5 bg-slate-900/80 border border-white/5 hover:border-violet-500/30 rounded-xl transition-all flex flex-col justify-between group shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-white font-mono font-black text-xs shadow-md shrink-0",
                  shortcut.badgeColor || "bg-zinc-800"
                )}>
                  {shortcut.key}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 text-right truncate">
                  {shortcut.category === 'caisse' ? 'Vente' : 'Panier'}
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                  {shortcut.description}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                  {shortcut.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Navigation Globale */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black uppercase text-slate-300 flex items-center gap-2 tracking-wider ml-1">
          <Layers size={15} className="text-indigo-400" />
          Raccourcis de Navigation Globale
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GLOBAL_SHORTCUTS.map(shortcut => (
            <div 
              key={shortcut.key}
              className="p-3.5 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-bold text-white">{shortcut.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{shortcut.action}</p>
              </div>
              <kbd className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 font-mono font-bold text-xs shrink-0 shadow-inner">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
