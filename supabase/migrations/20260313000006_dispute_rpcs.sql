-- Migration: Dispute RPCs and Auto-Gating Logic
-- Description: Implements the financial logic for moving funds to holding and auto-gating sellers.

-- 1. RPC to handle dispute ingestion (Holding Account Strategy)
create or replace function public.handle_dispute_ingestion(
    p_seller_id uuid,
    p_external_dispute_id text,
    p_amount decimal,
    p_reason text,
    p_order_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_dispute_id uuid;
    v_entry_id uuid;
begin
    -- 1. Create the dispute record
    insert into public.disputes (
        seller_id, 
        order_id, 
        external_dispute_id, 
        amount, 
        reason, 
        status
    )
    values (
        p_seller_id, 
        p_order_id, 
        p_external_dispute_id, 
        p_amount, 
        p_reason, 
        'open'
    )
    returning id into v_dispute_id;

    -- 2. Move funds to dispute_holding ledger account
    -- Debit: seller_payable (Takes money away from seller)
    -- Credit: dispute_holding (Platform holds the liability/reserve)
    select public.create_ledger_entry(
        p_reference := 'Dispute: ' || p_external_dispute_id,
        p_metadata := jsonb_build_object(
            'dispute_id', v_dispute_id,
            'external_id', p_external_dispute_id
        ),
        p_lines := array[
            jsonb_build_object('account_code', 'seller_payable:' || p_seller_id, 'debit', p_amount, 'credit', 0),
            jsonb_build_object('account_code', 'dispute_holding', 'debit', 0, 'credit', p_amount)
        ]
    ) into v_entry_id;

    -- 3. Trigger auto-gate evaluation
    perform public.evaluate_auto_gate_rules(p_seller_id);

    -- 4. Create a system alert
    perform public.create_system_alert(
        p_alert_type := 'dispute_open',
        p_severity := 'warning',
        p_title := 'New Dispute: ' || p_external_dispute_id,
        p_message := 'Seller ' || p_seller_id || ' has a new dispute for ₹' || p_amount,
        p_metadata := jsonb_build_object('dispute_id', v_dispute_id)
    );

    return v_dispute_id;
end;
$$;

-- 2. RPC to evaluate auto-gate rules
create or replace function public.evaluate_auto_gate_rules(p_seller_id uuid)
returns text
language plpgsql
security definer
as $$
declare
    v_risk_score int;
    v_active_disputes int;
    v_refund_rate decimal;
    v_hold_reasons text[] := array[]::text[];
    v_new_status text := 'active';
begin
    -- Fetch metrics
    select score into v_risk_score from public.seller_risk_scores where seller_id = p_seller_id;
    select count(*) into v_active_disputes from public.disputes where seller_id = p_seller_id and status in ('open', 'under_review');
    
    -- Estimate refund rate (last 30 days)
    select coalesce(
        (select count(*) from public.orders where seller_id = p_seller_id and status = 'refunded' and created_at > now() - interval '30 days')::decimal / 
        nullif((select count(*) from public.orders where seller_id = p_seller_id and created_at > now() - interval '30 days'), 0), 
        0
    ) into v_refund_rate;

    -- Check rules
    if v_risk_score >= 80 then
        v_hold_reasons := array_append(v_hold_reasons, 'High risk score (' || v_risk_score || ')');
    end if;

    if v_active_disputes >= 3 then
        v_hold_reasons := array_append(v_hold_reasons, 'Too many active disputes (' || v_active_disputes || ')');
    end if;

    if v_refund_rate > 0.12 then
        v_hold_reasons := array_append(v_hold_reasons, 'High refund rate (' || round(v_refund_rate * 100, 2) || '%)');
    end if;

    -- Update status if reasons exist
    if array_length(v_hold_reasons, 1) > 0 then
        v_new_status := 'held_auto';
        
        update public.seller_security_settings
        set payout_status = v_new_status,
            auto_hold_reasons = v_hold_reasons,
            updated_at = now()
        where seller_id = p_seller_id;

        -- Log audit if status changed
        insert into public.admin_audit_logs (action_type, target_type, target_id, reason_note, metadata)
        values (
            'auto_hold', 
            'seller', 
            p_seller_id::text, 
            'Auto-hold triggered by risk rules: ' || array_to_string(v_hold_reasons, ', '),
            jsonb_build_object('score', v_risk_score, 'disputes', v_active_disputes, 'refund_rate', v_refund_rate)
        );

        -- Alert
        perform public.create_system_alert(
            p_alert_type := 'seller_auto_hold',
            p_severity := 'critical',
            p_title := 'Seller Payout Auto-Held',
            p_message := 'Seller ' || p_seller_id || ' gated automatically.',
            p_metadata := jsonb_build_object('reasons', v_hold_reasons)
        );
    end if;

    return v_new_status;
end;
$$;

-- 3. RPC for Manual Payout Status Update (with Audit)
create or replace function public.admin_update_payout_status(
    p_admin_id uuid,
    p_seller_id uuid,
    p_new_status text,
    p_reason_note text
)
returns boolean
language plpgsql
security definer
as $$
begin
    -- Update settings
    update public.seller_security_settings
    set payout_status = p_new_status,
        updated_at = now()
    where seller_id = p_seller_id;

    -- Log audit
    insert into public.admin_audit_logs (admin_id, action_type, target_type, target_id, reason_note)
    values (p_admin_id, 'manual_payout_update', 'seller', p_seller_id::text, p_reason_note);

    return true;
end;
$$;

-- 4. Check Payout Eligibility (used by Outbox worker)
create or replace function public.check_payout_eligibility(p_seller_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
    v_global_enabled boolean;
    v_seller_status text;
begin
    -- Check global kill-switch
    select (value->>'payouts_enabled')::boolean into v_global_enabled 
    from public.system_config where key = 'payouts_enabled';
    
    if not v_global_enabled then
        return false;
    end if;

    -- Check seller status
    select payout_status into v_seller_status 
    from public.seller_security_settings where seller_id = p_seller_id;

    return v_seller_status = 'active';
end;
$$;
