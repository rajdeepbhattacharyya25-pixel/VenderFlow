-- RPC function to get system health and storage metrics

CREATE OR REPLACE FUNCTION public.get_system_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_db_size text;
  v_table_stats json;
BEGIN
  -- Get DB Size (Pretty printed)
  SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

  -- Get row counts for critical tables
  SELECT json_agg(t) INTO v_table_stats
  FROM (
    SELECT 
      relname as name, 
      n_live_tup as rows
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
    LIMIT 5
  ) t;

  RETURN json_build_object(
    'status', '✅ Operational',
    'database_size', v_db_size,
    'top_tables', v_table_stats,
    'timestamp', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'status', '❌ Error',
    'error', SQLERRM
  );
END;
$$;
