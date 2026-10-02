-- Storage buckets, Realtime publication for live stock, scheduled jobs, default settings.

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 20971520,
    array['image/avif', 'image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'model/gltf-binary']),
  ('review-media', 'review-media', false, 8388608,
    array['image/avif', 'image/webp', 'image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

-- product-media: public read (bucket is public), staff write.
create policy product_media_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-media' and (select private.is_staff()));
create policy product_media_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'product-media' and (select private.is_staff()));
create policy product_media_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-media' and (select private.is_staff()));

-- review-media: customers upload into their own folder "<uid>/…"; readable by the owner,
-- staff, and anyone once the attached review is published.
create policy review_media_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy review_media_read on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'review-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_staff())
      or exists (
        select 1 from public.review_media rm
        join public.reviews r on r.id = rm.review_id
        where rm.storage_path = name and r.status = 'published'
      )
    )
  );
create policy review_media_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'review-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff()))
  );

-- ---------------------------------------------------------------------------
-- Realtime: the storefront subscribes to stock changes for the variants on screen.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.inventory;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (pg_cron): release abandoned stock reservations every minute.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule(
  'release-expired-reservations',
  '* * * * *',
  $$ select public.release_expired_reservations() $$
);

-- ---------------------------------------------------------------------------
-- Defaults the admin panel can change.
-- ---------------------------------------------------------------------------
insert into public.store_settings (key, value) values
  ('return_window_days', '30'::jsonb),
  ('reservation_minutes', '20'::jsonb),
  ('free_shipping_threshold_ore', '99900'::jsonb),
  ('abandoned_cart_delay_hours', '3'::jsonb)
on conflict (key) do nothing;
