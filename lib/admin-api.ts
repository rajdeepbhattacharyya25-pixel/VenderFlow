import { supabase, secureInvoke } from './supabase';

interface InviteSellerData {
    email: string;
    store_name: string;
    slug: string;
    plan: 'free' | 'pro' | 'enterprise';
}

interface ChangeSellerStatusData {
    sellerId: string;
    status: 'active' | 'suspended';
}

interface ListSellersParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    plan?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'order' | 'seller' | 'support';
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

interface SellerWithStats {
    id: string;
    store_name: string;
    slug: string;
    plan: string;
    status: string;
    is_active: boolean;
    created_at: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
    };
    stats: {
        productCount: number;
        imageCount: number;
        orderCount: number;
    };
}

/**
 * Invite a new seller to the platform
 */
export async function inviteSeller(data: InviteSellerData): Promise<ApiResponse<{ sellerId: string }>> {
    try {
        const { data: result, error } = await secureInvoke('invite-seller', {
            body: data,
        });

        if (error) {
            return { success: false, error: error.message || 'Failed to invite seller' };
        }

        return { success: true, data: result as { sellerId: string } };
    } catch (error: unknown) {
        console.error('Error inviting seller:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Change a seller's status (activate/suspend)
 */
export async function changeSellerStatus(data: ChangeSellerStatusData): Promise<ApiResponse<void>> {
    try {
        const { error } = await secureInvoke('seller-status', {
            body: data,
        });

        if (error) {
            return { success: false, error: error.message || 'Failed to update seller status' };
        }

        return { success: true };
    } catch (error: unknown) {
        console.error('Error changing seller status:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * List sellers with pagination and filters
 */
export async function listSellers(params: ListSellersParams = {}): Promise<ApiResponse<{ sellers: unknown[], total: number }>> {
    try {
        const { data, error } = await secureInvoke('list-sellers', {
            method: 'GET',
            queryParams: params as Record<string, string>,
        });

        if (error) {
            return { success: false, error: error.message || 'Failed to list sellers' };
        }

        return { success: true, data: data as { sellers: unknown[], total: number } };
    } catch (error: unknown) {
        console.error('Error listing sellers:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Direct database operations for admin (fallback when Edge Functions aren't deployed)
 * These use RLS policies, so they only work for authenticated admins
 */
export const adminDb = {
    /**
     * List sellers directly from database
     */
    async listSellers(params: ListSellersParams = {}): Promise<{ sellers: SellerWithStats[], total: number }> {
        const { search, status, plan } = params;

        try {
            // Use RPC to fetch sellers with pre-calculated stats (bypassing RLS)
            const { data, error } = await supabase.rpc('get_sellers_with_stats', {
                search_term: search || null,
                status_filter: status || null,
                plan_filter: plan || null
            });

            if (error) throw error;

            // RPC returns the list, we need total count separately or assume simplified total
            // For total count, we can do a quick head fetch as before
            let countQuery = supabase.from('sellers').select('*', { count: 'exact', head: true });
            if (search) countQuery = countQuery.or(`store_name.ilike.%${search}%,slug.ilike.%${search}%`);
            if (status) countQuery = countQuery.eq('status', status);
            if (plan) countQuery = countQuery.eq('plan', plan);

            const { count } = await countQuery;

            interface SellerRpcRow {
                id: string;
                store_name: string;
                slug: string;
                plan: string;
                status: string;
                is_active: boolean;
                created_at: string;
                product_count: number;
                image_count: number;
                order_count: number;
            }

            // Map RPC result to expected format
            const sellersWithStats: SellerWithStats[] = ((data as unknown as SellerRpcRow[]) || []).map((row) => ({
                id: row.id,
                store_name: row.store_name,
                slug: row.slug,
                plan: row.plan,
                status: row.status,
                is_active: row.is_active,
                created_at: row.created_at,
                profiles: {
                    full_name: null,
                    avatar_url: null
                },
                stats: {
                    productCount: row.product_count,
                    imageCount: row.image_count,
                    orderCount: row.order_count
                }
            }));

            return { sellers: sellersWithStats, total: count || 0 };
        } catch (error) {
            console.error('Error listing sellers with stats:', error);
            // Fallback to basic list if RPC fails
            return { sellers: [], total: 0 };
        }
    },

    /**
     * Update seller status directly in database
     */
    async updateSellerStatus(sellerId: string, status: 'active' | 'suspended'): Promise<boolean> {
        const { error } = await supabase
            .from('sellers')
            .update({
                status,
                is_active: status === 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', sellerId);

        if (error) {
            console.error('Error updating seller status:', error);
            return false;
        }

        // Log the action
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('audit_logs').insert({
                actor_id: user.id,
                action: status === 'suspended' ? 'seller_suspended' : 'seller_activated',
                target_type: 'seller',
                target_id: sellerId,
            });
        }

        return true;
    },

    /**
     * Get audit logs for a seller or all logs
     */
    async getAuditLogs(params: { targetId?: string, limit?: number } = {}) {
        const { targetId, limit = 50 } = params;

        let query = supabase
            .from('audit_logs')
            .select('*, profiles!actor_id(full_name)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (targetId) {
            query = query.eq('target_id', targetId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get seller applications with pagination and filters
     */
    async getApplications(params: { page?: number, limit?: number, status?: string } = {}) {
        const { page = 1, limit = 25, status } = params;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('seller_applications')
            .select('*', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching applications:', error);
            return { applications: [], total: 0, error: error.message };
        }

        return { applications: data || [], total: count || 0 };
    },

    /**
     * Review an application (Approve or Reject)
     */
    async reviewApplication(applicationId: string, action: 'approve' | 'reject') {
        try {
            const { data, error } = await secureInvoke('review-application', {
                body: {
                    application_id: applicationId,
                    action: action
                }
            });

            if (error) {
                return { success: false, error: error.message || `Failed to ${action} application` };
            }

            return { success: true, data: data };
        } catch (error: unknown) {
            console.error(`Error processing application ${action}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Network error' };
        }
    },

    /**
     * Get real-time admin statistics for dashboard
     */
    async getAdminStats() {
        try {
            // 1. Total Sellers Count
            const { count: sellerCount } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true });

            // 2. Live Revenue (sum of all non-cancelled orders)
            const { data: revenueData } = await supabase
                .from('orders')
                .select('total')
                .neq('status', 'cancelled');

            const totalRevenue = (revenueData as { total: number }[] || [])?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

            // 3. Active Orders (pending + processing)
            const { count: activeOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'processing', 'confirmed']);

            // 4. Previous period stats for trend calculation (last 30 days vs prior 30 days)
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            const { count: recentSellers } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString());

            const { count: priorSellers } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString());

            // Calculate percentage changes
            const sellerChange = (priorSellers && priorSellers > 0)
                ? Math.round(((recentSellers || 0) - priorSellers) / priorSellers * 100)
                : (recentSellers || 0) > 0 ? 100 : 0;

            // 5. STORAGE ESTIMATION based on products and images
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true });

            const { count: imageCount } = await supabase
                .from('product_media')
                .select('*', { count: 'exact', head: true });

            // Estimate storage usage:
            // - Each product: ~5KB (metadata, JSON)
            // - Each image: ~500KB average (compressed)
            // - Supabase Free tier: 1GB storage
            const STORAGE_LIMIT_MB = 1 * 1024; // 1GB (Supabase free tier)
            const productStorageMB = ((productCount || 0) * 5) / 1024; // 5KB per product
            const imageStorageMB = ((imageCount || 0) * 500) / 1024; // 500KB per image
            const estimatedStorageMB = productStorageMB + imageStorageMB;
            const storagePercentage = Math.min((estimatedStorageMB / STORAGE_LIMIT_MB) * 100, 100);

            // 6.5. Get Advanced Health (Latency, Indexes, RLS)
            let advancedHealth = {
                max_latency_ms: 0,
                mean_latency_ms: 0,
                unindexed_fks: 0,
                missing_rls_count: 0,
                realtime_calls_total: 0
            };
            try {
                const { data: advMetrics } = await supabase.rpc('get_advanced_health_metrics');
                if (advMetrics) {
                    advancedHealth = advMetrics as typeof advancedHealth;
                }
            } catch (rpcError) {
                console.error("Failed to fetch advanced health metrics:", rpcError);
            }

            // 6. HEALTH STATUS based on thresholds
            // Factors: Storage usage, pending orders, seller count, and now LATENCY
            let healthScore = 100;
            let healthStatus: 'Normal' | 'Warning' | 'Critical' = 'Normal';
            const healthIssues: string[] = [];

            // Storage threshold check
            if (storagePercentage >= 90) {
                healthScore -= 30;
                healthIssues.push('Storage critical (>90%)');
            } else if (storagePercentage >= 75) {
                healthScore -= 15;
                healthIssues.push('Storage high (>75%)');
            }

            // Pending orders check (more than 50 unprocessed = warning)
            if ((activeOrders || 0) > 100) {
                healthScore -= 20;
                healthIssues.push('Too many pending orders');
            } else if ((activeOrders || 0) > 50) {
                healthScore -= 10;
                healthIssues.push('High pending orders');
            }

            // Latency check (NEW)
            if (advancedHealth.max_latency_ms > 500) {
                healthScore -= 40;
                healthIssues.push('Critical query latency (>500ms)');
            } else if (advancedHealth.max_latency_ms > 200) {
                healthScore -= 20;
                healthIssues.push('High query latency (>200ms)');
            }

            // Indexing check (NEW)
            if (advancedHealth.unindexed_fks > 5) {
                healthScore -= 10;
                healthIssues.push('Multiple unindexed foreign keys');
            }

            // Determine status from score
            if (healthScore >= 85) {
                healthStatus = 'Normal';
            } else if (healthScore >= 60) {
                healthStatus = 'Warning';
            } else {
                healthStatus = 'Critical';
            }

            // Round to one decimal place
            const sysHealth = Math.round(healthScore * 10) / 10;

            // 7. Get Actual Database Size via RPC
            let databaseSize = 'Unknown';
            try {
                const { data: dbMetrics } = await supabase.rpc('get_system_metrics');
                if (dbMetrics && (dbMetrics as { database_size?: string }).database_size) {
                    databaseSize = (dbMetrics as { database_size: string }).database_size;
                }
            } catch (rpcError) {
                console.error("Failed to fetch DB metrics:", rpcError);
            }

            // 8. Total Wallet Balances (New for Payout System)
            const { data: walletData } = await supabase
                .from('seller_wallets')
                .select('available_balance, reserve_balance, negative_balance');

            const totalAvailable = (walletData as { available_balance: number }[] || [])?.reduce((acc, w) => acc + (w.available_balance || 0), 0) || 0;
            const totalReserves = (walletData as { reserve_balance: number }[] || [])?.reduce((acc, w) => acc + (w.reserve_balance || 0), 0) || 0;
            const totalNegative = (walletData as { negative_balance: number }[] || [])?.reduce((acc, w) => acc + (w.negative_balance || 0), 0) || 0;

            // Calculate trends for orders and revenue
            const { data: recentOrderData } = await supabase
                .from('orders')
                .select('total')
                .neq('status', 'cancelled')
                .gte('created_at', thirtyDaysAgo.toISOString());

            const { data: priorOrderData } = await supabase
                .from('orders')
                .select('total')
                .neq('status', 'cancelled')
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString());

            const recentRevenue = (recentOrderData as { total: number }[] || [])?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;
            const priorRevenue = (priorOrderData as { total: number }[] || [])?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;
            const recentOrderCount = (recentOrderData as unknown[])?.length || 0;
            const priorOrderCount = (priorOrderData as unknown[])?.length || 0;

            const revenueChange = priorRevenue > 0
                ? Math.round((recentRevenue - priorRevenue) / priorRevenue * 100)
                : recentRevenue > 0 ? 100 : 0;

            const ordersChange = priorOrderCount > 0
                ? Math.round((recentOrderCount - priorOrderCount) / priorOrderCount * 100)
                : recentOrderCount > 0 ? 100 : 0;

            return {
                totalSellers: sellerCount || 0,
                sellerChange: sellerChange,
                liveRevenue: totalRevenue,
                revenueChange: revenueChange,
                activeOrders: activeOrders || 0,
                ordersChange: ordersChange,
                sysHealth: sysHealth,
                healthStatus: healthStatus,
                // Additional metrics for detailed view
                productCount: productCount || 0,
                imageCount: imageCount || 0,
                estimatedStorageMB: Math.round(estimatedStorageMB * 10) / 10,
                storagePercentage: Math.round(storagePercentage * 10) / 10,
                healthIssues: healthIssues,
                databaseSize: databaseSize,
                totalAvailable,
                totalReserves,
                totalNegative,
                // Advanced Performance Metrics
                max_latency_ms: advancedHealth.max_latency_ms,
                mean_latency_ms: advancedHealth.mean_latency_ms,
                unindexed_fks: advancedHealth.unindexed_fks,
                missing_rls_count: advancedHealth.missing_rls_count,
                realtime_calls_total: advancedHealth.realtime_calls_total
            };
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            return {
                totalSellers: 0,
                sellerChange: 0,
                liveRevenue: 0,
                revenueChange: 0,
                activeOrders: 0,
                ordersChange: 0,
                sysHealth: 0,
                healthStatus: 'Error' as const,
                productCount: 0,
                imageCount: 0,
                estimatedStorageMB: 0,
                storagePercentage: 0,
                healthIssues: ['Unable to fetch system data'],
                databaseSize: 'Unknown',
                totalAvailable: 0,
                totalReserves: 0,
                totalNegative: 0,
                max_latency_ms: 0,
                mean_latency_ms: 0,
                unindexed_fks: 0,
                missing_rls_count: 0,
                realtime_calls_total: 0
            };
        }
    },

    /**
     * Get recent platform activity from audit logs
     */
    async getRecentActivity(limit = 10) {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    id,
                    action,
                    target_type,
                    target_id,
                    metadata,
                    created_at,
                    profiles!actor_id(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching activity:', error);
                return [];
            }

            // Map to activity format
            return (data || []).map(log => {
                const actorName = (log.profiles as unknown as { full_name: string })?.full_name || 'System';
                let detail = '';
                let status = 'success';

                switch (log.action) {
                    case 'seller_invited':
                        detail = 'was invited to the platform';
                        status = 'pending';
                        break;
                    case 'seller_activated':
                        detail = 'account was activated';
                        status = 'success';
                        break;
                    case 'seller_suspended':
                        detail = 'account was suspended';
                        status = 'warning';
                        break;
                    case 'order_created':
                        detail = `processed a ₹${(log.metadata as { total?: number })?.total || 0} order`;
                        status = 'success';
                        break;
                    case 'product_created':
                        detail = 'added a new product';
                        status = 'success';
                        break;
                    default:
                        detail = log.action.replace(/_/g, ' ');
                }

                // Calculate relative time
                const createdAt = new Date(log.created_at);
                const now = new Date();
                const diffMs = now.getTime() - createdAt.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                let timeAgo = '';
                if (diffMins < 1) timeAgo = 'Just now';
                else if (diffMins < 60) timeAgo = `${diffMins} mins ago`;
                else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

                return {
                    id: log.id,
                    type: log.action,
                    user: actorName,
                    detail,
                    time: timeAgo,
                    status
                };
            });
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            return [];
        }
    },

    /**
     * Get critical alerts for admin dashboard
     */
    async getCriticalAlerts() {
        try {
            const alerts: {
                id: string;
                message: string;
                severity: 'critical' | 'warning' | 'info';
                actionLabel?: string;
                actionUrl?: string;
            }[] = [];

            // 1. Check for sellers pending verification for > 24 hours
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count: pendingSellers } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .lt('created_at', oneDayAgo);

            if (pendingSellers && pendingSellers > 0) {
                alerts.push({
                    id: 'pending-kyc',
                    message: `${pendingSellers} seller${pendingSellers > 1 ? 's have' : ' has'} failed KYC verification.`,
                    severity: 'critical',
                    actionLabel: 'Review Now',
                    actionUrl: '/admin/sellers?status=pending'
                });
            }

            // 2. Check for suspended sellers
            const { count: suspendedCount } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'suspended');

            if (suspendedCount && suspendedCount > 0) {
                alerts.push({
                    id: 'suspended-sellers',
                    message: `${suspendedCount} seller account${suspendedCount > 1 ? 's are' : ' is'} currently suspended.`,
                    severity: 'warning',
                    actionLabel: 'View Details',
                    actionUrl: '/admin/sellers?status=suspended'
                });
            }

            // 3. Check storage estimate from products/images
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true });

            const { count: imageCount } = await supabase
                .from('product_media')
                .select('*', { count: 'exact', head: true });

            const STORAGE_LIMIT_MB = 1 * 1024; // 1GB (Supabase free tier)
            const estimatedStorageMB = (((productCount || 0) * 5) + ((imageCount || 0) * 500)) / 1024;
            const storagePercentage = Math.round((estimatedStorageMB / STORAGE_LIMIT_MB) * 100);

            if (storagePercentage >= 75) {
                alerts.push({
                    id: 'storage-usage',
                    message: `Supabase project storage at ${storagePercentage}% capacity.`,
                    severity: storagePercentage >= 90 ? 'critical' : 'warning',
                    actionLabel: 'Manage Storage',
                    actionUrl: 'https://supabase.com/dashboard/project/_/storage/buckets'
                });
            }

            // 4. Check for high pending orders
            const { count: pendingOrders } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'processing']);

            if (pendingOrders && pendingOrders > 50) {
                alerts.push({
                    id: 'high-orders',
                    message: `${pendingOrders} orders awaiting processing.`,
                    severity: pendingOrders > 100 ? 'critical' : 'warning',
                    actionLabel: 'View Orders',
                    actionUrl: '/admin/orders?status=pending'
                });
            }

            return alerts;
        } catch (error) {
            console.error('Error fetching critical alerts:', error);
            return [];
        }
    },

    /**
     * Create a platform announcement
     */
    async createAnnouncement(data: { title: string; content: string; type?: 'info' | 'warning' | 'update'; targetType?: 'platform' | 'seller'; targetId?: string }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // Create announcement in dedicated table
            const { error } = await supabase.from('announcements').insert({
                title: data.title,
                content: data.content,
                type: data.type || 'info',
                target_type: data.targetType || 'platform',
                target_id: data.targetId || null,
                created_by: user.id
            });

            if (error) {
                console.error('Error creating announcement:', error);
                return { success: false, error: error.message };
            }

            // Also log to audit_logs for history
            await supabase.from('audit_logs').insert({
                actor_id: user.id,
                action: 'announcement_created',
                target_type: data.targetType || 'platform',
                target_id: data.targetId || null,
                metadata: {
                    title: data.title,
                    type: data.type || 'info'
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Error creating announcement:', error);
            return { success: false, error: 'Failed to create announcement' };
        }
    },

    /**
     * Export platform report as CSV data
     */
    async exportReport(type: 'sellers' | 'orders' | 'all' = 'all') {
        try {
            const report: { sellers?: unknown[]; orders?: unknown[] } = {};

            if (type === 'sellers' || type === 'all') {
                const { data: sellers } = await supabase
                    .from('sellers')
                    .select('id, store_name, plan, status, is_active, created_at')
                    .order('created_at', { ascending: false });
                report.sellers = sellers || [];
            }

            if (type === 'orders' || type === 'all') {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, total, status, created_at, seller_id')
                    .order('created_at', { ascending: false })
                    .limit(1000);
                report.orders = orders || [];
            }

            return report;
        } catch (error) {
            console.error('Error exporting report:', error);
            return { sellers: [], orders: [] };
        }
    },

    /**
     * Get revenue data for charts (monthly and weekly aggregations)
     */
    async getRevenueChartData() {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('total, created_at, status')
                .neq('status', 'cancelled')
                .order('created_at', { ascending: true });

            if (error || !orders) {
                console.error('Error fetching orders for chart:', error);
                return { monthly: [], weekly: [] };
            }

            // Monthly aggregation (last 12 months)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyMap = new Map<string, number>();
            months.forEach(m => monthlyMap.set(m, 0));

            // Weekly aggregation (last 7 days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyMap = new Map<string, number>();
            days.forEach(d => weeklyMap.set(d, 0));

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            orders.forEach((order) => {
                const date = new Date(order.created_at);
                const total = order.total || 0;

                // Monthly
                const month = months[date.getMonth()];
                monthlyMap.set(month, (monthlyMap.get(month) || 0) + total);

                // Weekly (last 7 days only)
                if (date >= sevenDaysAgo) {
                    const dayName = days[date.getDay()];
                    weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + total);
                }
            });

            // Convert to array format for Recharts
            const monthlyData = months.map(name => ({
                name,
                value: monthlyMap.get(name) || 0
            }));

            // Reorder weekly to start from Monday
            const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weeklyData = weekOrder.map(name => ({
                name,
                value: weeklyMap.get(name) || 0
            }));

            return { monthly: monthlyData, weekly: weeklyData };
        } catch (error) {
            console.error('Error fetching revenue chart data:', error);
            return { monthly: [], weekly: [] };
        }
    },

    async listSupportTickets(params: { status?: string } = {}) {
        try {
            let query = supabase
                .from('support_tickets')
                .select(`
                    *,
                    seller:sellers(id, store_name, slug)
                `)
                .order('updated_at', { ascending: false });

            if (params.status) {
                query = query.eq('status', params.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { success: true, tickets: data };
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return { success: false, error: 'Failed to fetch tickets' };
        }
    },

    async getTicketMessages(ticketId: string) {
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, messages: data };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: 'Failed to fetch messages' };
        }
    },

    async replyToTicket(ticketId: string, content: string, attachment?: { url: string; name: string; type: string }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // 1. Insert Message with optional attachment
            const messageData: Record<string, unknown> = {
                ticket_id: ticketId,
                sender_id: user.id,
                sender_role: 'admin',
                content
            };

            if (attachment) {
                messageData.attachment_url = attachment.url;
                messageData.attachment_name = attachment.name;
                messageData.attachment_type = attachment.type;
            }

            const { error: msgError } = await supabase
                .from('support_messages')
                .insert(messageData);

            if (msgError) throw msgError;

            // 2. Update Ticket Status/Timestamp
            await supabase
                .from('support_tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            return { success: true };
        } catch (error) {
            console.error('Error replying to ticket:', error);
            return { success: false, error: 'Failed to send reply' };
        }
    },

    /**
     * Update ticket status (e.g., close a ticket)
     */
    async updateTicketStatus(ticketId: string, status: 'open' | 'closed') {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticketId);

            if (error) throw error;

            // Also log to audit logs
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    actor_id: user.id,
                    action: 'ticket_status_updated',
                    target_type: 'ticket',
                    target_id: ticketId,
                    metadata: { status }
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating ticket status:', error);
            return { success: false, error: 'Failed to update ticket status' };
        }
    },

    /**
     * Get unread notifications for admin
     */
    async getNotifications(limit = 20) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },

    /**
     * Mark a notification as read
     */
    async markNotificationAsRead(id: string) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking notification read:', error);
            return false;
        }
    },

    /**
     * Mark all notifications as read
     */
    async markAllNotificationsRead() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .eq('is_read', false);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking all notifications read:', error);
            return false;
        }
    },

    /**
     * Get count of unread support messages from sellers
     */
    async getUnreadSupportCount() {
        try {
            // Count messages where sender_role is 'seller' and is_read is false
            const { count, error } = await supabase
                .from('support_messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_role', 'seller')
                .eq('is_read', false);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error fetching unread support count:', error);
            return 0;
        }
    },

    /**
     * Mark messages in a ticket as read
     */
    async markTicketMessagesAsRead(ticketId: string) {
        try {
            const { error } = await supabase
                .from('support_messages')
                .update({ is_read: true })
                .eq('ticket_id', ticketId)
                .eq('sender_role', 'seller')
                .eq('is_read', false);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking ticket messages read:', error);
            return false;
        }
    },

    /**
     * Creates a new seller store via Edge Function.
     * This is the single source of truth for store creation.
     */
    async createSeller(details: { store_name: string; slug: string; client_request_id?: string; utm?: Record<string, unknown> }) {
        const { data, error } = await secureInvoke('create-seller', {
            body: details
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return {
            ...data.data,
            created: data.created
        };
    },

    // ===================================================================
    // Financial Monitoring & Safety
    // ===================================================================

    /**
     * Get unacknowledged system alerts (invariant mismatches, outbox failures, etc.)
     */
    async getSystemAlerts(limit = 20) {
        try {
            const { data, error } = await supabase
                .from('system_alerts')
                .select('*')
                .eq('acknowledged', false)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching system alerts:', error);
            return [];
        }
    },

    /**
     * Acknowledge a system alert
     */
    async acknowledgeAlert(alertId: string) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('system_alerts')
                .update({
                    acknowledged: true,
                    acknowledged_by: user?.id,
                    acknowledged_at: new Date().toISOString()
                })
                .eq('id', alertId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            return false;
        }
    },

    /**
     * Get latest reconciliation run status and discrepancies
     */
    async getReconciliationStatus() {
        try {
            const { data: latestRun, error } = await supabase
                .from('reconciliation_runs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            let discrepancies: unknown[] = [];
            if (latestRun) {
                const { data: discs } = await supabase
                    .from('reconciliation_discrepancies')
                    .select('*')
                    .eq('run_id', latestRun.id)
                    .eq('status', 'open')
                    .order('discrepancy_amount', { ascending: false });
                discrepancies = discs || [];
            }

            return {
                latestRun: latestRun || null,
                openDiscrepancies: discrepancies,
                isHealthy: latestRun ? latestRun.discrepancy_count === 0 : true
            };
        } catch (error) {
            console.error('Error fetching reconciliation status:', error);
            return { latestRun: null, openDiscrepancies: [], isHealthy: true };
        }
    },

    /**
     * Get latest financial invariant snapshot
     */
    async getFinancialInvariantStatus() {
        try {
            const { data, error } = await supabase
                .from('invariant_snapshots')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error fetching invariant status:', error);
            return null;
        }
    },

    /**
     * Get seller risk overview (aggregated stats for admin)
     */
    async getSellerRiskOverview() {
        try {
            const { data, error } = await supabase
                .from('seller_risk_scores')
                .select('risk_level, payouts_frozen, requires_manual_review');

            if (error) throw error;

            const scores = data || [];
            return {
                total: scores.length,
                normal: scores.filter(s => s.risk_level === 'normal').length,
                elevated: scores.filter(s => s.risk_level === 'elevated').length,
                high: scores.filter(s => s.risk_level === 'high').length,
                critical: scores.filter(s => s.risk_level === 'critical').length,
                frozenPayouts: scores.filter(s => s.payouts_frozen).length,
                pendingReview: scores.filter(s => s.requires_manual_review).length
            };
        } catch (error) {
            console.error('Error fetching risk overview:', error);
            return { total: 0, normal: 0, elevated: 0, high: 0, critical: 0, frozenPayouts: 0, pendingReview: 0 };
        }
    },

    /**
     * Get outbox job status overview
     */
    async getOutboxStatus() {
        try {
            const { data, error } = await supabase
                .from('outbox_jobs')
                .select('status, job_type');

            if (error) throw error;

            const jobs = data || [];
            return {
                total: jobs.length,
                pending: jobs.filter(j => j.status === 'pending').length,
                processing: jobs.filter(j => j.status === 'processing').length,
                completed: jobs.filter(j => j.status === 'completed').length,
                failed: jobs.filter(j => j.status === 'failed').length,
                blockedKyc: jobs.filter(j => j.status === 'blocked_kyc').length
            };
        } catch (error) {
            console.error('Error fetching outbox status:', error);
            return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, blockedKyc: 0 };
        }
    },

    // ===================================================================
    // Option C: Dispute Management & Payout Gating
    // ===================================================================

    /**
     * Get system-wide configuration (e.g., payouts_enabled)
     */
    async getSystemConfig() {
        const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .eq('key', 'payouts_enabled')
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        
        // Return a flattened object for compatibility with components
        return {
            ...data,
            payouts_enabled: data?.value === true || data?.value === 'true'
        };
    },

    /**
     * Update global payout safety toggle
     */
    async updateGlobalPayoutToggle(enabled: boolean) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('system_config')
            .update({ 
                value: enabled,
                updated_at: new Date().toISOString()
            })
            .eq('key', 'payouts_enabled');

        if (error) throw error;

        // Log the action
        if (user) {
            await supabase.from('admin_audit_logs').insert({
                admin_id: user.id,
                action: enabled ? 'global_payout_enable' : 'global_payout_disable',
                target_type: 'system',
                reason: `Global payout toggle set to ${enabled}`
            });
        }
        return true;
    },

    /**
     * List disputes for the admin dashboard
     */
    async getDisputes(params: { status?: string; limit?: number } = {}) {
        let query = supabase
            .from('disputes')
            .select('*, sellers(store_name)')
            .order('created_at', { ascending: false });

        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }

        if (params.limit) {
            query = query.limit(params.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Analyze a dispute using AI
     */
    async analyzeDispute(disputeId: string) {
        const { data, error } = await secureInvoke('analyze-dispute', {
            body: { dispute_id: disputeId }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return data;
    },

    /**
     * Update a dispute's status or notes
     */
    async updateDispute(disputeId: string, updates: { status?: string; admin_notes?: string }) {
        const { error } = await supabase
            .from('disputes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', disputeId);
        if (error) throw error;
        return true;
    },

    /**
     * Update a seller's payout status (Manual Hold/Release)
     */
    async updateSellerPayoutStatus(sellerId: string, status: 'active' | 'held_manual', reason: string) {
        const { data, error } = await supabase.rpc('admin_update_payout_status', {
            p_seller_id: sellerId,
            p_new_status: status,
            p_reason: reason
        });
        if (error) throw error;
        return data;
    },

    /**
     * Get high-risk sellers (those with held payouts or high risk scores)
     */
    async getHighRiskSellers() {
        // Query through sellers hub to get all related data in one go
        const { data, error } = await supabase
            .from('sellers')
            .select('*, seller_security_settings!inner(*), seller_risk_scores(*)')
            .neq('seller_security_settings.payout_status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Map the hub result back to the flat format expected by HighRiskSeller interface
        return (data || []).map(seller => ({
            ...seller.seller_security_settings,
            id: seller.id, // Use seller.id as the primary identifier
            seller_id: seller.id,
            sellers: {
                store_name: seller.store_name,
                slug: seller.slug
            },
            seller_risk_scores: seller.seller_risk_scores
        }));
    },

    /**
     * Get admin specific audit logs (for sensitive actions)
     */
    async getAdminAuditLogs(limit = 100) {
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    }
};
