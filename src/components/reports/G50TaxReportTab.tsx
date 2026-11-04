import React, { useState, useMemo } from 'react';
import { Landmark, Download, Printer, Calendar } from 'lucide-react';
import { useCoreStore } from '../../store/useCoreStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { computeG50SummaryForPeriod, generateG50Csv } from '../../services/fiscal/g50ExportService';
import { toast } from 'sonner';

export const G50TaxReportTab: React.FC = () => {
  const transactions = useTransactionStore(s => s.transactions);
  const purchases = useTransactionStore(s => s.purchaseOrders) || [];
  const settings = useCoreStore(s => s.settings);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const summary = useMemo(() => {
    return computeG50SummaryForPeriod(transactions, purchases, selectedYear, selectedMonth);
  }, [transactions, purchases, selectedYear, selectedMonth]);

  const handleExportCsv = () => {
    const csvContent = generateG50Csv(summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Declaration_G50_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bordereau G50 exporté avec succès (CSV)');
  };

  const handlePrint = () => {
    window.print();
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* En-tête et filtres de période */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-white/5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Déclaration Fiscale G50 (TVA & Droits de Timbre)</h3>
            <p className="text-[10px] text-slate-400">Synthèse mensuelle pour la Direction Générale des Impôts (DGI)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer font-bold"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx + 1} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent outline-none cursor-pointer font-bold"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <Printer size={14} />
            Imprimer
          </button>
        </div>
      </div>

      {/* Cartes récapitulatives rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-500">Chiffre d'Affaires TTC</span>
          <div className="text-xl font-black font-mono text-white">
            {summary.totalSalesTTC.toFixed(2)} <span className="text-xs text-slate-400">{settings.currency || 'DA'}</span>
          </div>
          <span className="text-[10px] text-slate-500">{summary.transactionCount} vente(s)</span>
        </div>

        <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-500">TVA 19% Collectée</span>
          <div className="text-xl font-black font-mono text-indigo-400">
            {summary.tvaCollectee19.toFixed(2)} <span className="text-xs text-slate-400">{settings.currency || 'DA'}</span>
          </div>
          <span className="text-[10px] text-slate-500">Base HT : {summary.baseImposable19.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-500">TVA 9% Collectée</span>
          <div className="text-xl font-black font-mono text-cyan-400">
            {summary.tvaCollectee9.toFixed(2)} <span className="text-xs text-slate-400">{settings.currency || 'DA'}</span>
          </div>
          <span className="text-[10px] text-slate-500">Base HT : {summary.baseImposable9.toFixed(2)}</span>
        </div>

        <div className="p-4 bg-slate-900 border border-emerald-500/20 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-400">TVA Nette Due</span>
          <div className="text-xl font-black font-mono text-emerald-300">
            {summary.tvaNetteDue.toFixed(2)} <span className="text-xs text-emerald-400">{settings.currency || 'DA'}</span>
          </div>
          <span className="text-[10px] text-slate-500">Déductible : {summary.tvaDeductibleAchats.toFixed(2)}</span>
        </div>
      </div>

      {/* Tableau détaillé conforme G50 */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 font-bold text-xs uppercase tracking-wider text-slate-300">
          Cadre Réglementaire : État Mensuel des Opérations Imposables
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] font-black">
            <tr>
              <th className="p-3">Ligne G50</th>
              <th className="p-3 text-right">Base Imposable (HT)</th>
              <th className="p-3 text-center">Taux Applicable</th>
              <th className="p-3 text-right">Montant Taxe (DA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            <tr>
              <td className="p-3 text-slate-200 font-sans">Opérations au taux normal</td>
              <td className="p-3 text-right text-slate-300">{summary.baseImposable19.toFixed(2)}</td>
              <td className="p-3 text-center text-indigo-400 font-bold">19 %</td>
              <td className="p-3 text-right font-bold text-white">{summary.tvaCollectee19.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-200 font-sans">Opérations au taux réduit</td>
              <td className="p-3 text-right text-slate-300">{summary.baseImposable9.toFixed(2)}</td>
              <td className="p-3 text-center text-cyan-400 font-bold">9 %</td>
              <td className="p-3 text-right font-bold text-white">{summary.tvaCollectee9.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="p-3 text-slate-200 font-sans">Opérations exonérées / Franchise</td>
              <td className="p-3 text-right text-slate-300">{summary.baseExoneree.toFixed(2)}</td>
              <td className="p-3 text-center text-slate-500 font-bold">0 %</td>
              <td className="p-3 text-right font-bold text-slate-500">0.00</td>
            </tr>
            <tr className="bg-slate-850/50">
              <td className="p-3 text-slate-200 font-sans font-bold">Droits de Timbre perçus (Espèces)</td>
              <td className="p-3 text-right text-slate-300">-</td>
              <td className="p-3 text-center text-amber-400 font-bold">1 %</td>
              <td className="p-3 text-right font-bold text-amber-300">{summary.droitsTimbrePerçus.toFixed(2)}</td>
            </tr>
            <tr className="bg-slate-850/80 font-bold">
              <td className="p-3 text-white font-sans">TVA Nette à reverser aux Impôts</td>
              <td className="p-3 text-right text-white">{summary.totalVenteHT.toFixed(2)}</td>
              <td className="p-3 text-center text-emerald-400 font-sans">Solde Net</td>
              <td className="p-3 text-right text-emerald-400 text-sm">{summary.tvaNetteDue.toFixed(2)} DA</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
