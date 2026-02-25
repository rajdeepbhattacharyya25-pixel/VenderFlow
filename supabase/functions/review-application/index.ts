import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyRateLimit } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply rate limiting (DEFAULT level - 20 requests per minute)
  const rateLimitResponse = applyRateLimit(req, 'review-application', 'DEFAULT');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const posthogApiKey = Deno.env.get('POSTHOG_API_KEY')!
    const posthogHost = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com'

    // Client for auth check
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Verify Admin Role
    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Parse Request
    const { application_id, action, rejection_reason } = await req.json()
    if (!application_id || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Admin client to bypass RLS for user creation/updates
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Fetch application
    const { data: application, error: fetchError } = await adminClient
      .from('seller_applications')
      .select('*')
      .eq('id', application_id)
      .single()

    if (fetchError || !application) throw new Error('Application not found')
    if (application.status !== 'pending') throw new Error('Application already processed')

    const now = new Date().toISOString()

    if (action === 'reject') {
      await adminClient
        .from('seller_applications')
        .update({ status: 'rejected', reviewed_at: now, reviewed_by: user.id })
        .eq('id', application_id)

      // Audit
      await adminClient.from('audit_logs').insert({
        actor_id: user.id, action: 'application_rejected', target_type: 'application', target_id: application_id, metadata: { reason: rejection_reason }
      })

      return new Response(JSON.stringify({ success: true, status: 'rejected' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'approve') {
      // 1. Ensure user exists
      let targetUserId = null;
      let isNewUser = false;

      // Check if user already exists by email
      const { data: { users }, error: authSearchError } = await adminClient.auth.admin.listUsers();
      const existingUser = users.find((u: any) => u.email === application.email);

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Create and invite
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(application.email, {
          data: { role: 'seller', full_name: application.name }
        })
        if (inviteError) throw new Error(`Failed to invite user: ${inviteError.message}`)
        targetUserId = inviteData.user.id
        isNewUser = true;
      }

      // 2. Generate Store URL friendly slug
      const safeSlug = application.business_name.toLowerCase().replace(/[^a-z0-9-]/g, '') + '-' + Math.floor(Math.random() * 1000)

      // 3. Create Store
      const { data: rpcResult, error: rpcError } = await adminClient.rpc('create_seller_if_not_exists', {
        p_user_id: targetUserId,
        p_store_name: application.business_name,
        p_slug: safeSlug,
        p_created_by: user.id
      })

      if (rpcError) throw new Error(`Failed to create store: ${rpcError.message}`)
      const seller = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

      if (isNewUser) {
        // Ensure new sellers start in onboarding status instead of default active
        await adminClient.from('sellers').update({ status: 'onboarding' }).eq('id', seller.id);
      }

      // 4. Update Profile & Application
      await adminClient.from('profiles').update({ role: 'seller' }).eq('id', targetUserId)

      await adminClient
        .from('seller_applications')
        .update({ status: 'approved', reviewed_at: now, reviewed_by: user.id, linked_seller_id: seller.id })
        .eq('id', application_id)

      // Resolve any old pending requests for this email to prevent spam blocking
      await adminClient
        .from('seller_applications')
        .update({ status: 'rejected', message: 'Auto-rejected due to approval of a newer application' })
        .eq('email', application.email)
        .eq('status', 'pending');

      // 5. Analytics
      if (posthogApiKey) {
        try {
          const events: any[] = [
            {
              event: 'application_approved',
              distinct_id: targetUserId,
              properties: {
                application_id: application.id,
                seller_id: seller.id
              }
            }
          ];

          if (isNewUser) {
            events.push({
              event: 'store_created',
              distinct_id: targetUserId,
              properties: {
                seller_id: seller.id,
                user_id: targetUserId,
                slug: seller.slug,
                store_name: seller.store_name,
                application_id: application.id,
                plan: 'free'
              }
            });
          }

          // Send events in parallel
          await Promise.all(events.map(ev =>
            fetch(`${posthogHost}/capture/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ api_key: posthogApiKey, ...ev })
            })
          ));

        } catch (phError) {
          console.error('PostHog Capture Error:', phError);
        }
      }

      // 6. Audit
      await adminClient.from('audit_logs').insert({
        actor_id: user.id, action: 'application_approved', target_type: 'application', target_id: application_id, metadata: { new_seller_id: seller.id }
      })

      return new Response(JSON.stringify({ success: true, status: 'approved', seller_id: seller.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error: any) {
    console.error('Error processing application:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
