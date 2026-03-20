import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active sellers
    let sellers = [];
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('slug, updated_at')
        .eq('status', 'active')
        .eq('is_active', true);

      if (error) throw error;
      sellers = data || [];
    } catch (err) {
      console.error('CRITICAL: Error fetching sellers for sitemap:', err);
      // We continue with an empty list to at least provide static pages
    }

    const baseUrl = 'https://vendorflow.vercel.app';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static root pages
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/register</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

    // Dynamic Seller pages
    if (sellers.length > 0) {
      for (const seller of sellers) {
        if (!seller.slug) continue;
        // Fallback to today if updated_at is null
        const lastMod = seller.updated_at ? seller.updated_at.split('T')[0] : today;
        xml += `  <url>\n    <loc>${baseUrl}/store/${seller.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      }
    } else {
      console.warn('Sitemap Info: No active sellers found to include in dynamic paths.');
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
