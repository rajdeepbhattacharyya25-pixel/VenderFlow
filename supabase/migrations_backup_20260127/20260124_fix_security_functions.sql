-- Fix security warning: Function Search Path Mutable
-- remediating: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

ALTER FUNCTION public.create_product_stock SET search_path = public;
ALTER FUNCTION public.update_updated_at SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.update_store_customers_updated_at SET search_path = public;
