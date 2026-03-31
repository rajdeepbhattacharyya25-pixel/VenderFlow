-- Migration: Advanced Health Metrics for Admin Dashboard
-- Created: 2026-04-01

CREATE OR REPLACE FUNCTION public.get_advanced_health_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_max_latency numeric;
  v_mean_latency numeric;
  v_unindexed_fks int;
  v_missing_rls int;
  v_realtime_calls bigint;
BEGIN
  -- 1. Latency Metrics (from pg_stat_statements)
  SELECT 
    MAX(max_exec_time), 
    SUM(total_exec_time) / NULLIF(SUM(calls), 0)
  INTO v_max_latency, v_mean_latency
  FROM pg_stat_statements
  WHERE query NOT LIKE '%pg_stat_statements%';

  -- 2. Unindexed Foreign Keys
  WITH fk_columns AS (
    SELECT
      n.nspname as schema_name,
      t.relname as table_name,
      a.attname as column_name
    FROM pg_constraint con
    JOIN pg_class t ON t.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'f' AND n.nspname = 'public'
  ),
  indexed_columns AS (
    SELECT
      n.nspname as schema_name,
      t.relname as table_name,
      a.attname as column_name
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
  )
  SELECT COUNT(*) INTO v_unindexed_fks
  FROM fk_columns f
  LEFT JOIN indexed_columns i 
    ON f.schema_name = i.schema_name 
    AND f.table_name = i.table_name 
    AND f.column_name = i.column_name
  WHERE i.column_name IS NULL;

  -- 3. Security Check (Tables missing RLS)
  SELECT COUNT(*) INTO v_missing_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r' 
    AND NOT c.relrowsecurity;

  -- 4. Realtime Load (Calls to list_changes)
  SELECT SUM(calls) INTO v_realtime_calls
  FROM pg_stat_statements
  WHERE query LIKE '%realtime.list_changes%';

  RETURN json_build_object(
    'max_latency_ms', ROUND(v_max_latency::numeric, 2),
    'mean_latency_ms', ROUND(v_mean_latency::numeric, 2),
    'unindexed_fks', v_unindexed_fks,
    'missing_rls_count', v_missing_rls,
    'realtime_calls_total', COALESCE(v_realtime_calls, 0),
    'timestamp', NOW()
  );
END;
$$;
