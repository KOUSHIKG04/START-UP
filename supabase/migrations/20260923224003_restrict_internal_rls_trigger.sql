-- Supabase installs this event-trigger helper in public. It is not an API RPC.
-- Event triggers continue to invoke it as the database owner; API roles do not
-- need direct EXECUTE privilege.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
