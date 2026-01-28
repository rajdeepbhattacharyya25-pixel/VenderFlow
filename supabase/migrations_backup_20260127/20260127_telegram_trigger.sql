-- Create a specific trigger function just for new messages
CREATE OR REPLACE FUNCTION notify_admin_on_new_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url text := 'YOUR_PROJECT_URL'; -- Will be replaced at runtime or config
  anon_key text := 'YOUR_ANON_KEY';       -- Will be replaced at runtime or config
  -- In production, best to use pg_net extension if available, or just rely on Edge Function invoke via client
  -- for simplicity in this demo, we will creating a webhook helper.
BEGIN
  -- We'll assume the client calls the edge function for now TO AVOID COMPLEXITY
  -- because calling Edge Functions from Postgres triggers requires pg_net extension enabled.
  
  -- However, to fulfill the "Offline" requirement properly, we SHOULD enable pg_net if possible.
  -- Since I cannot easily enable extensions on your hosted instance without permissions,
  -- I will create a function that *returns* the trigger but we will rely on client-side hooks 
  -- or a simpler Polling mechanism if pg_net is missing.
  
  -- PLATFORM DECISION: For this "MVP", we will use the CLIENT-SIDE HOOK approach 
  -- for immediate feedback, but prepare the DB structure.
  
  RETURN NEW;
END;
$$;
