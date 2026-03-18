export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reason_note: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason_note: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason_note?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          target_id: string | null
          target_type: string | null
          title: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      api_limits_config: {
        Row: {
          alert_threshold_pct: number | null
          last_alert_sent_at: string | null
          monthly_limit: number
          provider: string
        }
        Insert: {
          alert_threshold_pct?: number | null
          last_alert_sent_at?: string | null
          monthly_limit: number
          provider: string
        }
        Update: {
          alert_threshold_pct?: number | null
          last_alert_sent_at?: string | null
          monthly_limit?: number
          provider?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          metadata: Json | null
          provider: string
          status_code: number
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          metadata?: Json | null
          provider: string
          status_code: number
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          metadata?: Json | null
          provider?: string
          status_code?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          created_at: string | null
          error_message: string | null
          filename: string
          id: string
          metadata: Json | null
          size_bytes: number | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          filename: string
          id?: string
          metadata?: Json | null
          size_bytes?: number | null
          status?: string
          type?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          filename?: string
          id?: string
          metadata?: Json | null
          size_bytes?: number | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      cart_recovery_logs: {
        Row: {
          customer_id: string
          id: string
          seller_id: string
          sent_at: string | null
        }
        Insert: {
          customer_id: string
          id?: string
          seller_id: string
          sent_at?: string | null
        }
        Update: {
          customer_id?: string
          id?: string
          seller_id?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string | null
          evidence_url: string | null
          external_dispute_id: string | null
          id: string
          order_id: string | null
          reason: string | null
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          evidence_url?: string | null
          external_dispute_id?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          evidence_url?: string | null
          external_dispute_id?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient: string
          seller_id: string
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient: string
          seller_id: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient?: string
          seller_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      invariant_snapshots: {
        Row: {
          computed_total: number | null
          created_at: string | null
          discrepancy: number | null
          id: string
          is_balanced: boolean | null
          platform_revenue: number | null
          total_cash_in: number | null
          total_reserves: number | null
          total_seller_payable: number | null
        }
        Insert: {
          computed_total?: number | null
          created_at?: string | null
          discrepancy?: number | null
          id?: string
          is_balanced?: boolean | null
          platform_revenue?: number | null
          total_cash_in?: number | null
          total_reserves?: number | null
          total_seller_payable?: number | null
        }
        Update: {
          computed_total?: number | null
          created_at?: string | null
          discrepancy?: number | null
          id?: string
          is_balanced?: boolean | null
          platform_revenue?: number | null
          total_cash_in?: number | null
          total_reserves?: number | null
          total_seller_payable?: number | null
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string
          reference_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id: string
          reference_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string
          reference_type?: string
        }
        Relationships: []
      }
      ledger_entry_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "oracle_liquidity_movements"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          id: string
          items: Json
          metadata: Json | null
          payment_method: string | null
          promotion_id: string | null
          reorder_reminder_sent_at: string | null
          review_request_sent_at: string | null
          seller_id: string | null
          shipping_address: Json | null
          status: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          items?: Json
          metadata?: Json | null
          payment_method?: string | null
          promotion_id?: string | null
          reorder_reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          seller_id?: string | null
          shipping_address?: Json | null
          status?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          items?: Json
          metadata?: Json | null
          payment_method?: string | null
          promotion_id?: string | null
          reorder_reminder_sent_at?: string | null
          review_request_sent_at?: string | null
          seller_id?: string | null
          shipping_address?: Json | null
          status?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          announcement_message: string | null
          commission_rate: number
          created_at: string
          enforce_2fa: boolean | null
          id: string
          maintenance_mode: boolean
          max_login_attempts: number | null
          min_payout_amount: number
          payment_gateway_config: Json | null
          session_timeout_minutes: number | null
          updated_at: string
        }
        Insert: {
          announcement_message?: string | null
          commission_rate?: number
          created_at?: string
          enforce_2fa?: boolean | null
          id?: string
          maintenance_mode?: boolean
          max_login_attempts?: number | null
          min_payout_amount?: number
          payment_gateway_config?: Json | null
          session_timeout_minutes?: number | null
          updated_at?: string
        }
        Update: {
          announcement_message?: string | null
          commission_rate?: number
          created_at?: string
          enforce_2fa?: boolean | null
          id?: string
          maintenance_mode?: boolean
          max_login_attempts?: number | null
          min_payout_amount?: number
          payment_gateway_config?: Json | null
          session_timeout_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      previews: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          metadata: Json | null
          published: boolean
          snapshot: Json
          vendor_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          metadata?: Json | null
          published?: boolean
          snapshot?: Json
          vendor_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          published?: boolean
          snapshot?: Json
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "previews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload_hash: string | null
          processed_at: string | null
          razorpay_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          razorpay_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload_hash?: string | null
          processed_at?: string | null
          razorpay_event_id?: string
        }
        Relationships: []
      }
      product_indexing_queue: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          process_after: string | null
          product_id: string
          retry_count: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          process_after?: string | null
          product_id: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          process_after?: string | null
          product_id?: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_indexing_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          content_hash: string | null
          created_at: string | null
          file_url: string
          id: string
          is_primary: boolean | null
          media_type: string | null
          product_id: string
          sort_order: number | null
          variant_value: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          file_url: string
          id?: string
          is_primary?: boolean | null
          media_type?: string | null
          product_id: string
          sort_order?: number | null
          variant_value?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          file_url?: string
          id?: string
          is_primary?: boolean | null
          media_type?: string | null
          product_id?: string
          sort_order?: number | null
          variant_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          allow_out_of_stock_orders: boolean | null
          low_stock_threshold: number | null
          product_id: string
          stock_quantity: number | null
          track_stock: boolean | null
          updated_at: string | null
        }
        Insert: {
          allow_out_of_stock_orders?: boolean | null
          low_stock_threshold?: number | null
          product_id: string
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allow_out_of_stock_orders?: boolean | null
          low_stock_threshold?: number | null
          product_id?: string
          stock_quantity?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          id: string
          price_override: number | null
          product_id: string
          stock_quantity: number | null
          variant_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_override?: number | null
          product_id: string
          stock_quantity?: number | null
          variant_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price_override?: number | null
          product_id?: string
          stock_quantity?: number | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_embedding: string | null
          created_at: string | null
          description: string | null
          description_embedding: string | null
          discount_price: number | null
          has_variants: boolean | null
          id: string
          indexing_status: string | null
          is_active: boolean | null
          is_published: boolean | null
          last_indexed_at: string | null
          name: string
          price: number
          seller_id: string | null
          status: string | null
          title_embedding: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          category_embedding?: string | null
          created_at?: string | null
          description?: string | null
          description_embedding?: string | null
          discount_price?: number | null
          has_variants?: boolean | null
          id?: string
          indexing_status?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          last_indexed_at?: string | null
          name: string
          price: number
          seller_id?: string | null
          status?: string | null
          title_embedding?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          category_embedding?: string | null
          created_at?: string | null
          description?: string | null
          description_embedding?: string | null
          discount_price?: number | null
          has_variants?: boolean | null
          id?: string
          indexing_status?: string | null
          is_active?: boolean | null
          is_published?: boolean | null
          last_indexed_at?: string | null
          name?: string
          price?: number
          seller_id?: string | null
          status?: string | null
          title_embedding?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          telegram_id: number | null
          telegram_photo_url: string | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          telegram_id?: number | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          telegram_id?: number | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_usages: {
        Row: {
          customer_email: string
          id: string
          order_id: string
          promotion_id: string
          used_at: string
        }
        Insert: {
          customer_email: string
          id?: string
          order_id: string
          promotion_id: string
          used_at?: string
        }
        Update: {
          customer_email?: string
          id?: string
          order_id?: string
          promotion_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usages_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          seller_id: string
          type: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          seller_id: string
          type: string
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          seller_id?: string
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reconciliation_discrepancies: {
        Row: {
          created_at: string | null
          discrepancy_amount: number | null
          external_id: string
          external_type: string
          id: string
          ledger_amount: number | null
          razorpay_amount: number | null
          resolution_notes: string | null
          resolved_at: string | null
          run_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          discrepancy_amount?: number | null
          external_id: string
          external_type: string
          id?: string
          ledger_amount?: number | null
          razorpay_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          run_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          discrepancy_amount?: number | null
          external_id?: string
          external_type?: string
          id?: string
          ledger_amount?: number | null
          razorpay_amount?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          run_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_discrepancies_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          auto_paused_payouts: boolean | null
          completed_at: string | null
          created_at: string | null
          discrepancy_count: number | null
          discrepancy_total: number | null
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          run_date: string
          status: string | null
          total_ledger: number | null
          total_razorpay: number | null
        }
        Insert: {
          auto_paused_payouts?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          discrepancy_count?: number | null
          discrepancy_total?: number | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          run_date: string
          status?: string | null
          total_ledger?: number | null
          total_razorpay?: number | null
        }
        Update: {
          auto_paused_payouts?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          discrepancy_count?: number | null
          discrepancy_total?: number | null
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          run_date?: string
          status?: string | null
          total_ledger?: number | null
          total_razorpay?: number | null
        }
        Relationships: []
      }
      reserve_releases: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          release_at: string
          seller_id: string | null
          status: string | null
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          release_at: string
          seller_id?: string | null
          status?: string | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          release_at?: string
          seller_id?: string | null
          status?: string | null
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserve_releases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "reserve_releases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "reserve_releases_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserve_releases_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "seller_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_actions_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          new_value: string | null
          previous_value: string | null
          reason: string | null
          seller_id: string | null
          triggered_by: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
          seller_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          previous_value?: string | null
          reason?: string | null
          seller_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_actions_log_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "risk_actions_log_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "risk_actions_log_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      runbooks: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          escalation_rules: Json | null
          id: string
          last_updated_by: string | null
          steps: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          last_updated_by?: string | null
          steps?: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          escalation_rules?: Json | null
          id?: string
          last_updated_by?: string | null
          steps?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seller_applications: {
        Row: {
          business_name: string
          category: string
          city: string
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          is_selling_online: boolean | null
          linked_seller_id: string | null
          message: string | null
          monthly_sales_range: string | null
          name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          business_name: string
          category: string
          city: string
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          is_selling_online?: boolean | null
          linked_seller_id?: string | null
          message?: string | null
          monthly_sales_range?: string | null
          name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string
          category?: string
          city?: string
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
          is_selling_online?: boolean | null
          linked_seller_id?: string | null
          message?: string | null
          monthly_sales_range?: string | null
          name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_applications_linked_seller_id_fkey"
            columns: ["linked_seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_applications_linked_seller_id_fkey"
            columns: ["linked_seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_applications_linked_seller_id_fkey"
            columns: ["linked_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          plan: string
          slug: string
          status: string | null
          store_name: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          plan: string
          slug: string
          status?: string | null
          store_name: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          plan?: string
          slug?: string
          status?: string | null
          store_name?: string
          token?: string | null
        }
        Relationships: []
      }
      seller_requests: {
        Row: {
          client_request_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          seller_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          client_request_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seller_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          client_request_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          seller_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_risk_scores: {
        Row: {
          created_at: string | null
          id: string
          last_calculated_at: string | null
          payouts_frozen: boolean | null
          requires_manual_review: boolean | null
          reserve_override_percent: number | null
          risk_factors: Json | null
          risk_level: string | null
          risk_score: number | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          payouts_frozen?: boolean | null
          requires_manual_review?: boolean | null
          reserve_override_percent?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          payouts_frozen?: boolean | null
          requires_manual_review?: boolean | null
          reserve_override_percent?: number | null
          risk_factors?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_risk_scores_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_risk_scores_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_risk_scores_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_security_settings: {
        Row: {
          auto_hold_reasons: string[] | null
          payout_status: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          auto_hold_reasons?: string[] | null
          payout_status?: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          auto_hold_reasons?: string[] | null
          payout_status?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_security_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_security_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_security_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_telegram_configs: {
        Row: {
          bot_id: number | null
          bot_token: string
          bot_username: string | null
          chat_id: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          preferences: Json | null
          seller_id: string
          updated_at: string | null
          webhook_secret: string
        }
        Insert: {
          bot_id?: number | null
          bot_token: string
          bot_username?: string | null
          chat_id?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preferences?: Json | null
          seller_id: string
          updated_at?: string | null
          webhook_secret?: string
        }
        Update: {
          bot_id?: number | null
          bot_token?: string
          bot_username?: string | null
          chat_id?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          preferences?: Json | null
          seller_id?: string
          updated_at?: string | null
          webhook_secret?: string
        }
        Relationships: []
      }
      seller_transfers: {
        Row: {
          amount: number
          commission_amount: number
          created_at: string | null
          id: string
          order_id: string | null
          razorpay_transfer_id: string | null
          seller_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          commission_amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          razorpay_transfer_id?: string | null
          seller_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          commission_amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          razorpay_transfer_id?: string | null
          seller_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_transfers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_wallets: {
        Row: {
          available_balance: number
          currency: string
          last_synced_at: string | null
          negative_balance: number
          reserve_balance: number
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          available_balance?: number
          currency?: string
          last_synced_at?: string | null
          negative_balance?: number
          reserve_balance?: number
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          available_balance?: number
          currency?: string
          last_synced_at?: string | null
          negative_balance?: number
          reserve_balance?: number
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          commission_percent: number | null
          created_at: string
          email_quota_remaining: number | null
          id: string
          image_storage_bytes_used: number | null
          is_active: boolean | null
          kyc_data: Json | null
          kyc_status: Database["public"]["Enums"]["kyc_status_type"] | null
          payout_status: string | null
          plan: string | null
          plan_ends_at: string | null
          plan_started_at: string | null
          product_count: number | null
          razorpay_account_id: string | null
          slug: string
          status: string | null
          store_name: string
          telegram_bot_token_encrypted: string | null
          telegram_chat_id: string | null
          telegram_message_quota_remaining: number | null
          telegram_notification_pref: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          email_quota_remaining?: number | null
          id: string
          image_storage_bytes_used?: number | null
          is_active?: boolean | null
          kyc_data?: Json | null
          kyc_status?: Database["public"]["Enums"]["kyc_status_type"] | null
          payout_status?: string | null
          plan?: string | null
          plan_ends_at?: string | null
          plan_started_at?: string | null
          product_count?: number | null
          razorpay_account_id?: string | null
          slug: string
          status?: string | null
          store_name: string
          telegram_bot_token_encrypted?: string | null
          telegram_chat_id?: string | null
          telegram_message_quota_remaining?: number | null
          telegram_notification_pref?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          email_quota_remaining?: number | null
          id?: string
          image_storage_bytes_used?: number | null
          is_active?: boolean | null
          kyc_data?: Json | null
          kyc_status?: Database["public"]["Enums"]["kyc_status_type"] | null
          payout_status?: string | null
          plan?: string | null
          plan_ends_at?: string | null
          plan_started_at?: string | null
          product_count?: number | null
          razorpay_account_id?: string | null
          slug?: string
          status?: string | null
          store_name?: string
          telegram_bot_token_encrypted?: string | null
          telegram_chat_id?: string | null
          telegram_message_quota_remaining?: number | null
          telegram_notification_pref?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      store_addresses: {
        Row: {
          building: string | null
          city: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          phone: string | null
          seller_id: string
          state: string
          street: string
          type: string
          updated_at: string
          zip: string
        }
        Insert: {
          building?: string | null
          city: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          seller_id: string
          state: string
          street: string
          type?: string
          updated_at?: string
          zip: string
        }
        Update: {
          building?: string | null
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          seller_id?: string
          state?: string
          street?: string
          type?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_addresses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_addresses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_addresses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cards: {
        Row: {
          created_at: string
          customer_id: string
          expiry: string
          id: string
          is_default: boolean | null
          last4: string
          seller_id: string
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expiry: string
          id?: string
          is_default?: boolean | null
          last4: string
          seller_id: string
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expiry?: string
          id?: string
          is_default?: boolean | null
          last4?: string
          seller_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cards_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_cards_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_cards_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_cart_items: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
          quantity: number
          seller_id: string
          size: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          quantity?: number
          seller_id: string
          size?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          quantity?: number
          seller_id?: string
          size?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_customers: {
        Row: {
          alt_phone: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          dob: string | null
          email: string
          email_verified: boolean | null
          gender: string | null
          id: string
          last_login_at: string | null
          metadata: Json | null
          password_hash: string | null
          phone: string | null
          seller_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email: string
          email_verified?: boolean | null
          gender?: string | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          password_hash?: string | null
          phone?: string | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          dob?: string | null
          email?: string
          email_verified?: boolean | null
          gender?: string | null
          id?: string
          last_login_at?: string | null
          metadata?: Json | null
          password_hash?: string | null
          phone?: string | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_customers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          referrer: string | null
          seller_id: string
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          referrer?: string | null
          seller_id: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          referrer?: string | null
          seller_id?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_page_views_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_page_views_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_page_views_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          bank_details: string | null
          business_type: string | null
          currency: string | null
          enforce_2fa: boolean | null
          free_shipping_threshold: number | null
          hero: Json | null
          id: number
          invoice_footer: string | null
          logo_url: string | null
          notifications: Json | null
          phone: string | null
          policies: Json | null
          seller_id: string | null
          session_timeout_minutes: number | null
          shipping_fee: number | null
          socials: Json | null
          store_name: string | null
          tax_id: string | null
          tax_percentage: number | null
          theme_config: Json | null
          trust_badges: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          business_type?: string | null
          currency?: string | null
          enforce_2fa?: boolean | null
          free_shipping_threshold?: number | null
          hero?: Json | null
          id?: never
          invoice_footer?: string | null
          logo_url?: string | null
          notifications?: Json | null
          phone?: string | null
          policies?: Json | null
          seller_id?: string | null
          session_timeout_minutes?: number | null
          shipping_fee?: number | null
          socials?: Json | null
          store_name?: string | null
          tax_id?: string | null
          tax_percentage?: number | null
          theme_config?: Json | null
          trust_badges?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          business_type?: string | null
          currency?: string | null
          enforce_2fa?: boolean | null
          free_shipping_threshold?: number | null
          hero?: Json | null
          id?: never
          invoice_footer?: string | null
          logo_url?: string | null
          notifications?: Json | null
          phone?: string | null
          policies?: Json | null
          seller_id?: string | null
          session_timeout_minutes?: number | null
          shipping_fee?: number | null
          socials?: Json | null
          store_name?: string | null
          tax_id?: string | null
          tax_percentage?: number | null
          theme_config?: Json | null
          trust_badges?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_settings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_staff: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          role: string
          status: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          role?: string
          status?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          role?: string
          status?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_staff_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_wishlists: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_wishlists_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_wishlists_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "store_wishlists_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          plan: string
          provider_payment_id: string | null
          seller_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          plan: string
          provider_payment_id?: string | null
          seller_id: string
          status: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          plan?: string
          provider_payment_id?: string | null
          seller_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          seller_id: string
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          seller_id: string
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          seller_id?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "support_tickets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_resolved: boolean | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_resolved?: boolean | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_resolved?: boolean | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      telegram_message_logs: {
        Row: {
          error_message: string | null
          id: string
          message_type: string | null
          seller_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          message_type?: string | null
          seller_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          message_type?: string | null
          seller_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_message_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "telegram_message_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "telegram_message_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_message_queue: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          retry_count: number | null
          seller_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          retry_count?: number | null
          seller_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          retry_count?: number | null
          seller_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_message_queue_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "telegram_message_queue_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "telegram_message_queue_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_quota_events: {
        Row: {
          change_amount: number
          created_at: string | null
          id: string
          quota_type: string
          reason: string | null
          seller_id: string
        }
        Insert: {
          change_amount: number
          created_at?: string | null
          id?: string
          quota_type: string
          reason?: string | null
          seller_id: string
        }
        Update: {
          change_amount?: number
          created_at?: string | null
          id?: string
          quota_type?: string
          reason?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_quota_events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "usage_quota_events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "usage_quota_events_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          last_active: string | null
          location: string | null
          ua_string: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          location?: string | null
          ua_string?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          location?: string | null
          ua_string?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type_enum"]
          phone: string
          provider: Database["public"]["Enums"]["provider_enum"]
          status: Database["public"]["Enums"]["log_status_enum"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_type: Database["public"]["Enums"]["message_type_enum"]
          phone: string
          provider: Database["public"]["Enums"]["provider_enum"]
          status: Database["public"]["Enums"]["log_status_enum"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type_enum"]
          phone?: string
          provider?: Database["public"]["Enums"]["provider_enum"]
          status?: Database["public"]["Enums"]["log_status_enum"]
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      email_logs_summary: {
        Row: {
          count: number | null
          last_activity: string | null
          seller_id: string | null
          status: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "email_logs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      oracle_daily_financial_summary: {
        Row: {
          entry_count: number | null
          reference_type: string | null
          summary_date: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      oracle_liquidity_movements: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          entry_id: string | null
          reference_type: string | null
        }
        Relationships: []
      }
      oracle_payout_gaps: {
        Row: {
          available_balance: number | null
          reserve_balance: number | null
          reserve_ratio_percent: number | null
          seller_name: string | null
          upcoming_reserve_releases: number | null
        }
        Relationships: []
      }
      oracle_projected_cashflow: {
        Row: {
          projected_inflow: number | null
          projection_date: string | null
          release_count: number | null
        }
        Relationships: []
      }
      oracle_risk_anomalies: {
        Row: {
          risk_level: string | null
          risk_score: number | null
          seller_id: string | null
          seller_name: string | null
          total_gmv_7d: number | null
        }
        Relationships: []
      }
      oracle_seller_financial_health: {
        Row: {
          available_balance: number | null
          negative_balance: number | null
          open_disputes_count: number | null
          reserve_balance: number | null
          risk_level: string | null
          risk_score: number | null
          seller_id: string | null
          seller_name: string | null
          upcoming_reserve_releases: number | null
        }
        Relationships: []
      }
      recovery_analytics: {
        Row: {
          conversion_rate: number | null
          conversions: number | null
          recovered_revenue: number | null
          seller_id: string | null
          signals_sent: number | null
        }
        Relationships: []
      }
      seller_daily_revenue_metrics: {
        Row: {
          gross_revenue: number | null
          net_revenue: number | null
          order_date: string | null
          refunded_amount: number | null
          refunded_orders: number | null
          seller_id: string | null
          total_discounts: number | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_product_performance: {
        Row: {
          gross_revenue: number | null
          product_id: string | null
          product_name: string | null
          refund_amount: number | null
          refunded_units: number | null
          seller_id: string | null
          total_units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_risk_anomalies"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "oracle_seller_financial_health"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_update_payout_status: {
        Args: {
          p_admin_id: string
          p_new_status: string
          p_reason_note: string
          p_seller_id: string
        }
        Returns: boolean
      }
      calculate_seller_risk_score: {
        Args: { p_seller_id: string }
        Returns: number
      }
      check_and_mark_webhook_processed: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload_hash?: string
        }
        Returns: boolean
      }
      check_payout_eligibility: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      claim_outbox_job: {
        Args: { p_job_types?: string[] }
        Returns: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          status: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outbox_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_previews: { Args: never; Returns: undefined }
      complete_outbox_job: {
        Args: { p_error?: string; p_job_id: string; p_success: boolean }
        Returns: undefined
      }
      create_ledger_entry: {
        Args: {
          p_description: string
          p_lines: Json
          p_metadata?: Json
          p_reference_id: string
          p_reference_type: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_outbox_job: {
        Args: { p_job_type: string; p_payload: Json; p_status?: string }
        Returns: string
      }
      create_seller_if_not_exists: {
        Args: {
          p_created_by: string
          p_slug: string
          p_store_name: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          plan: string
          slug: string
          status: string
          store_name: string
          updated_at: string
          user_id: string
          was_created: boolean
        }[]
      }
      create_system_alert: {
        Args: {
          p_alert_type: string
          p_message: string
          p_metadata?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      debit_seller_balances: {
        Args: { amount_to_debit: number; seller_id_param: string }
        Returns: undefined
      }
      decrement_seller_quota:
        | {
            Args: {
              amount_param: number
              column_param: string
              seller_id_param: string
            }
            Returns: undefined
          }
        | {
            Args: {
              amount_param: number
              column_param: string
              seller_id_param: string
            }
            Returns: undefined
          }
      evaluate_auto_gate_rules: {
        Args: { p_seller_id: string }
        Returns: string
      }
      get_account_balance: { Args: { p_account_code: string }; Returns: number }
      get_invite_details: { Args: { lookup_token: string }; Returns: Json }
      get_sellers_with_stats: {
        Args: {
          limit_val?: number
          page?: number
          plan_filter?: string
          search_term?: string
          status_filter?: string
        }
        Returns: {
          created_at: string
          id: string
          image_count: number
          is_active: boolean
          order_count: number
          plan: string
          product_count: number
          slug: string
          status: string
          store_name: string
        }[]
      }
      get_system_metrics: { Args: never; Returns: Json }
      handle_dispute_ingestion: {
        Args: {
          p_amount: number
          p_external_dispute_id: string
          p_order_id?: string
          p_reason: string
          p_seller_id: string
        }
        Returns: string
      }
      increment_promotion_uses: {
        Args: { promo_id: string }
        Returns: undefined
      }
      increment_seller_balances: {
        Args: {
          available_inc: number
          reserve_inc: number
          seller_id_param: string
        }
        Returns: undefined
      }
      increment_seller_quota: {
        Args: {
          amount_param: number
          column_param: string
          seller_id_param: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      match_products_v2: {
        Args: {
          category_weight?: number
          description_weight?: number
          match_count: number
          match_threshold: number
          query_embedding: string
          title_weight?: number
        }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
          similarity: number
        }[]
      }
      process_abandoned_carts: { Args: never; Returns: undefined }
      process_reorder_reminders: { Args: never; Returns: undefined }
      process_review_requests: { Args: never; Returns: undefined }
      refresh_seller_wallet_cache: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      release_scheduled_reserves: { Args: never; Returns: Json }
    }
    Enums: {
      kyc_status_type:
        | "none"
        | "submitted"
        | "pending"
        | "approved"
        | "rejected"
      log_status_enum: "sent" | "failed" | "verified"
      message_type_enum:
        | "welcome"
        | "order_created"
        | "shipped"
        | "delivered"
        | "otp"
      provider_enum: "glavier" | "getitsms"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      kyc_status_type: ["none", "submitted", "pending", "approved", "rejected"],
      log_status_enum: ["sent", "failed", "verified"],
      message_type_enum: [
        "welcome",
        "order_created",
        "shipped",
        "delivered",
        "otp",
      ],
      provider_enum: ["glavier", "getitsms"],
    },
  },
} as const
