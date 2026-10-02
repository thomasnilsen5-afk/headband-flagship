-- Seed data: PLACEHOLDER catalog. Every product carries specs.placeholder = true.
-- Replace names, copy, materials, prices and stock with real data before launch
-- (see README → "What you must provide").

insert into public.collections (slug, status, name, description, position) values
  ('kinetic', 'active', '{"nb":"Kinetisk","en":"Kinetic"}', '{"nb":"For trening, løp og alt som får pulsen opp.","en":"For training, running and everything that raises a pulse."}', 1),
  ('ambient', 'active', '{"nb":"Ambient","en":"Ambient"}', '{"nb":"For hverdagen. Stille, presise, alltid på.","en":"For the everyday. Quiet, precise, always on."}', 2),
  ('limited', 'active', '{"nb":"Begrenset","en":"Limited"}', '{"nb":"Små opplag. Kommer ikke tilbake.","en":"Small runs. They do not return."}', 3)
on conflict (slug) do nothing;

insert into public.drops (slug, name, description, starts_at, ends_at, max_per_customer, is_published) values
  ('halcyon', '{"nb":"HALCYON Λ","en":"HALCYON Λ"}',
   '{"nb":"Tynnfilm-overflate som bytter farge med lyset. 300 eksemplarer, nummererte.","en":"A thin-film surface that shifts with the light. 300 numbered pieces."}',
   date_trunc('hour', now()) + interval '9 days', null, 2, true)
on conflict (slug) do nothing;

do $$
declare
  p record;
  c record;
  s text;
  v_product_id uuid;
  v_variant_id uuid;
  v_pos integer;
  v_stock integer;
begin
  for p in
    select * from (values
      ('nacre', 'NAC', 'ambient', 69000, null::integer, false,
        '{"nb":"NACRE","en":"NACRE"}'::jsonb,
        '{"nb":"Hverdagsbåndet med en kant av flytende krom.","en":"The everyday band, edged in liquid chrome."}'::jsonb,
        '{"nb":"Strikket kropp i resirkulert polyamid med en varmebundet kant som fanger lyset som kvikksølv. Sømløs, flatlåst, glemt etter fem minutter.","en":"A knit body in recycled polyamide with a heat-bonded edge that catches light like mercury. Seamless, flat-locked, forgotten after five minutes."}'::jsonb,
        '{"width_mm":42,"thickness":0.07,"twist":0,"finish":"chrome","waves":3}'::jsonb,
        array['abyss','nacre','umbra'], array['S/M','M/L']),
      ('isobar', 'ISO', 'kinetic', 59000, null, false,
        '{"nb":"ISOBAR","en":"ISOBAR"}'::jsonb,
        '{"nb":"Leder fukt bort før du merker den.","en":"Moves moisture before you notice it."}'::jsonb,
        '{"nb":"Graderte kanaler i strikken leder svette til sidene, bort fra øynene. Silikonfritt grep som holder under intervaller.","en":"Graded channels in the knit route sweat to the sides, away from the eyes. Silicone-free grip that holds through intervals."}'::jsonb,
        '{"width_mm":38,"thickness":0.06,"twist":0.15,"finish":"satin","waves":5}'::jsonb,
        array['abyss','ichor','chalk'], array['S/M','M/L']),
      ('fathom', 'FTH', 'kinetic', 79000, null, false,
        '{"nb":"FATHOM","en":"FATHOM"}'::jsonb,
        '{"nb":"For lange økter i mørket.","en":"For long sessions in the dark."}'::jsonb,
        '{"nb":"Termoregulerende dobbeltlag med refleksgarn vevd inn i hele flaten. Synlig på 150 meter, usynlig på huden.","en":"A thermoregulating double layer with reflective yarn woven through the entire surface. Visible at 150 metres, invisible on the skin."}'::jsonb,
        '{"width_mm":46,"thickness":0.08,"twist":0.05,"finish":"knit","waves":4}'::jsonb,
        array['abyss','umbra','ultraviolet'], array['S/M','M/L']),
      ('serac', 'SRC', 'kinetic', 89000, null, false,
        '{"nb":"SÉRAC","en":"SÉRAC"}'::jsonb,
        '{"nb":"Vindtett merino for minusgrader.","en":"Windproof merino for sub-zero days."}'::jsonb,
        '{"nb":"Merinoblanding med en vindtett membran over ørene. Puster der du er varm, stenger der du er utsatt.","en":"A merino blend with a windproof membrane over the ears. Breathes where you run hot, closes where you are exposed."}'::jsonb,
        '{"width_mm":64,"thickness":0.1,"twist":0,"finish":"knit","waves":2}'::jsonb,
        array['abyss','nacre','glacier'], array['S/M','M/L']),
      ('meridian', 'MRD', 'ambient', 49000, 59000, false,
        '{"nb":"MERIDIAN","en":"MERIDIAN"}'::jsonb,
        '{"nb":"Bredt, mykt, uten trykk.","en":"Wide, soft, pressure-free."}'::jsonb,
        '{"nb":"Et bredt studiobånd med null kompresjon i tinningene. Laget for yoga, lesing og lange flyreiser.","en":"A wide studio band with zero compression at the temples. Made for yoga, reading and long flights."}'::jsonb,
        '{"width_mm":70,"thickness":0.05,"twist":0,"finish":"satin","waves":1}'::jsonb,
        array['nacre','umbra'], array['ONE']),
      ('halcyon', 'HAL', 'limited', 149000, null, true,
        '{"nb":"HALCYON Λ","en":"HALCYON Λ"}'::jsonb,
        '{"nb":"En overflate som ikke bestemmer seg.","en":"A surface that will not make up its mind."}'::jsonb,
        '{"nb":"Tynnfilmbelagt kant som skifter mellom fiolett, cyan og gull etter vinkel og lys. Nummerert, 300 eksemplarer.","en":"A thin-film-coated edge that shifts between violet, cyan and gold with angle and light. Numbered, 300 pieces."}'::jsonb,
        '{"width_mm":40,"thickness":0.07,"twist":0.35,"finish":"film","waves":6}'::jsonb,
        array['film'], array['ONE'])
    ) as t(slug, code, collection, price, compare_at, limited, name, tagline, description, form, colors, sizes)
  loop
    insert into public.products (
      slug, status, name, tagline, description, collection_id, drop_id, price_ore, compare_at_ore,
      materials, specs, form, is_limited, position, published_at
    ) values (
      p.slug, 'active', p.name, p.tagline, p.description,
      (select id from public.collections where slug = p.collection),
      case when p.limited then (select id from public.drops where slug = 'halcyon') end,
      p.price, p.compare_at,
      '[{"name":{"nb":"Resirkulert polyamid","en":"Recycled polyamide"},"pct":78},{"name":{"nb":"Elastan","en":"Elastane"},"pct":22}]'::jsonb,
      jsonb_build_object('placeholder', true, 'weight_g', 18 + (p.form->>'width_mm')::integer / 4, 'width_mm', (p.form->>'width_mm')::integer, 'care', 'machine_wash_30'),
      p.form, p.limited,
      (select coalesce(max(position), 0) + 1 from public.products),
      now()
    )
    on conflict (slug) do nothing
    returning id into v_product_id;

    continue when v_product_id is null;

    v_pos := 0;
    foreach s in array p.sizes loop
      for c in
        select * from (values
          ('abyss', '#0A0C10', '{"nb":"Avgrunn","en":"Abyss"}'::jsonb),
          ('nacre', '#D9D6CE', '{"nb":"Perlemor","en":"Nacre"}'::jsonb),
          ('umbra', '#3A3D44', '{"nb":"Umbra","en":"Umbra"}'::jsonb),
          ('ichor', '#3EE6C1', '{"nb":"Ikor","en":"Ichor"}'::jsonb),
          ('chalk', '#E6E2D8', '{"nb":"Kritt","en":"Chalk"}'::jsonb),
          ('ultraviolet', '#6E4BFF', '{"nb":"Ultrafiolett","en":"Ultraviolet"}'::jsonb),
          ('glacier', '#AFC6D6', '{"nb":"Bre","en":"Glacier"}'::jsonb),
          ('film', '#8F7CF7', '{"nb":"Tynnfilm","en":"Thin film"}'::jsonb)
        ) as col(key, hex, name)
        where col.key = any (p.colors)
        order by array_position(p.colors, col.key)
      loop
        insert into public.product_variants (product_id, sku, color_key, color_name, color_hex, size, weight_g, position)
        values (
          v_product_id,
          p.code || '-' || upper(left(c.key, 3)) || '-' || replace(s, '/', ''),
          c.key, c.name, c.hex, s, 20, v_pos
        )
        returning id into v_variant_id;

        -- Deterministic placeholder stock with a few low/sold-out variants for demo states.
        v_stock := case
          when p.limited then 300
          when p.slug = 'fathom' and c.key = 'ultraviolet' and s = 'S/M' then 0
          when p.slug = 'isobar' and c.key = 'ichor' then 3
          else 40 + (v_pos * 17) % 60
        end;
        insert into public.inventory (variant_id, on_hand) values (v_variant_id, v_stock);
        v_pos := v_pos + 1;
      end loop;
    end loop;
  end loop;
end;
$$;

insert into public.bundles (slug, status, name, description, discount_bp, position) values
  ('dyad', 'active', '{"nb":"DYADE","en":"DYAD"}', '{"nb":"Ett for bevegelse, ett for ro. 15 % samlet.","en":"One for motion, one for stillness. 15% together."}', 1500, 1),
  ('triad', 'active', '{"nb":"TRIADE","en":"TRIAD"}', '{"nb":"Hele sirkelen. 20 % samlet.","en":"The full circle. 20% together."}', 2000, 2)
on conflict (slug) do nothing;

insert into public.bundle_items (bundle_id, product_id, qty)
select b.id, p.id, 1
  from public.bundles b
  join public.products p on
    (b.slug = 'dyad' and p.slug in ('isobar', 'nacre')) or
    (b.slug = 'triad' and p.slug in ('isobar', 'nacre', 'fathom'))
on conflict do nothing;

insert into public.shipping_rates (code, carrier, name, zone, price_ore, free_over_ore, eta_days_min, eta_days_max, position) values
  ('posten_mailbox', 'posten', '{"nb":"Rett i postkassen","en":"Straight to your mailbox"}', 'NO', 4900, 99900, 2, 4, 1),
  ('bring_pickup', 'bring', '{"nb":"Hentested","en":"Pickup point"}', 'NO', 6900, 99900, 1, 3, 2),
  ('bring_home_evening', 'bring', '{"nb":"Hjem på kvelden","en":"Home, evening delivery"}', 'NO', 14900, null, 1, 2, 3),
  ('bring_nordic', 'bring', '{"nb":"Norden","en":"Nordics"}', 'NORDIC', 14900, 199900, 2, 5, 4),
  ('bring_eu', 'bring', '{"nb":"EU","en":"EU"}', 'EU', 19900, 249900, 3, 7, 5),
  ('posten_world', 'posten', '{"nb":"Resten av verden","en":"Rest of world"}', 'WORLD', 29900, null, 5, 12, 6)
on conflict (code) do nothing;

insert into public.discounts (code, kind, value, min_subtotal_ore, per_customer_limit) values
  ('VELKOMMEN10', 'percent', 1000, 0, 1),
  ('FRIFRAKT', 'free_shipping', 0, 50000, null)
on conflict (code) do nothing;

insert into public.content_blocks (key, locale, data) values
  ('home.hero', 'nb', '{"eyebrow":"Objekt 01 — pannebånd","title":"Laget et annet sted.","body":"Et bånd rundt hodet, konstruert med en presisjon som ikke helt hører hjemme her.","cta":"Se objektene"}'),
  ('home.hero', 'en', '{"eyebrow":"Object 01 — headband","title":"Made elsewhere.","body":"A band around the head, built with a precision that does not quite belong here.","cta":"See the objects"}')
on conflict (key, locale) do nothing;
