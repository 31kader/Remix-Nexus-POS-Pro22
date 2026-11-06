-- Migration : Synchronisation automatique des mots de passe clients (public.customers -> auth.users)
-- Permet aux clients modifiés dans Nexus POS Pro de se connecter instantanément à l'application mobile/web client.

CREATE OR REPLACE FUNCTION public.sync_customer_password_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id uuid;
BEGIN
  -- 1. Si auth_uid est absent mais que l'email existe, retrouver le compte auth.users
  IF (NEW.auth_uid IS NULL OR NEW.auth_uid = '') AND NEW.email IS NOT NULL AND NEW.email <> '' THEN
    SELECT id INTO v_auth_id
    FROM auth.users
    WHERE lower(email) = lower(trim(NEW.email))
    LIMIT 1;
    
    IF v_auth_id IS NOT NULL THEN
      NEW.auth_uid := v_auth_id::text;
    END IF;
  END IF;

  -- 2. Si auth_uid est présent et qu'un nouveau password_hash existe
  IF NEW.auth_uid IS NOT NULL AND NEW.auth_uid <> '' AND NEW.password_hash IS NOT NULL AND NEW.password_hash <> '' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (NEW.password_hash IS DISTINCT FROM OLD.password_hash OR NEW.auth_uid IS DISTINCT FROM OLD.auth_uid)) THEN
      UPDATE auth.users
      SET encrypted_password = NEW.password_hash,
          updated_at = now()
      WHERE id = NEW.auth_uid::uuid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_password_to_auth ON public.customers;
CREATE TRIGGER trg_sync_customer_password_to_auth
BEFORE INSERT OR UPDATE OF password_hash, auth_uid, email
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_password_to_auth();
