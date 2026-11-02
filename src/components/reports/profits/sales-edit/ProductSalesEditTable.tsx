import React from 'react';
import { Receipt, Clock, Save, X, Edit3, Trash2 } from 'lucide-react';
import { formatSafe } from '../../../../lib/utils';
import { EditableSaleRow } from './salesEditTypes';

interface ProductSalesEditTableProps {
  salesRows: EditableSaleRow[];
  paginatedRows: EditableSaleRow[];
  currency: string;
  processingTxId: string | null;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
  onUpdateRowState: (txId: string, itemIdx: number, patch: Partial<EditableSaleRow>) => void;
  onSaveTransactionRow: (row: EditableSaleRow) => void;
  onRemoveProductFromTransaction: (row: EditableSaleRow) => void;
}

export const ProductSalesEditTable: React.FC<ProductSalesEditTableProps> = ({
  salesRows,
  paginatedRows,
  currency,
  processingTxId,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onUpdateRowState,
  onSaveTransactionRow,
  onRemoveProductFromTransaction,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Receipt size={15} className="text-indigo-400" />
          Historique des Ventes de ce Produit ({salesRows.length} tickets)
        </h5>
        <span className="text-[10px] text-slate-400">Modifiez le prix, la remise caisse, le coût, la date ou supprimez une ligne erronée</span>
      </div>

      {salesRows.length === 0 ? (
        <div className="p-5 text-center bg-white/5 rounded-xl border border-white/5 text-slate-400 text-sm">
          Aucune vente trouvée pour ce produit sur la période sélectionnée.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40 custom-scrollbar max-h-[50vh]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 sticky top-0 bg-slate-900 z-10">
                <th className="p-3">Ticket & Date</th>
                <th className="p-3">Client / Caisse</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-right">Prix Vente ({currency})</th>
                <th className="p-3 text-right text-rose-400">Remise Caisse</th>
                <th className="p-3 text-right">Prix Achat ({currency})</th>
                <th className="p-3 text-right">Total Net Ligne</th>
                <th className="p-3 text-right">Marge Nette</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {paginatedRows.map((row, idx) => {
                const isRowProcessing = processingTxId === row.transactionId;
                const safePrice = Number(row.price) || 0;
                const safeCost = Number(row.costPrice) || 0;
                const safeQty = Number(row.quantity) || 0;
                const safeDiscount = Math.max(0, Number(row.discountAmount) || 0);
                const grossLineTotal = safePrice * safeQty;
                const lineTotal = Math.max(0, grossLineTotal - safeDiscount);
                const lineCost = safeCost * safeQty;
                const lineProfit = lineTotal - lineCost;
                const lineMarginPct = lineCost > 0 ? ((lineProfit / lineCost) * 100).toFixed(0) : '0';

                return (
                  <tr key={`sale-${row.transactionId}-${row.itemIndex}-${idx}`} className="hover:bg-white/[0.03] transition-colors">
                    {/* Ticket ID and Date */}
                    <td className="p-3 font-sans">
                      <span className="font-bold text-white block">#{row.transactionId.slice(-6).toUpperCase()}</span>
                      {row.isEditing ? (
                        <input
                          type="datetime-local"
                          value={row.currentDate}
                          onChange={e => onUpdateRowState(row.transactionId, row.itemIndex, { currentDate: e.target.value })}
                          className="mt-1 bg-black/60 border border-indigo-500/40 rounded-lg px-2 py-1 text-[10px] text-white font-mono outline-none"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {formatSafe(row.transaction.timestamp, 'dd/MM/yyyy HH:mm')}
                        </span>
                      )}
                    </td>

                    {/* Customer & Cashier */}
                    <td className="p-3 font-sans">
                      <span className="text-white font-bold block truncate max-w-[120px]">
                        {row.transaction.customerName || 'Client Comptoir'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {row.transaction.employeeName || 'Caisse'}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="p-3 text-center">
                      {row.isEditing ? (
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={row.quantity}
                          onChange={e => onUpdateRowState(row.transactionId, row.itemIndex, { quantity: parseFloat(e.target.value) || 1 })}
                          className="w-14 text-center bg-black/60 border border-indigo-500/40 rounded-lg py-1 text-xs font-black text-white outline-none"
                        />
                      ) : (
                        <span className="font-black text-white text-xs">{safeQty}</span>
                      )}
                    </td>

                    {/* Selling Price */}
                    <td className="p-3 text-right">
                      {row.isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.price}
                          onChange={e => onUpdateRowState(row.transactionId, row.itemIndex, { price: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-black/60 border border-indigo-500/40 rounded-lg py-1 px-2 text-xs font-black text-white outline-none"
                        />
                      ) : (
                        <span className="font-bold text-white text-xs">{safePrice.toFixed(2)}</span>
                      )}
                    </td>

                    {/* Checkout Discount */}
                    <td className="p-3 text-right">
                      {row.isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.discountAmount}
                          onChange={e => onUpdateRowState(row.transactionId, row.itemIndex, { discountAmount: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-black/60 border border-rose-500/40 rounded-lg py-1 px-2 text-xs font-black text-rose-300 outline-none"
                        />
                      ) : safeDiscount > 0 ? (
                        <div>
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 font-black text-[11px]">
                            -{safeDiscount.toFixed(2)}
                          </span>
                          {row.ticketDiscountTotal > safeDiscount && (
                            <span className="block text-[9px] text-slate-400 mt-0.5 font-sans">
                              (Ticket: -{row.ticketDiscountTotal.toFixed(0)} {currency})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">0.00</span>
                      )}
                    </td>

                    {/* Cost Price */}
                    <td className="p-3 text-right">
                      {row.isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={row.costPrice}
                          onChange={e => onUpdateRowState(row.transactionId, row.itemIndex, { costPrice: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-black/60 border border-amber-500/40 rounded-lg py-1 px-2 text-xs font-black text-amber-300 outline-none"
                        />
                      ) : (
                        <span className="font-bold text-amber-400 text-xs">{safeCost.toFixed(2)}</span>
                      )}
                    </td>

                    {/* Line Total */}
                    <td className="p-3 text-right">
                      {safeDiscount > 0 && (
                        <span className="block text-[9px] text-slate-500 line-through">
                          {grossLineTotal.toFixed(2)}
                        </span>
                      )}
                      <span className="font-black text-white text-xs">{lineTotal.toFixed(2)}</span>
                    </td>

                    {/* Margin */}
                    <td className="p-3 text-right font-sans">
                      <span className={`text-[11px] font-black block font-mono ${lineProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {lineProfit >= 0 ? '+' : ''}{lineProfit.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        ({lineMarginPct}%)
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isRowProcessing}
                              onClick={() => onSaveTransactionRow(row)}
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Enregistrer les modifications"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateRowState(row.transactionId, row.itemIndex, { isEditing: false })}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                              title="Annuler"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateRowState(row.transactionId, row.itemIndex, { isEditing: true })}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Modifier cette vente (Prix d'achat, de vente, qté, date)"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              type="button"
                              disabled={isRowProcessing}
                              onClick={() => onRemoveProductFromTransaction(row)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Supprimer cet article de cette vente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination 50 ventes par page */}
          {salesRows.length > itemsPerPage && (
            <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40 font-bold uppercase tracking-wider text-[10px]">
                Ventes {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, salesRows.length)} sur {salesRows.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  Précédent
                </button>
                <span className="px-2.5 py-1 bg-white/10 text-white rounded-lg text-[10px] font-black">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
