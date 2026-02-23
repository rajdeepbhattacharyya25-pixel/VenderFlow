import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS for background cleanup
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Add auth check - require a cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Optional security if called via HTTP
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date().toISOString();

    // Find expired previews
    const { data: expiredPreviews, error: fetchError } = await supabase
      .from('previews')
      .select('id, vendor_id, published')
      .lt('expires_at', now);

    if (fetchError) throw fetchError;

    if (!expiredPreviews || expiredPreviews.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired previews to clean up", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete expired previews
    const { error: deleteError } = await supabase
      .from('previews')
      .delete()
      .lt('expires_at', now);

    if (deleteError) throw deleteError;

    // Log actions
    const auditLogs = expiredPreviews.map(p => ({
      actor_id: p.vendor_id,
      action: 'preview_auto_deleted',
      target_type: 'preview',
      target_id: p.id,
      metadata: { reason: "expired", was_published: p.published }
    }));

    await supabase.from('audit_logs').insert(auditLogs);

    return new Response(
      JSON.stringify({
        message: "Cleanup successful",
        count: expiredPreviews.length,
        deleted_ids: expiredPreviews.map(p => p.id)
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Cleanup Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
