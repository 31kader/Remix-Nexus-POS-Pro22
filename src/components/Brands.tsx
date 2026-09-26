import React, { useRef, useState, useMemo } from 'react';
import { Award, Edit2, Trash2, Plus, Download, Upload, Search, Package } from 'lucide-react';
import { Brand, Product } from '../types';
import { Card, Button, SafeImage } from './ui';
import { exportToCSV } from '../lib/utils';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { localDb } from '../services/LocalDatabase';

interface BrandsProps {
  brands: Brand[];
  products?: Product[];
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
  onAdd: () => void;
}

export function Brands({ brands, products = [], onEdit, onDelete, onAdd }: BrandsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const brandProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const brand of brands) {
      const bNameLower = (brand.name || '').trim().toLowerCase();
      counts[brand.id] = products.filter(
        (p) =>
          p.brandId === brand.id ||
          ((p as any).brand && String((p as any).brand).trim().toLowerCase() === bNameLower)
      ).length;
    }
    return counts;
  }, [brands, products]);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        (b.name || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
    );
  }, [brands, searchQuery]);

  const handleExport = () => {
    const dataToExport = brands.map((brand) => ({
      id: brand.id,
      Nom: brand.name,
      Description: brand.description || '',
      Logo_Url: brand.logoUrl || '',
      Nb_Produits: brandProductCounts[brand.id] || 0
    }));
    exportToCSV(dataToExport, 'marques_export');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const data = results.data as any[];
          let successCount = 0;
          let failCount = 0;

          for (const row of data) {
            const nom = row['Nom']?.trim();
            if (!nom) {
              failCount++;
              continue;
            }

            const existing = brands.find(
              (b) => (b.name || '').toLowerCase() === nom.toLowerCase()
            );
            if (existing) {
              failCount++;
              continue;
            }

            const newId = Math.random().toString(36).substring(2, 10);
            try {
              await localDb.insert(`brands/${newId}`, {
                id: newId,
                name: nom,
                description: row['Description']?.trim() || '',
                logoUrl: row['Logo_Url']?.trim() || ''
              });
              successCount++;
            } catch (err) {
              failCount++;
            }
          }

          setImportSummary(
            successCount +
              ' marque(s) importée(s) avec succès. ' +
              (failCount > 0 ? failCount + ' ignorée(s).' : '')
          );
        } catch (error) {
          console.error("Erreur d'importation:", error);
          toast.error("Une erreur s'est produite lors de l'importation.");
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error: any) => {
        setIsImporting(false);
        toast.error('Erreur de lecture du fichier CSV: ' + error.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Répertoire des Marques
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Gérez les marques et fabricants associés aux produits de votre inventaire.
          </p>
          {importSummary && (
            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              {importSummary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <Upload size={17} className={isImporting ? 'animate-bounce' : ''} />
            <span>{isImporting ? 'Import...' : 'Importer CSV'}</span>
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={brands.length === 0}>
            <Download size={17} />
            <span>Exporter CSV</span>
          </Button>
          <Button onClick={() => onAdd()}>
            <Plus size={18} />
            <span>Nouvelle Marque</span>
          </Button>
        </div>
      </div>

      {brands.length > 0 && (
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une marque..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBrands.map((brand: Brand) => {
          const count = brandProductCounts[brand.id] || 0;
          return (
            <Card
              key={brand.id}
              className="p-4 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 hover:border-indigo-500/40 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center overflow-hidden shrink-0 p-1.5">
                  {brand.logoUrl ? (
                    <SafeImage
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="w-full h-full object-contain"
                      fallback={<Award size={22} />}
                    />
                  ) : (
                    <Award size={22} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 dark:text-white truncate text-sm sm:text-base">
                      {brand.name}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30 shrink-0">
                      <Package size={10} />
                      {count}
                    </span>
                  </div>
                  {brand.description ? (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[200px] mt-0.5">
                      {brand.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      Marque référencée
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(brand)}
                  className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Modifier la marque"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(brand)}
                  className="p-2 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                  title="Supprimer la marque"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          );
        })}

        {filteredBrands.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 space-y-3">
            <Award size={36} className="mx-auto text-slate-400 dark:text-zinc-500" />
            <div>
              <p className="font-bold text-slate-800 dark:text-zinc-200 text-base">
                {searchQuery
                  ? `Aucune marque ne correspond à "${searchQuery}"`
                  : "Aucune marque n'a encore été créée."}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Cliquez sur « Nouvelle Marque » pour ajouter un fabricant à votre catalogue.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
