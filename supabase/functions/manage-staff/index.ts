
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get('ALLOWED_ORIGIN') ?? "https://vendorflow.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("--- manage-staff execution started ---");
        const body = await req.json();
        console.log("Request body:", JSON.stringify(body));
        const { action, name, permissions, storeId, staffId, kiosk } = body;
        const role = body.role?.toLowerCase();


        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization header");

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            console.error("Auth error:", authError);
            throw new Error("Unauthorized");
        }
        console.log("Authenticated user:", user.id);

        console.log(`Checking store access for storeId: ${storeId}`);
        // Case A: User is the Seller (Sellers table ID == Auth UID)
        const { data: store, error: storeError } = await supabaseClient
            .from('sellers')
            .select('id, store_name')
            .eq('id', storeId)
            .single();

        if (storeError || !store) {
            console.log("Seller check failed, checking staff access...");
            // Case B: User is a Staff member with 'manager' or 'admin' role for that store.
            const { data: staffData, error: staffError } = await supabaseClient
                .from('store_staff')
                .select('role')
                .eq('store_id', storeId)
                .eq('user_id', user.id)
                .single();

            if (staffError || !staffData || (staffData.role !== 'admin' && staffData.role !== 'manager')) {
                console.error("Access denied. StoreError:", storeError, "StaffError:", staffError);
                throw new Error("Access denied: You do not have permission to manage staff for this store.");
            }
        }
        console.log("Store access verified.");

        if (action === "create") {
            console.log("Action: create. Generating user...");
            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const uniqueSuffix = crypto.randomUUID().split('-')[0];
            const email = `staff.${cleanName}.${uniqueSuffix}@vendorflow.local`;
            const password = crypto.randomUUID() + crypto.randomUUID();

            const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    full_name: name,
                    is_staff: true,
                    store_id: storeId,
                    role: role,
                    created_by: user.id
                }
            });

            if (createUserError) {
                console.error("createUserError:", createUserError);
                throw createUserError;
            }
            console.log("User created in Auth:", newUser.user.id);

            console.log("Inserting into store_staff...");
            const { error: insertError } = await supabaseAdmin
                .from('store_staff')
                .insert({
                    store_id: storeId,
                    user_id: newUser.user.id,
                    name: name,
                    role: role,
                    permissions: permissions || {}
                });

            if (insertError) {
                console.error("insertError:", insertError);
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                throw insertError;
            }
            console.log("Inserted into store_staff successfully.");

            console.log("Logging audit entry...");
            const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
                store_id: storeId,
                actor_id: user.id,
                action: 'staff_invited',
                target_type: 'staff',
                target_id: newUser.user.id,
                metadata: { name, role, email, is_kiosk: !!kiosk }
            });
            if (auditError) console.error("Audit logging failed (non-blocking):", auditError);

            console.log("Generating magic link...");
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
                options: {
                    redirectTo: `${corsHeaders["Access-Control-Allow-Origin"]}/dashboard`
                }
            });

            if (linkError) {
                console.error("linkError:", linkError);
                throw linkError;
            }

            return new Response(JSON.stringify({
                success: true,
                message: "Staff member created.",
                email: email,
                login_link: linkData.properties?.action_link,
                expires_at: kiosk ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (action === "delete") {
            console.log(`Action: delete. staffId: ${staffId}`);
            const { data: staffMember, error: fetchError } = await supabaseClient
                .from('store_staff')
                .select('user_id')
                .eq('id', staffId)
                .eq('store_id', storeId)
                .single();

            if (fetchError || !staffMember) {
                console.error("Staff member not found or access denied. FetchError:", fetchError);
                throw new Error("Staff member not found or access denied");
            }

            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(staffMember.user_id);
            if (deleteUserError) {
                console.error("deleteUserError:", deleteUserError);
                throw deleteUserError;
            }

            console.log("User deleted from Auth and store_staff.");
            await supabaseAdmin.from('audit_logs').insert({
                store_id: storeId,
                actor_id: user.id,
                action: 'staff_removed',
                target_type: 'staff',
                target_id: staffMember.user_id,
                metadata: { staff_id: staffId }
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        throw new Error("Invalid action");

    } catch (error: any) {
        console.error('--- manage-staff ERROR ---');
        console.error(error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Internal error',
            details: error.toString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
