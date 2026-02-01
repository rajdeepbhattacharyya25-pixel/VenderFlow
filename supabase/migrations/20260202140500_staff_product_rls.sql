-- Allow staff to view products of their store
-- We need to check if the current user is in 'store_staff' for the product's seller_id.
create policy "Staff can view store products" on public.products for
select to authenticated using (
        exists (
            select 1
            from public.store_staff
            where user_id = auth.uid()
                and store_id = products.seller_id
        )
    );
-- Allow staff to update products (Manager role only? For MVP, all staff)
create policy "Staff can update store products" on public.products for
update to authenticated using (
        exists (
            select 1
            from public.store_staff
            where user_id = auth.uid()
                and store_id = products.seller_id
        )
    ) with check (
        exists (
            select 1
            from public.store_staff
            where user_id = auth.uid()
                and store_id = products.seller_id
        )
    );