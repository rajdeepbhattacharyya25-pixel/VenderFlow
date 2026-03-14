
export class RazorpayService {
    private keyId: string;
    private keySecret: string;

    constructor(keyId: string, keySecret: string) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    private get authHeader() {
        return `Basic ${btoa(`${this.keyId}:${this.keySecret}`)}`;
    }

    // -----------------------------------------------------------------------
    // Existing: Subscription Management
    // -----------------------------------------------------------------------
    async createSubscription(planId: string, customerId?: string, trialDays: number = 7) {
        const startAt = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

        const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
            method: "POST",
            headers: {
                "Authorization": this.authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                plan_id: planId,
                customer_id: customerId,
                total_count: 12,
                quantity: 1,
                start_at: startAt,
                expire_by: startAt + (365 * 24 * 60 * 60),
                addons: [],
                notes: { type: "subscription_upgrade" }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.description || "Failed to create subscription");
        }

        return await response.json();
    }

    // -----------------------------------------------------------------------
    // Existing: Order Management
    // -----------------------------------------------------------------------
    async createOrder(amount: number, currency: string = "INR", receipt?: string) {
        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": this.authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: amount * 100,
                currency,
                receipt,
                notes: { type: "addon_purchase" }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.description || "Failed to create order");
        }

        return await response.json();
    }

    // -----------------------------------------------------------------------
    // Existing: Webhook Verification
    // -----------------------------------------------------------------------
    async verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return expectedSignature === signature;
    }

    // -----------------------------------------------------------------------
    // Existing: Transfer & Reversal
    // -----------------------------------------------------------------------
    async createTransfer(paymentId: string, accountId: string, amount: number, notes?: Record<string, string>) {
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
            method: "POST",
            headers: {
                "Authorization": this.authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                transfers: [{ account: accountId, amount, currency: "INR", notes }]
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to create transfer");
        }

        return await response.json();
    }

    async reverseTransfer(transferId: string, amount: number) {
        const response = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}/reversals`, {
            method: "POST",
            headers: {
                "Authorization": this.authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to reverse transfer");
        }

        return await response.json();
    }

    // -----------------------------------------------------------------------
    // NEW: Reconciliation APIs
    // -----------------------------------------------------------------------

    /**
     * Fetch payments from Razorpay within a time range
     * GET /v1/payments?from=<from>&to=<to>&count=100
     */
    async fetchPayments(fromTimestamp: number, toTimestamp: number, skip: number = 0, count: number = 100): Promise<any> {
        const url = `https://api.razorpay.com/v1/payments?from=${fromTimestamp}&to=${toTimestamp}&skip=${skip}&count=${count}`;
        const response = await fetch(url, {
            headers: { "Authorization": this.authHeader },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to fetch payments");
        }

        return await response.json();
    }

    /**
     * Fetch all payments (paginated) within a time range
     */
    async fetchAllPayments(fromTimestamp: number, toTimestamp: number): Promise<any[]> {
        const allPayments: any[] = [];
        let skip = 0;
        const count = 100;

        while (true) {
            const result = await this.fetchPayments(fromTimestamp, toTimestamp, skip, count);
            const items = result.items || [];
            allPayments.push(...items);

            if (items.length < count) break;
            skip += count;

            // Safety limit
            if (skip > 10000) break;
        }

        return allPayments;
    }

    /**
     * Fetch transfers from Razorpay
     * GET /v1/transfers?from=<from>&to=<to>
     */
    async fetchTransfers(fromTimestamp: number, toTimestamp: number, skip: number = 0, count: number = 100): Promise<any> {
        const url = `https://api.razorpay.com/v1/transfers?from=${fromTimestamp}&to=${toTimestamp}&skip=${skip}&count=${count}`;
        const response = await fetch(url, {
            headers: { "Authorization": this.authHeader },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to fetch transfers");
        }

        return await response.json();
    }

    /**
     * Fetch settlements from Razorpay
     * GET /v1/settlements?from=<from>&to=<to>
     */
    async fetchSettlements(fromTimestamp: number, toTimestamp: number, skip: number = 0, count: number = 100): Promise<any> {
        const url = `https://api.razorpay.com/v1/settlements?from=${fromTimestamp}&to=${toTimestamp}&skip=${skip}&count=${count}`;
        const response = await fetch(url, {
            headers: { "Authorization": this.authHeader },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to fetch settlements");
        }

        return await response.json();
    }

    /**
     * Fetch a single payment by ID for verification
     * GET /v1/payments/:id
     */
    async fetchPayment(paymentId: string): Promise<any> {
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": this.authHeader },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to fetch payment");
        }

        return await response.json();
    }

    /**
     * Create a Razorpay Route Linked Account
     * POST /v1/accounts
     */
    async createLinkedAccount(data: {
        email: string;
        name: string;
        type: 'route';
        tnc_accepted: boolean;
        business_type?: string;
    }): Promise<any> {
        const response = await fetch("https://api.razorpay.com/v1/accounts", {
            method: "POST",
            headers: {
                "Authorization": this.authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: data.email,
                name: data.name,
                type: data.type,
                reference_id: `seller_${crypto.randomUUID()}`,
                legal_business_name: data.name,
                contact_name: data.name,
                tnc_accepted: data.tnc_accepted,
                business_type: data.business_type || "individual"
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || "Failed to create linked account");
        }

        return await response.json();
    }
}
