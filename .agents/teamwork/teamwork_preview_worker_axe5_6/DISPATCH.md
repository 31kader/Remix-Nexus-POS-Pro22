## 2026-09-25T13:48:07Z
Vous êtes le Travailleur 3 (teamwork_preview_worker) pour la remédiation de Nexus POS Pro v1.2.14.

Votre répertoire de travail dédié est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_worker_axe5_6`
Le fichier de demande originale obligatoire est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\ORIGINAL_REQUEST.md` (vous DEVEZ le lire impérativement).
Le fichier de règles du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\GEMINI.md` (vous DEVEZ le lire impérativement).
Le fichier de cadrage du projet est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\PROJECT.md`.
Le rapport d'exploration détaillé à corriger est : `c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\.agents\teamwork\teamwork_preview_explorer_axe5_6\handoff.md`.

MANDATORY INTEGRITY WARNING :
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Périmètre exclusif de vos fichiers modifiables (Write Ownership strict) :
- `src/components/expiry/ExpiryListView.tsx`
- `src/components/reports/profits/useProfitsReportLogic.ts`
- `src/components/DetailedReports.tsx`
- `src/services/receiptPrintService.ts`
- `src/components/reports/CashflowReport.tsx`
- `src/components/reports/GroupedSalesAndBasketsReport.tsx`
- `src/components/reports/LossesReport.tsx`
- `tests/reports-and-printing.test.ts`

Tâches à exécuter :
1. **[C2] Erreurs TypeScript TS7006 (`src/components/expiry/ExpiryListView.tsx`)** :
   - Corriger les lignes 330 et 372 : typer explicitement `onClick={(e: React.MouseEvent) => e.stopPropagation()}` sur les conteneurs `motion.div`.
   - Remplacer les `<img />` brutes par `<SafeImage />` (L109, 341).
2. **[M14] Filtre `yesterday` pour les retours (`src/components/reports/profits/useProfitsReportLogic.ts`)** :
   Dans la boucle `returns.forEach` (L183-187), ajouter la condition manquante :
   `if (profitFilterDate === 'yesterday' && !isYesterday(tDate)) return;`
3. **[M6 & M7] Extraction exacte de la TVA et déduction des retours (`src/components/DetailedReports.tsx`)** :
   - Ligne 73 (export CSV) : extraire la TVA incluse depuis le montant TTC :
     `const vatRate = Number(settings.taxRate || 19) / 100; const taxAmount = t.total - (t.total / (1 + vatRate));`
   - Ligne 91 : déduire le montant remboursé pour les transactions avec statut `'partially_returned'`.
4. **[M15] QR code ticket thermique 100% hors-ligne (`src/services/receiptPrintService.ts:L291`)** :
   Supprimer l'URL externe `api.qrserver.com`. Utiliser la bibliothèque locale `qrcode` (`QRCode.toDataURL(...)`) en SVG ou Data URL Base64 pour injecter le QR code en pur offline-first.
5. **[M16] Trésorerie nette et retours (`src/components/reports/CashflowReport.tsx`)** :
   - Exclure également les transactions annulées (`t.status !== 'cancelled'`).
   - Recevoir `returns` en prop et déduire le montant total des remboursements du cashflow net.
6. **[M17] Prix de gros et remises dans ventes groupées (`src/components/reports/GroupedSalesAndBasketsReport.tsx:L165, L244`)** :
   Utiliser `calculateItemPrice(item, t.isWholesale)` au lieu de `Number(item.price)`.
7. **[ANOM-AXE5-06] Garde-fou division par zéro (`src/components/reports/LossesReport.tsx:L105`)** :
   Sécuriser le calcul de pourcentage de pertes si `totalRevenue <= 0`.
8. **[M18] Nouvelle suite de tests unitaires (`tests/reports-and-printing.test.ts`)** :
   Créer une suite de tests Vitest validant :
   - L'extraction exacte de la TVA 19% sur un montant TTC (119 DA TTC -> 19 DA TVA).
   - Le calcul des bénéfices avec le filtre `yesterday` et la déduction des retours.
   - La formule de prix unitaire net avec remises et prix de gros.
   - La génération locale de QR code sans appel réseau externe.

Validation :
Exécuter `npx tsc --noEmit` (DOIT retourner 0 erreur), `npm test` (100% succès) et `npm run build`.
Consigner les résultats dans votre `handoff.md`.
Quand vous avez terminé, envoyez un message au parent (orchestrateur).
