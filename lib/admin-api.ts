import { supabase } from './supabase';

// Base URL for Edge Functions (update this when deploying)
const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

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

/**
 * Get the current user's auth token for API calls
 */
async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Invite a new seller to the platform
 */
export async function inviteSeller(data: InviteSellerData): Promise<ApiResponse<{ sellerId: string }>> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${EDGE_FUNCTIONS_URL}/invite-seller`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to invite seller' };
        }

        return { success: true, data: result };
    } catch (error) {
        console.error('Error inviting seller:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * Change a seller's status (activate/suspend)
 */
export async function changeSellerStatus(data: ChangeSellerStatusData): Promise<ApiResponse<void>> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await fetch(`${EDGE_FUNCTIONS_URL}/seller-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to update seller status' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error changing seller status:', error);
        return { success: false, error: 'Network error' };
    }
}

/**
 * List sellers with pagination and filters
 */
export async function listSellers(params: ListSellersParams = {}): Promise<ApiResponse<{ sellers: any[], total: number }>> {
    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const queryParams = new URLSearchParams();
        if (params.page) queryParams.set('page', params.page.toString());
        if (params.limit) queryParams.set('limit', params.limit.toString());
        if (params.search) queryParams.set('search', params.search);
        if (params.status) queryParams.set('status', params.status);
        if (params.plan) queryParams.set('plan', params.plan);

        const response = await fetch(`${EDGE_FUNCTIONS_URL}/list-sellers?${queryParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to list sellers' };
        }

        return { success: true, data: result };
    } catch (error) {
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
    async listSellers(params: ListSellersParams = {}) {
        const { page = 1, limit = 25, search, status, plan } = params;

        try {
            // Use RPC to fetch sellers with pre-calculated stats (bypassing RLS)
            const { data, error } = await supabase.rpc('get_sellers_with_stats', {
                page,
                limit_val: limit,
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

            // Map RPC result to expected format
            // RPC no longer returns profiles data (full_name, avatar_url) due to schema mismatch
            const sellersWithStats = (data || []).map((row: any) => ({
                id: row.id,
                store_name: row.store_name,
                slug: row.slug,
                plan: row.plan,
                status: row.status,
                is_active: row.is_active,
                created_at: row.created_at,
                profiles: {
                    full_name: null, // Not available in RPC
                    avatar_url: null // Not available in RPC
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
    async updateSellerStatus(sellerId: string, status: 'active' | 'suspended') {
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
     * Get real-time admin statistics for dashboard
     */
    async getAdminStats() {
        try {
            // 1. Total Sellers Count
            const { count: sellerCount, error: sellerError } = await supabase
                .from('sellers')
                .select('*', { count: 'exact', head: true });

            // 2. Live Revenue (sum of all non-cancelled orders)
            const { data: revenueData, error: revenueError } = await supabase
                .from('orders')
                .select('total')
                .neq('status', 'cancelled');

            const totalRevenue = revenueData?.reduce((acc, order) => acc + (order.total || 0), 0) || 0;

            // 3. Active Orders (pending + processing)
            const { count: activeOrders, error: ordersError } = await supabase
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
            const sellerChange = priorSellers && priorSellers > 0
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
            // - Pro tier: 8GB storage (use 8GB as reference)
            const STORAGE_LIMIT_MB = 8 * 1024; // 8GB in MB
            const productStorageMB = ((productCount || 0) * 5) / 1024; // 5KB per product
            const imageStorageMB = ((imageCount || 0) * 500) / 1024; // 500KB per image
            const estimatedStorageMB = productStorageMB + imageStorageMB;
            const storagePercentage = Math.min((estimatedStorageMB / STORAGE_LIMIT_MB) * 100, 100);

            // 6. HEALTH STATUS based on thresholds
            // Factors: Storage usage, pending orders, seller count
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
                if (dbMetrics && (dbMetrics as any).database_size) {
                    databaseSize = (dbMetrics as any).database_size;
                }
            } catch (rpcError) {
                console.error("Failed to fetch DB metrics:", rpcError);
            }

            return {
                totalSellers: sellerCount || 0,
                sellerChange: sellerChange,
                liveRevenue: totalRevenue,
                revenueChange: 8, // Mock for now - would need historical comparison
                activeOrders: activeOrders || 0,
                ordersChange: -3, // Mock for now
                sysHealth: sysHealth,
                healthStatus: healthStatus,
                // Additional metrics for detailed view
                productCount: productCount || 0,
                imageCount: imageCount || 0,
                estimatedStorageMB: Math.round(estimatedStorageMB * 10) / 10,
                storagePercentage: Math.round(storagePercentage * 10) / 10,
                healthIssues: healthIssues,
                databaseSize: databaseSize
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
                databaseSize: 'Unknown'
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
                const actorName = (log.profiles as any)?.full_name || 'System';
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
                        detail = `processed a ₹${(log.metadata as any)?.total || 0} order`;
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

            const STORAGE_LIMIT_MB = 8 * 1024; // 8GB
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
            const report: { sellers?: any[]; orders?: any[] } = {};

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

            orders.forEach((order: any) => {
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
    }
};
