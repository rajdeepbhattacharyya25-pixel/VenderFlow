-- TEST SUITE: System Alerts Throttling & Dispatching

-- 1. Test 'critical' alerts (No suppression)
SELECT public.create_system_alert(
  p_alert_type := 'TEST_CRITICAL',
  p_severity := 'critical',
  p_title := 'Test Critical 1',
  p_message := 'This should not be suppressed',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:critical:1'
);

SELECT public.create_system_alert(
  p_alert_type := 'TEST_CRITICAL',
  p_severity := 'critical',
  p_title := 'Test Critical 2',
  p_message := 'This should also not be suppressed (instant)',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:critical:1'
);

-- 2. Test 'warning' alerts (30 min suppression)
SELECT public.create_system_alert(
  p_alert_type := 'TEST_WARNING',
  p_severity := 'warning',
  p_title := 'Test Warning 1',
  p_message := 'First warning should trigger',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:warning:1'
);

SELECT public.create_system_alert(
  p_alert_type := 'TEST_WARNING',
  p_severity := 'warning',
  p_title := 'Test Warning 2',
  p_message := 'Second warning (duplicate fingerprint) SHOULD be suppressed',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:warning:1'
);

-- 3. Test 'info' alerts (2 hour suppression)
SELECT public.create_system_alert(
  p_alert_type := 'TEST_INFO',
  p_severity := 'info',
  p_title := 'Test Info 1',
  p_message := 'First info should trigger',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:info:1'
);

SELECT public.create_system_alert(
  p_alert_type := 'TEST_INFO',
  p_severity := 'info',
  p_title := 'Test Info 2',
  p_message := 'Second info (duplicate fingerprint) SHOULD be suppressed',
  p_seller_id := NULL,
  p_metadata := '{"test": true}',
  p_fingerprint := 'test:info:1'
);

-- 4. Check results
SELECT 
  severity, 
  title, 
  occurrence_count, 
  last_seen_at - created_at as duration_since_first
FROM public.system_alerts
WHERE alert_type LIKE 'TEST_%'
ORDER BY created_at DESC;
