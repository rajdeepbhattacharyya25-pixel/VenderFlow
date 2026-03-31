import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";
import { stringify } from "https://deno.land/std@0.224.0/csv/stringify.ts";

// Helper to wait
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function refreshGoogleToken(refresh_token: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
      grant_type: 'refresh_token',
    })
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
       throw new Error("401 Unauthorized");
    }
    throw new Error(data.error || "Failed to refresh token");
  }
  return data;
}

function cleanForCSV(dataArray: any[]) {
  if (!dataArray || dataArray.length === 0) return [];
  
  return dataArray.map(item => {
    const cleanItem = { ...item };
    // Remove technical fields
    delete cleanItem.embedding;
    delete cleanItem.vector;
    
    // Ensure all values are primitives for stringify
    for (const key in cleanItem) {
      if (typeof cleanItem[key] === 'object' && cleanItem[key] !== null) {
        cleanItem[key] = JSON.stringify(cleanItem[key]);
      }
    }
    return cleanItem;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header." }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const reqData = await req.json();
    const { seller_id, job_id } = reqData;

    if (!seller_id || !job_id) {
       return new Response(JSON.stringify({ error: "Missing seller_id or job_id." }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRole!);

    // Start marking job as processing
    await supabaseAdmin.from('backup_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job_id);

    try {
      // 1. Fetch integration tokens
      const { data: integration, error: intError } = await supabaseAdmin
        .from('seller_integrations')
        .select('*')
        .eq('seller_id', seller_id)
        .eq('provider', 'google_drive')
        .single();

      if (intError || !integration || !integration.refresh_token) {
        throw new Error("401 Unauthorized"); // Treat missing native tokens as needing reconnect
      }

      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      // Refresh the token immediately to guarantee valid access
      let accessToken = integration.access_token;
      try {
         const newTokens = await refreshGoogleToken(integration.refresh_token, clientId!, clientSecret!);
         accessToken = newTokens.access_token;
         await supabaseAdmin.from('seller_integrations').update({ 
            access_token: newTokens.access_token,
            updated_at: new Date().toISOString()
         }).eq('id', integration.id);
      } catch(refreshErr) {
         if (refreshErr.message === "401 Unauthorized") {
             throw new Error("401 Unauthorized"); // Propagate the explicit 401
         }
         throw refreshErr;
      }

      // 2. Fetch all seller data
      // Products
      const { data: products } = await supabaseAdmin.from('products').select('*').eq('seller_id', seller_id);
      // Orders
      const { data: orders } = await supabaseAdmin.from('orders').select('*').eq('seller_id', seller_id);
      // Profile
      const { data: profile } = await supabaseAdmin.from('sellers').select('*').eq('id', seller_id).single();

      // 3. Create full Restore JSON
      const restorePayload = {
         backup_version: "1.0",
         generated_at: new Date().toISOString(),
         seller_id,
         profile,
         products,
         orders
      };
      
      const restoreJsonString = JSON.stringify(restorePayload, null, 2);

      // 4. Create Human-Readable CSV Data
      const cleanProducts = cleanForCSV(products || []);
      const cleanOrders = cleanForCSV(orders || []);
      const cleanProfile = cleanForCSV([profile])[0];
      
      const summaryText = `VendorFlow Backup Summary
Date: ${new Date().toISOString()}
Seller ID: ${seller_id}
Total Products: ${cleanProducts.length}
Total Orders: ${cleanOrders.length}`;

      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonFilename = `vendorflow_backup_restore_${dateStr}.json`;

      const jsZip = new JSZip();
      jsZip.file("summary.txt", summaryText);
      jsZip.file("profile.json", JSON.stringify(cleanProfile, null, 2));
      jsZip.file(jsonFilename, restoreJsonString);
      
      if (cleanProducts.length > 0) {
        jsZip.file("products.csv", stringify(cleanProducts, { columns: Object.keys(cleanProducts[0]) }));
      } else {
        jsZip.file("products.csv", "No products found.");
      }

      if (cleanOrders.length > 0) {
        jsZip.file("orders.csv", stringify(cleanOrders, { columns: Object.keys(cleanOrders[0]) }));
      } else {
        jsZip.file("orders.csv", "No orders found.");
      }

      const zipBlob = await jsZip.generateAsync({ type: "blob" });

      // 5. Upload to Google Drive
      // Setup Folder logic (check if 'VendorFlow Backups' folder exists, else create it)
      const folderName = `VendorFlow Backups`; // You can nest seller_id inside if needed
      let searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (searchRes.status === 401) throw new Error("401 Unauthorized");
      let searchData = await searchRes.json();
      let parentFolderId = null;

      if (searchData.files && searchData.files.length > 0) {
          parentFolderId = searchData.files[0].id;
      } else {
          // create folder
          const folderMetadata = {
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder'
          };
          const fRes = await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(folderMetadata)
          });
          const fData = await fRes.json();
          parentFolderId = fData.id;
      }

      const uploadToDrive = async (filename: string, mimeType: string, contentBlob: Blob) => {
          const metadata = {
              name: filename,
              parents: [parentFolderId]
          };

          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', contentBlob);

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${accessToken}`
              },
              body: form
          });
          
          if (res.status === 401) throw new Error("401 Unauthorized");
          return await res.json();
      };

      const zipFilename  = `vendorflow_backup_${dateStr}.zip`;
      
      const uploadedZip = await uploadToDrive(zipFilename, 'application/zip', zipBlob);

      const totalSize = zipBlob.size;

      await supabaseAdmin.from('backup_jobs').update({
          status: 'completed',
          file_name: zipFilename,
          file_size_bytes: totalSize,
          drive_file_id: uploadedZip.id,
          completed_at: new Date().toISOString(),
          is_restorable: true
      }).eq('id', job_id);

      // Clean up old backups (Retain top 5 most recent manual backups)
      if (!reqData.retention_opt_out) {
          // Query completed backups for seller
          const { data: allBackups } = await supabaseAdmin.from('backup_jobs')
              .select('id, created_at, drive_file_id')
              .eq('seller_id', seller_id)
              .eq('status', 'completed')
              .order('created_at', { ascending: false });

          if (allBackups && allBackups.length > 5) {
              const toDeleteIds = allBackups.slice(5).map((b: {id: string, drive_file_id: string|null}) => b.id);
              
              // Delete from Google Drive to actually save space
              const toDeleteFiles = allBackups.slice(5).filter((b: {id: string, drive_file_id: string|null}) => b.drive_file_id);
              for (const oldJob of toDeleteFiles) {
                  try {
                      await fetch(`https://www.googleapis.com/drive/v3/files/${oldJob.drive_file_id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${accessToken}` }
                      });
                  } catch (e) {
                      console.error(`Failed to delete drive file ${oldJob.drive_file_id}`, e);
                  }
              }

              // Delete from Database
              await supabaseAdmin.from('backup_jobs').delete().in('id', toDeleteIds);
          }
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (jobErr) {
       console.error("Job Error:", jobErr);
       const isAuthError = jobErr.message === "401 Unauthorized";
       const finalMsg = isAuthError ? "401 Unauthorized" : (jobErr.message || "Unknown Error");
       
       await supabaseAdmin.from('backup_jobs').update({
          status: 'failed',
          error_message: finalMsg,
          completed_at: new Date().toISOString()
       }).eq('id', job_id);

       return new Response(JSON.stringify({ error: finalMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("Error generating backup:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
