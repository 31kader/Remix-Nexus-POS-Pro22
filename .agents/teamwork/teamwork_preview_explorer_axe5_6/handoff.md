# Rapport d'Audit 360° — Explorateur 3 : Axe 5 & Axe 6

**Périmètre** : Axe 5 (Fiabilité des Rapports & Impression) & Axe 6 (Qualité du Code & Couverture de Tests)  
**Date d'audit** : 2026-09-25  
**Version inspectée** : Nexus POS Pro v1.2.14  
**Auteur** : Explorateur 3 (`teamwork_preview_explorer_axe5_6`)

---

## 1. Observation

### 1.1 Baseline de Vérification Actuelle (Commandes & Résultats Bruts)

| Commande | Statut | Résultat & Sortie |
| :--- | :---: | :--- |
| `npx tsc --noEmit` | ❌ **ÉCHEC** (code 1) | **2 erreurs de typage strict détectées** :<br>`src/components/expiry/ExpiryListView.tsx(330,25): error TS7006: Parameter 'e' implicitly has an 'any' type.`<br>`src/components/expiry/ExpiryListView.tsx(372,25): error TS7006: Parameter 'e' implicitly has an 'any' type.` |
| `npm test` (Vitest v4.1.11) | ✅ **SUCCÈS** (code 0) | **100% de réussite** :<br>22 fichiers de tests passés sur 22 (`22 passed (22)`).<br>102 tests unitaires et d'intégration validés (`102 passed (102)`).<br>Durée totale : 26.48s. |
| `npm run build` | ✅ **SUCCÈS** (code 0) | **Compilation de production réussie** (19.48s) :<br>Vite v6.4.3 génère les bundles dans `dist/`.<br>PWA Workbox génère `sw.js` (106 entrées pré-cachées, 4157 KiB).<br>esbuild compile `server.ts` vers `dist/server.cjs` en 10ms. |

---

### 1.2 Points Forts (Ce qui va bien)

1. **Génération 100% Locale / Offline des codes-barres et QR codes** :
   - `src/services/catalogPrintService.ts:L99-L139` et `src/services/labelPrintService.ts:L65-L139` : Utilisation de `JsBarcode` et `QRCode.toString(..., { type: 'svg' })` entièrement exécutée côté client dans le navigateur, garantissant une création instantanée d'étiquettes et de catalogues sans dépendance réseau ou cloud.
2. **Pilote natif ESC/POS bas niveau robuste et complet** :
   - `src/services/escposPrintService.ts:L16-L125` : Implémentation complète de la classe `EscPosBuilder` supportant les formats thermiques 80mm (48 colonnes) et 58mm (32 colonnes), avec l'impulsion tiroir-caisse RJ11 (`ESC p 0 25 250`, ligne 97), la découpe papier automatique (`GS V n`, ligne 104) et la normalisation ASCII sans accents (`sanitizeText`, lignes 119-124) pour éviter les caractères corrompus sur les imprimantes thermiques standard.
3. **Optimisation des performances et pagination stricte conforme aux règles de projet** :
   - `src/components/reports/profits/useProfitsReportLogic.ts:L44-L67` : Indexation multi-critères O(1) (`productsById`, `productsBySku`, `productsByBarcode`, `productsByName`) calculée uniquement lors de la modification du catalogue de produits.
   - `src/components/reports/StockValueReport.tsx:L48-L85` : Calcul d'agrégation globale du stock en une passe unique O(N), évitant plus de 200 réexécutions de `.reduce()` dans le JSX.
   - `src/components/reports/AccountingChartsReport.tsx:L47-L144` : Découplage strict des calculs lourds du filtre temporel (`period`), garantissant un basculement instantané (0 ms) entre vue mensuelle et vue annuelle.
   - Pagination obligatoire à 50 items/page implémentée avec gestion des états désactivés (`disabled:opacity-40 disabled:cursor-not-allowed`) dans `ProfitsReportTable.tsx:L48-L55, L318-L342`, `GroupedSalesAndBasketsReport.tsx:L51, L314-L321`, `LossesReport.tsx:L79-L85, L237-L262`, `FidelityStatsReport.tsx:L64-L70`.
4. **Précision du calcul des prix et remises unitaires en caisse** :
   - `src/lib/utils.ts:L65-L100` (`calculateItemPrice`) : Fonction centrale prenant fidèlement en compte les prix de gros (`isWholesale`), les prix négociés/forcés (`overriddenPrice`), les remises de lignes fixes ou en pourcentage (`lineDiscount`) et les paliers de remises sur volume (`quantityDiscounts`).
5. **Nettoyage rigoureux des écouteurs d'événements et timers sur les composants critiques** :
   - `src/components/CustomerDisplayWindow.tsx:L142-L148, L191` : Désabonnement systématique des écouteurs `storage`, `keydown`, des SSE et canaux Realtime.
   - `src/components/SyncIndicator.tsx:L37, L66-L68, L74, L83` : Nettoyage exhaustif des listeners personnalisés (`nexus-realtime-status`, `cashier-alert-received`) et des `setInterval`/`setTimeout`.
   - `src/hooks/useSearchWorker.ts:L76-L80, L101` : Nettoyage propre des CustomEvents de synchronisation cache et du debounce timeout.

---

### 1.3 Anomalies Détectées (Ce qui ne va pas bien)

#### 🔴 Niveau CRITIQUE

##### [ANOM-AXE6-01] Échec de la compilation TypeScript (`npx tsc --noEmit`) bloquant le contrôle de type strict
- **Emplacement** : `src/components/expiry/ExpiryListView.tsx:L330` et `L372`
- **Description & Impact** :
  Lignes 330 et 372 :
  ```tsx
  330: onClick={(e) => e.stopPropagation()}
  ...
  372: onClick={(e) => e.stopPropagation()}
  ```
  Sur les conteneurs `motion.div` de Framer Motion, le paramètre `e` de l'événement n'est pas typé par inférence contextuelle. La compilation `npx tsc --noEmit` échoue avec l'erreur `TS7006: Parameter 'e' implicitly has an 'any' type.`
  Ceci casse le pipeline d'intégration continue et empêche la détection d'erreurs statiques.
- **Proposition de correctif** :
  Typer explicitement le paramètre `e` avec `React.MouseEvent` :
  ```tsx
  330: onClick={(e: React.MouseEvent) => e.stopPropagation()}
  ...
  372: onClick={(e: React.MouseEvent) => e.stopPropagation()}
  ```

---

#### 🟠 Niveau MAJEUR

##### [ANOM-AXE5-01] Omission du filtre `yesterday` pour les retours clients dans le calcul des bénéfices
- **Emplacement** : `src/components/reports/profits/useProfitsReportLogic.ts:L183-L187`
- **Description & Impact** :
  Dans le hook de calcul des bénéfices, le filtrage des transactions (lignes 82-86) gère correctement `today`, `yesterday`, `week`, `month`, `year`. Cependant, dans la boucle de déduction des retours (`returns.forEach`, lignes 179-187) :
  ```ts
  183: if (profitFilterDate === 'today' && !isToday(tDate)) return;
  184: if (profitFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return;
  185: if (profitFilterDate === 'month' && !isThisMonth(tDate)) return;
  186: if (profitFilterDate === 'year' && !isThisYear(tDate)) return;
  ```
  La clause `if (profitFilterDate === 'yesterday' && !isYesterday(tDate)) return;` est **totalement absente** !
  Conséquence : Lorsque le gérant sélectionne le filtre "Hier", AUCUN retour historique n'est écarté par la date. Tous les retours de l'historique du magasin sont déduits du chiffre d'affaires et des coûts de la journée d'hier, faussant drastiquement le calcul des bénéfices nets et des marges.
- **Proposition de correctif** :
  Insérer la vérification de la date d'hier dans la boucle des retours à la ligne 184 :
  ```ts
  if (profitFilterDate === 'today' && !isToday(tDate)) return;
  if (profitFilterDate === 'yesterday' && !isYesterday(tDate)) return;
  if (profitFilterDate === 'week' && !isThisWeek(tDate, { weekStartsOn: 1 })) return;
  ```

---

##### [ANOM-AXE5-02] Calcul erroné de la TVA dans l'export comptable CSV (multiplication sur TTC au lieu d'extraction fiscale)
- **Emplacement** : `src/components/DetailedReports.tsx:L73`
- **Description & Impact** :
  Dans la fonction `exportAccountingCSV` :
  ```ts
  72: t.total.toFixed(2),
  73: (t.total * (settings.taxRate / 100)).toFixed(2),
  ```
  `t.total` représente le montant total **TTC** de la transaction payé par le client. Appliquer la formule `total * (taxRate / 100)` revient à considérer que `total` est un montant HT.
  Exemple concret : pour une transaction de 119,00 DA TTC (Taux 19%), la TVA réelle est de 19,00 DA (119 / 1.19 = 100 HT). Or, la formule appliquée génère `119 * 0.19 = 22.61 DA`, soit une surévaluation fiscale de 19% sur le rapport comptable officiel exporté.
- **Proposition de correctif** :
  Utiliser la formule d'extraction de la TVA incluse (exactement comme déjà codée dans `useTransactionHistoryLogic.tsx:L464`) :
  ```ts
  // Extraction TVA incluse depuis le TTC
  const vatRate = Number(settings.taxRate || 19) / 100;
  const taxAmount = t.total - (t.total / (1 + vatRate));
  taxAmount.toFixed(2),
  ```

---

##### [ANOM-AXE5-03] Dépendance réseau externe non offline-first pour la génération du QR Code sur les tickets de caisse
- **Emplacement** : `src/services/receiptPrintService.ts:L291`
- **Description & Impact** :
  Ligne 291 :
  ```html
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(settings.receiptSocialQrUrl)}" style="width: 60px; height: 60px; margin: 0 auto; display: block;" alt="QR" onerror="this.style.display='none'" />
  ```
  Le ticket de caisse thermique dépend d'un service web tiers externe (`api.qrserver.com`) pour générer son image QR code.
  Impact : En mode hors-ligne (fonctionnement habituel d'un POS sans Internet garanti), la requête HTTP échoue, l'image disparaît du ticket, ou bloque le rendu d'impression jusqu'au timeout du navigateur. Ceci viole le principe fondamental Offline-First de l'application.
- **Proposition de correctif** :
  Générer le QR code en local via la bibliothèque `qrcode` déjà installée dans le projet (`QRCode.toDataURL(settings.receiptSocialQrUrl)`) sous forme de Data URL Base64 avant l'injection dans le template HTML (à l'identique de `catalogPrintService.ts` et `labelPrintService.ts`).

---

##### [ANOM-AXE5-04] Omission des remboursements/retours clients et des transactions annulées dans le rapport de trésorerie
- **Emplacement** : `src/components/reports/CashflowReport.tsx:L22` et `src/components/DetailedReports.tsx:L196-L201`
- **Description & Impact** :
  1. `CashflowReport.tsx:L22` : `const activeTx = transactions.filter(t => t.status !== 'returned');`. Les transactions annulées (`status === 'cancelled'`) ne sont pas filtrées et restent comptabilisées comme des encaissements réels.
  2. Le composant `CashflowReport` ne reçoit pas la liste des retours `returns: ProductReturn[]` et ne déduit aucun remboursement d'espèces ou carte de la trésorerie.
  Impact : La trésorerie nette affichée est artificiellement gonflée car elle ignore les sorties de fonds réelles reversées aux clients lors des retours de marchandises.
- **Proposition de correctif** :
  - Transmettre `returns` en prop à `CashflowReport` depuis `DetailedReports.tsx`.
  - Filtrer `t.status !== 'returned' && t.status !== 'cancelled'`.
  - Déduire le total des remboursements effectifs (`returns.reduce((sum, r) => sum + (Number(r.totalRefund) || 0), 0)`) des entrées nettes ou l'ajouter aux sorties de trésorerie avec ligne dédiée dans le journal des flux.

---

##### [ANOM-AXE5-05] Ignorance des prix de gros, prix forcés et remises par article dans le rapport des produits groupés
- **Emplacement** : `src/components/reports/GroupedSalesAndBasketsReport.tsx:L165-L166` et `L244-L245`
- **Description & Impact** :
  Lignes 165-166 :
  ```ts
  const itemPrice = Number(item.price) || 0;
  const revenue = qty * itemPrice;
  ```
  Le rapport calcule le chiffre d'affaires des produits groupés à partir du prix catalogue de base `item.price`, sans tenir compte :
  - Du tarif de gros (`t.isWholesale` avec `item.wholesalePrice`),
  - Du prix forcé ou négocié par le caissier (`item.overriddenPrice`),
  - Des remises de ligne fixes ou en pourcentage (`item.lineDiscount`),
  - Des remises par palier de quantité (`item.quantityDiscounts`).
  Impact : Le chiffre d'affaires et la marge dégagée par produit groupé sont erronés dès lors qu'un rabais ou une vente de gros a été appliqué.
- **Proposition de correctif** :
  Remplacer `Number(item.price)` par `calculateItemPrice(item, t.isWholesale)` :
  ```ts
  const unitPrice = calculateItemPrice(item, t.isWholesale);
  const revenue = qty * unitPrice;
  ```

---

##### [ANOM-AXE6-02] Absence totale de couverture de tests sur les modules de rapports et d'impression (0% sur l'Axe 5)
- **Emplacement** : Répertoire `tests/`
- **Description & Impact** :
  Bien que la suite Vitest comporte 22 fichiers et 102 tests passés avec succès, **aucun test unitaire ou d'intégration** ne cible `src/components/reports/` (`ProfitsReport`, `GroupedSalesAndBasketsReport`, `DetailedReports`, `LossesReport`, `StockValueReport`, `CashflowReport`) ni les services d'impression (`receiptPrintService.ts`, `catalogPrintService.ts`, `labelPrintService.ts`).
  Impact : Les règles métier financières (calcul des marges, impact des retours, extraction de TVA, pagination) ne disposent d'aucun filet de sécurité contre les régressions lors des futurs développements.
- **Proposition de correctif** :
  Créer un fichier de tests automatisés `tests/reports-and-printing.test.ts` validant :
  1. Le calcul exact des marges avec déduction des retours et remises,
  2. L'extraction exacte de la TVA 19% sur le total TTC,
  3. La résistance aux divisions par zéro sur paniers vides ou sans vente,
  4. La génération 100% hors-ligne des QR codes et codes-barres.

---

#### 🟡 Niveau MINEUR

##### [ANOM-AXE5-06] Division par 1 / zéro provoquant un pourcentage aberrant dans le rapport des pertes
- **Emplacement** : `src/components/reports/LossesReport.tsx:L105`
- **Description & Impact** :
  Ligne 105 :
  ```tsx
  <h4 className="text-3xl font-black text-white">-{((lossData.totalLossValue / (totalRevenue || 1)) * 100).toFixed(2)}%</h4>
  ```
  Si `totalRevenue` vaut 0 (nouveau magasin, début de journée ou filtre sans vente), le dénominateur bascule sur `1`, ce qui multiplie la valeur absolue des pertes par 100.
  Exemple : pour 5 000 DA de pertes et 0 DA de vente, le KPI affiche `-500000.00% du chiffre d'affaires total` !
- **Proposition de correctif** :
  Sécuriser avec une condition explicite :
  ```tsx
  {totalRevenue > 0 
    ? `-${((lossData.totalLossValue / totalRevenue) * 100).toFixed(2)}%` 
    : '0.00%'}
  ```

---

##### [ANOM-AXE5-07] Absence de tri chronologique en vue mensuelle créant un tracé en zigzag sur le graphique d'évolution
- **Emplacement** : `src/components/reports/AccountingChartsReport.tsx:L161-L164`
- **Description & Impact** :
  Lignes 161-164 :
  ```ts
  .sort((a, b) => {
    if (period === 'yearly') return parseInt(a.name) - parseInt(b.name);
    return 0; 
  });
  ```
  Pour `period === 'monthly'`, le comparateur renvoie `0`. Les mois s'affichent selon l'ordre non garanti d'itération des clés JavaScript de `periodMap`, ce qui peut positionner par exemple Décembre avant Janvier si les transactions ne sont pas triées dans cet ordre dans le store.
- **Proposition de correctif** :
  Stocker une clé chronologique normalisée `YYYY-MM` lors de l'agrégation et trier par cette clé avant de mapper vers le libellé formaté `MMM yyyy`.

---

##### [ANOM-AXE5-08] Incohérence de thème (classes claires sans Dark Mode) sur les rapports de valorisation stock et fidélité
- **Emplacement** : `src/components/reports/StockValueReport.tsx:L90-L230` et `src/components/reports/FidelityStatsReport.tsx:L90-L200`
- **Description & Impact** :
  Ces composants utilisent des fonds blancs et textes foncés codés en dur (`bg-slate-50`, `text-slate-800`, `border-slate-200`) sans variantes `dark:bg-...` ni `dark:text-...`, en contraste violent avec le thème sombre Pro Minimaliste du reste du tableau de bord.
- **Proposition de correctif** :
  Appliquer les classes `dark:bg-zinc-900`, `dark:border-zinc-800`, `dark:text-zinc-100` sur les cartes, filtres et tableaux.

---

##### [ANOM-AXE5-09] Dépendance externe Google Fonts dans les modèles d'impression de documents
- **Emplacement** : `src/services/documentPrintService.ts:L52, L138, L230`
- **Description & Impact** :
  Balise `<link href="https://fonts.googleapis.com/css2?family=Inter..." rel="stylesheet">` injectée dans l'iframe d'impression. Si le terminal de caisse est hors-ligne, le navigateur subit une latence réseau avant de basculer sur la police de secours.
- **Proposition de correctif** :
  Remplacer par des polices système standard : `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;`.

---

##### [ANOM-AXE6-03] Code mort dupliqué dans `src/hooks/useUpdatePricesLogic.ts`
- **Emplacement** : `src/hooks/useUpdatePricesLogic.ts`
- **Description & Impact** :
  Ce fichier est un clone parfait de `src/components/useUpdatePricesLogic.ts`. Il n'est importé nulle part dans l'application (`UpdatePricesView.tsx` important la version dans `components/`).
- **Proposition de correctif** :
  Supprimer le fichier ou en faire un re-export pour alléger la base de code.

---

##### [ANOM-AXE6-04] Pagination affichant `Page 1 / 0` sur l'historique des ajustements de stock vide
- **Emplacement** : `src/components/reports/stock/useStockHistoryLogic.ts:L78`
- **Description & Impact** :
  `const totalPages = Math.ceil(enrichedAdjustments.length / pageSize);`. Si la liste est vide, `totalPages` vaut `0`, affichant `Page 1 / 0`.
- **Proposition de correctif** :
  Utiliser `Math.max(1, Math.ceil(enrichedAdjustments.length / pageSize));`.

---

##### [ANOM-AXE6-05] Variable orpheline dans `useTransactionHistoryLogic.tsx`
- **Emplacement** : `src/components/useTransactionHistoryLogic.tsx:L396`
- **Description & Impact** :
  `const taxAmount = subtotal * ((settings.taxRate || 0) / 100);` est calculée mais jamais injectée dans le HTML (les lignes 460-464 recalculent directement la TVA).
- **Proposition de correctif** :
  Supprimer la déclaration inutile.

---

## 2. Logic Chain

```
[Observation 1.1 - tsc --noEmit]
  │
  ├─► Erreurs TS7006 sur 'e' dans ExpiryListView.tsx:330, 372
  │     └─► Bloque la CI TypeScript stricte (ANOM-AXE6-01 - Critique)
  │
[Observation 1.1 - npm test & tests/]
  │
  ├─► 22 suites / 102 tests réussis (100%)
  └─► AUCUN test unitaire sur reports/ ni *PrintService.ts
        └─► Lacune majeure de couverture sur l'Axe 5 (ANOM-AXE6-02 - Majeur)

[Observation 1.3 - Exploration useProfitsReportLogic.ts]
  │
  ├─► Lignes 82-86 : tDate filtré pour 'today', 'yesterday', 'week', 'month', 'year'
  └─► Lignes 183-186 : returns.forEach filtre 'today', 'week', 'month', 'year' (Omission 'yesterday')
        └─► Filtre 'Hier' déduit tous les retours de l'histoire du magasin (ANOM-AXE5-01 - Majeur)

[Observation 1.3 - Exploration DetailedReports.tsx]
  │
  ├─► Ligne 73 : t.total * (settings.taxRate / 100)
  └─► t.total est un montant TTC, pas HT
        └─► Surestimation de la TVA de 19% sur l'export CSV officiel (ANOM-AXE5-02 - Majeur)

[Observation 1.3 - Exploration receiptPrintService.ts]
  │
  ├─► Ligne 291 : <img src="https://api.qrserver.com/..." />
  └─► Requête HTTP externe dans une app offline-first
        └─► Échec d'impression du QR code hors-ligne (ANOM-AXE5-03 - Majeur)

[Observation 1.3 - Exploration CashflowReport.tsx & DetailedReports.tsx]
  │
  ├─► Ligne 22 : t.status !== 'returned' uniquement (omet 'cancelled')
  └─► Aucune prop returns reçue, sorties de fonds non déduites
        └─► Trésorerie nette surévaluée et faussée (ANOM-AXE5-04 - Majeur)

[Observation 1.3 - Exploration GroupedSalesAndBasketsReport.tsx]
  │
  ├─► Lignes 165, 244 : Number(item.price) utilisé au lieu de calculateItemPrice(...)
  └─► Ignore isWholesale, overriddenPrice, lineDiscount, quantityDiscounts
        └─► CA et marges des produits groupés inexacts (ANOM-AXE5-05 - Majeur)
```

---

## 3. Caveats

1. **Règles d'investigation en lecture seule (Read-Only)** : Conformément aux règles de l'agent Explorateur, aucun fichier source (`src/`) n'a été modifié lors de cette étape d'exploration. Toutes les propositions de correctifs sont documentées avec précision pour la phase de remédiation M3.
2. **Environnement d'exécution des tests** : Les tests d'impression dans l'environnement Vitest/JSDOM mockent `window.print()` et `window.focus()` (`Not implemented: Window's focus() method` / `Window's print() method`). Cela est attendu dans un environnement headless sans imprimante physique connectée.
3. **Périmètre des axes audités** : Cet audit a couvert intégralement l'Axe 5 et l'Axe 6. Les autres axes (Axe 1 & 2 : POS / Sync, Axe 3 & 4 : Sécurité / UI) sont explorés en parallèle par les explorateurs 1 et 2.

---

## 4. Conclusion & Notes par Axe

### Synthèse Globale

- **Axe 5 — Fiabilité des Rapports & Impression** : **7.0 / 10**
  - *Points forts* : Indexation O(1) rapide, driver ESC/POS bas niveau de grande qualité avec gestion tiroir et massicot, mise en page soignée, pagination 50 items/page.
  - *Faiblesses à corriger* : Le bug de filtrage de date sur les retours (`yesterday`), le calcul fiscal erroné sur l'export CSV, la dépendance externe HTTP du QR code sur le ticket de caisse, et l'absence de prise en compte des remboursements dans le cashflow.
- **Axe 6 — Qualité du Code & Couverture de Tests** : **7.5 / 10**
  - *Points forts* : Suite Vitest de 102 tests unitaires passant à 100%, cycle de vie des listeners et timeouts bien nettoyé sur les composants critiques, bundle Vite et PWA impeccables.
  - *Faiblesses à corriger* : 2 erreurs TypeScript TS7006 bloquant `tsc --noEmit`, absence totale de tests unitaires sur les rapports et l'impression (0% de couverture Axe 5), et un fichier de hook mort/dupliqué.

---

## 5. Verification Method (Comment vérifier de manière indépendante)

Pour vérifier de manière indépendante et reproductible les constats du présent rapport :

1. **Vérifier l'erreur TypeScript (ANOM-AXE6-01)** :
   ```powershell
   npx tsc --noEmit
   ```
   *Résultat attendu* : Doit échouer avec code de retour 1 et afficher les 2 erreurs TS7006 sur `src/components/expiry/ExpiryListView.tsx` aux lignes 330 et 372.

2. **Vérifier la suite de tests Vitest** :
   ```powershell
   npm test
   ```
   *Résultat attendu* : 22 fichiers de tests doivent passer (`102 passed (102)`).

3. **Vérifier la compilation de production Vite** :
   ```powershell
   npm run build
   ```
   *Résultat attendu* : Compilation réussie sans erreur.

4. **Vérifier l'omission du filtre `yesterday` (ANOM-AXE5-01)** :
   Inspecter `src/components/reports/profits/useProfitsReportLogic.ts` aux lignes 183-187 :
   Constater l'absence de vérification pour `yesterday` dans `returns.forEach`.

5. **Vérifier le calcul erroné de TVA (ANOM-AXE5-02)** :
   Inspecter `src/components/DetailedReports.tsx` à la ligne 73 :
   Constater `(t.total * (settings.taxRate / 100)).toFixed(2)`.

6. **Vérifier l'appel réseau QR code (ANOM-AXE5-03)** :
   Inspecter `src/services/receiptPrintService.ts` à la ligne 291 :
   Constater l'URL `https://api.qrserver.com/...`.
