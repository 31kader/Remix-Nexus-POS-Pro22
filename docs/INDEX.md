# 📚 Cartographie & Index de la Documentation — Nexus POS Pro

Ce dossier regroupe et organise l'ensemble des rapports d'audit, simulations haute charge, certifications et guides techniques du système **Nexus POS Pro**.

---

## 🗂️ 1. Audits & Certifications (`docs/audits/`)
Rapports d'analyse architecturale, de sécurité CWE, de performance Lighthouse et de certifications industrielles :

- [`RAPPORT_AUDIT_APPROFONDI_SUPABASE_POST_REFONTE.md`](./audits/RAPPORT_AUDIT_APPROFONDI_SUPABASE_POST_REFONTE.md) — Audit approfondi Supabase & packaging de production v1.2.71.
- [`AUDIT_360_RAPPORT_COMPLET.md`](./audits/AUDIT_360_RAPPORT_COMPLET.md) — Audit global à 360° du POS et des flux de données.
- [`AUDIT_SECURITE_14_CWE_RAPPORT.md`](./audits/AUDIT_SECURITE_14_CWE_RAPPORT.md) — Pentest et remédiation des 14 failles CWE (XSS, Injection, RLS, etc.).
- [`AUDIT_SECURITE_PHASE2_RAPPORT.md`](./audits/AUDIT_SECURITE_PHASE2_RAPPORT.md) — Verrouillage RLS avancé Supabase et politiques d'accès.
- [`AUDIT_SECURITE_PERFORMANCE_LIGHTHOUSE.md`](./audits/AUDIT_SECURITE_PERFORMANCE_LIGHTHOUSE.md) — Audit de performance Lighthouse et Core Web Vitals.
- [`AUDIT_DEV_SENIOR_RAPPORT.md`](./audits/AUDIT_DEV_SENIOR_RAPPORT.md) — Revue de code senior et architecture modulaire.
- [`AUDIT_CLEAN_ROOM_2026_10_17.md`](./audits/AUDIT_CLEAN_ROOM_2026_10_17.md) — Audit Clean Room d'intégrité logicielle.
- [`AUDIT_FORENSIQUE_APPROVISIONNEMENT_OFFLINE.md`](./audits/AUDIT_FORENSIQUE_APPROVISIONNEMENT_OFFLINE.md) — Analyse forensique des flux offline et résilience.
- [`AUDIT_NEUF_INDEPENDANT_V1.2.33.md`](./audits/AUDIT_NEUF_INDEPENDANT_V1.2.33.md) — Audit à neuf indépendant version v1.2.33.
- [`RAPPORT_CERTIFICATION_INDUSTRIELLE_FINALE.md`](./audits/RAPPORT_CERTIFICATION_INDUSTRIELLE_FINALE.md) — Validation industrielle finale pour exploitation.
- [`RAPPORT_ENTERPRISE_4_VAGUES.md`](./audits/RAPPORT_ENTERPRISE_4_VAGUES.md) — Déploiement entreprise en 4 vagues.
- [`RAPPORT_ERREURS_CACHEES_A_Z.md`](./audits/RAPPORT_ERREURS_CACHEES_A_Z.md) — Détection et élimination des erreurs cachées.
- [`RAPPORT_AXE_A_MATERIEL_ESC_POS.md`](./audits/RAPPORT_AXE_A_MATERIEL_ESC_POS.md) — Compatibilité matérielle ESC/POS, tiroir-caisse, scanners.
- [`REMEDIATION_PHASE1_PHASE2_RAPPORT.md`](./audits/REMEDIATION_PHASE1_PHASE2_RAPPORT.md) — Plan d'action et remédiation Phase 1 & 2.
- [`REMEDIATION_PHASE3_P2_RAPPORT.md`](./audits/REMEDIATION_PHASE3_P2_RAPPORT.md) — Remédiation Phase 3 et durcissement.

---

## ⚡ 2. Simulations E2E & Tests de Charge (`docs/simulations/`)
Rapports générés et validés par la suite de tests automatisés Vitest (`tests/simulations/`) :

- [`SIMULATION_ADMIN_A_Z_RAPPORT.md`](./simulations/SIMULATION_ADMIN_A_Z_RAPPORT.md) — Simulation de bout en bout de l'administration du magasin.
- [`SIMULATION_HAUTE_CHARGE_100_COMMANDES_50_VENTES_RAPPORT.md`](./simulations/SIMULATION_HAUTE_CHARGE_100_COMMANDES_50_VENTES_RAPPORT.md) — Test de haute charge (100 commandes en ligne + 50 ventes simultanées).
- [`SIMULATION_HAUTE_CHARGE_EXTREME_COUPURE_RESEAU_RAPPORT.md`](./simulations/SIMULATION_HAUTE_CHARGE_EXTREME_COUPURE_RESEAU_RAPPORT.md) — Résistance extrême en cas de coupure Internet brutale.
- [`SIMULATION_MASSIVE_STRESS_RAPPORT.md`](./simulations/SIMULATION_MASSIVE_STRESS_RAPPORT.md) — Test de stress massif de la file `SyncService`.
- [`SIMULATION_MULTI_CAISSES_LAN_P2P_RAPPORT.md`](./simulations/SIMULATION_MULTI_CAISSES_LAN_P2P_RAPPORT.md) — Synchronisation locale P2P multi-caisses sur réseau local (LAN).
- [`SIMULATION_RAPPORT_Z_GESTION_CAISSE_RAPPORT.md`](./simulations/SIMULATION_RAPPORT_Z_GESTION_CAISSE_RAPPORT.md) — Clôture de caisse Z, coupures billets DA et calcul des écarts.
- [`SIMULATION_DISASTER_RECOVERY_RESTAURATION_RAPPORT.md`](./simulations/SIMULATION_DISASTER_RECOVERY_RESTAURATION_RAPPORT.md) — Scénario de reprise sur sinistre et restauration IndexedDB/SQLite.
- [`SIMULATION_APPROVISIONNEMENTS_BL_DETTES_FOURNISSEURS_RAPPORT.md`](./simulations/SIMULATION_APPROVISIONNEMENTS_BL_DETTES_FOURNISSEURS_RAPPORT.md) — Réception de bons de livraison (BL) et suivi des créances fournisseurs.
- [`SIMULATION_GROS_DETAIL_ENCOURS_TOPUP_RAPPORT.md`](./simulations/SIMULATION_GROS_DETAIL_ENCOURS_TOPUP_RAPPORT.md) — Tarifs de gros, détail, plafonds de crédit client et recharges.
- [`SIMULATION_INVENTAIRE_PHYSIQUE_PAMP_RAPPORT.md`](./simulations/SIMULATION_INVENTAIRE_PHYSIQUE_PAMP_RAPPORT.md) — Inventaire tournant et calcul du Coût Moyen Unitaire Pondéré (PAMP).
- [`SIMULATION_PROMOTIONS_VOUCHERS_FIDELITE_RAPPORT.md`](./simulations/SIMULATION_PROMOTIONS_VOUCHERS_FIDELITE_RAPPORT.md) — Système de points, remises panier et bons d'achat fidélité.
- [`SIMULATION_RETOURS_AVARIES_FISCALITE_RAPPORT.md`](./simulations/SIMULATION_RETOURS_AVARIES_FISCALITE_RAPPORT.md) — Traitement fiscal des retours clients et des avaries de stock.
- [`SIMULATION_SECURITE_PENTEST_ANTI_FRAUDE_RAPPORT.md`](./simulations/SIMULATION_SECURITE_PENTEST_ANTI_FRAUDE_RAPPORT.md) — Détection anti-fraude caissier et intégrité des sessions.
- [`SIMULATION_STOCK_FLUX_RAPPORT.md`](./simulations/SIMULATION_STOCK_FLUX_RAPPORT.md) — Traçabilité des mouvements et ajustements d'inventaire.

---

## 📖 3. Spécifications & Guides Techniques (`docs/guides/`)
- [`CAHIER_DES_CHARGES.md`](./guides/CAHIER_DES_CHARGES.md) — Cahier des charges fonctionnel et technique du POS.
- [`SUPABASE_MIGRATION_GUIDE.md`](./guides/SUPABASE_MIGRATION_GUIDE.md) — Guide complet de déploiement et migration PostgreSQL/Supabase.
- [`PLAN_OPTIMISATION_STORAGE_EGRESS.md`](./guides/PLAN_OPTIMISATION_STORAGE_EGRESS.md) — Optimisation du stockage Cloud et réduction du trafic egress Supabase.
- [`TACHES_SYNC_STOCK.md`](./guides/TACHES_SYNC_STOCK.md) — Architecture et matrice des flux de synchronisation des stocks.
- [`AMELIORATIONS_SUGGEREES.md`](./guides/AMELIORATIONS_SUGGEREES.md) — Feuille de route des évolutions futures du produit.
