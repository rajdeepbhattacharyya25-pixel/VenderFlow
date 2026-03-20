import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type ApiProvider = 'groq' | 'gemini' | 'openrouter' | 'brevo';

/**
 * Logs API usage to the api_usage_logs table.
 * This is used by the Admin dashboard to monitor API health and quotas.
 */
export async function logApiUsage(
  supabase: SupabaseClient, 
  provider: ApiProvider, 
  endpoint: string, 
  status: number,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabase
      .from('api_usage_logs')
      .insert({
        provider,
        endpoint,
        status_code: status,
        metadata
      });
    
    if (error) {
      console.error(`[ApiMonitor] Error inserting log for ${provider}:`, error.message);
    }
  } catch (err) {
    console.error(`[ApiMonitor] Critical error logging API usage for ${provider}:`, err);
  }
}

/**
 * Checks if the API limit for a given provider has been reached.
 * Returns true if usage is within limits, false otherwise.
 */
export async function checkApiLimit(
  supabase: SupabaseClient,
  provider: ApiProvider
): Promise<boolean> {
  try {
    // 1. Get current month's usage count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('api_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('provider', provider)
      .eq('status_code', 200)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) throw countError;

    // 2. Get limit from configuration
    const { data: config, error: configError } = await supabase
      .from('api_limits_config')
      .select('monthly_limit')
      .eq('provider', provider)
      .single();

    if (configError) {
      console.warn(`[ApiMonitor] No limit config found for ${provider}, assuming unlimited.`);
      return true;
    }

    if (!config.monthly_limit || config.monthly_limit === -1) return true;

    return (count || 0) < config.monthly_limit;
  } catch (err) {
    console.error(`[ApiMonitor] Error checking limit for ${provider}:`, err);
    return true; // Fail open to avoid blocking service if logging fails
  }
}
