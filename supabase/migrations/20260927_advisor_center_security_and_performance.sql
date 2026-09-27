-- =============================================================================
-- MIGRATION APPLIQUÉE EN DIRECT VIA SUPABASE MCP SUR unlwfvldqxfccgrrgbwf
-- Résultat get_advisors (Security & Performance) : {"lints": []} (0 alerte)
-- =============================================================================

BEGIN;

-- 1. Résolution de anon_security_definer_function_executable (0028)
--    et authenticated_security_definer_function_executable (0029) :
--    Passage des fonctions RPC en SECURITY INVOKER (respect strict des politiques RLS)
ALTER FUNCTION public.adjust_customer_balance(text, numeric, numeric, integer) SECURITY INVOKER;
ALTER FUNCTION public.adjust_product_stock(text, numeric) SECURITY INVOKER;

-- 2. Résolution de unused_index (0005) :
--    Suppression des 3 index inutilisés signalés par le Performance Advisor
DROP INDEX IF EXISTS public.idx_customers_phone;
DROP INDEX IF EXISTS public.idx_customers_name;
DROP INDEX IF EXISTS public.idx_attendance_date;

-- Note : Les alertes Auth ont également été résolues via l'API de configuration Auth :
--   - auth_leaked_password_protection : password_hibp_enabled = true (HaveIBeenPwned activé)
--   - auth_db_connections_absolute : db_max_pool_size_unit = 'percent' (10%)

COMMIT;
