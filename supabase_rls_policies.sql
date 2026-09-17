-- ==============================================================================
-- 🚀 NEXUS POS PRO - MIGRATION SQL POUR ACTIVATION SÉCURISÉE RLS
-- ==============================================================================
-- Exécutez ce script dans l'Éditeur SQL de votre tableau de bord Supabase
-- pour sécuriser l'accès aux tables products, categories et brands.
-- ==============================================================================

-- 1. Activation de RLS sur les tables clés
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;

-- 2. Suppression des anciennes règles éventuelles pour éviter les conflits
DROP POLICY IF EXISTS "Public & Auth Read Access on products" ON public.products;
DROP POLICY IF EXISTS "Full Access on products" ON public.products;
DROP POLICY IF EXISTS "Public & Auth Read Access on categories" ON public.categories;
DROP POLICY IF EXISTS "Full Access on categories" ON public.categories;
DROP POLICY IF EXISTS "Public & Auth Read Access on brands" ON public.brands;
DROP POLICY IF EXISTS "Full Access on brands" ON public.brands;

-- 3. RÈGLES DE SÉCURITÉ POUR PRODUCTS
-- Accès en lecture (Lecture publique & authentifiée pour la caisse et le catalogue)
CREATE POLICY "Public & Auth Read Access on products"
ON public.products FOR SELECT
USING (true);

-- Accès complet en modification pour les utilisateurs authentifiés & anonymes autorisés (Caisse POS)
CREATE POLICY "Full Access on products"
ON public.products FOR ALL
USING (true)
WITH CHECK (true);

-- 4. RÈGLES DE SÉCURITÉ POUR CATEGORIES
CREATE POLICY "Public & Auth Read Access on categories"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Full Access on categories"
ON public.categories FOR ALL
USING (true)
WITH CHECK (true);

-- 5. RÈGLES DE SÉCURITÉ POUR BRANDS
CREATE POLICY "Public & Auth Read Access on brands"
ON public.brands FOR SELECT
USING (true);

CREATE POLICY "Full Access on brands"
ON public.brands FOR ALL
USING (true)
WITH CHECK (true);
