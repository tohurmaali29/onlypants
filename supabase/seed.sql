-- Dummy catalog for development and the first deploy (PRD Lampiran A).
-- Prices are market estimates; edit them from the admin dashboard.

insert into categories (slug, name_id, name_en, sort) values
  ('pants', 'Celana', 'Pants', 1),
  ('outerwear', 'Outerwear', 'Outerwear', 2),
  ('footwear', 'Sepatu', 'Footwear', 3),
  ('accessories', 'Aksesoris', 'Accessories', 4);

with p as (
  insert into products (slug, type, category_id, name_id, name_en, description_id, description_en,
    price, compare_at_price, condition_score, condition_note_id, condition_note_en, measurements, status, featured)
  select v.slug, v.type::product_type, c.id, v.name_id, v.name_en, v.desc_id, v.desc_en,
    v.price, v.compare_at, v.cond, v.cond_id, v.cond_en, v.meas::jsonb, 'active', v.featured
  from (values
    ('brown-graphic-cargo', 'thrift', 'pants', 'Brown Graphic Cargo', 'Brown Graphic Cargo',
      'Cargo wide-leg cokelat dengan grafis bordir hijau-emas dan kantong samping besar. Statement piece buat outfit streetwear.',
      'Wide-leg brown cargo with green and gold embroidered graphics and oversized side pockets. A true streetwear statement piece.',
      650000, 850000, 9, 'Sangat baik, tidak ada noda atau sobek.', 'Excellent, no stains or tears.',
      '{"waist":82,"length":104,"inseam":78,"thigh":34,"leg_opening":28}', true),
    ('artwork-painted-jeans', 'thrift', 'pants', 'Artwork Painted Jeans', 'Artwork Painted Jeans',
      'Jeans abu-abu dengan artwork lukis tangan. Satu-satunya, tidak akan ada yang sama.',
      'Grey jeans with hand-painted artwork. One of one, nobody else will have the same pair.',
      750000, null, 8, 'Cat sedikit retak di lutut kiri (karakter artwork).', 'Slight paint cracking on left knee (part of the artwork character).',
      '{"waist":78,"length":102,"inseam":76,"thigh":33,"leg_opening":26}', true),
    ('brown-double-knee-carpenter', 'thrift', 'pants', 'Brown Double-Knee Carpenter', 'Brown Double-Knee Carpenter',
      'Carpenter double-knee bahan canvas tebal, fading natural yang cakep. Workwear klasik.',
      'Heavy canvas double-knee carpenter pants with beautiful natural fading. A workwear classic.',
      450000, null, 8, 'Fading natural di lutut, jahitan aman semua.', 'Natural fading on knees, all seams intact.',
      '{"waist":86,"length":103,"inseam":76,"thigh":35,"leg_opening":25}', false),
    ('black-faded-wide-jeans', 'thrift', 'pants', 'Black Faded Wide Jeans', 'Black Faded Wide Jeans',
      'Jeans hitam wide-leg dengan efek whisker faded. Gampang dipadu-padankan.',
      'Black wide-leg jeans with faded whisker effect. Easy to style with anything.',
      350000, 425000, 9, 'Sangat baik.', 'Excellent.',
      '{"waist":80,"length":106,"inseam":80,"thigh":33,"leg_opening":27}', false),
    ('onlypants-gray-sweatpants', 'merch', 'pants', 'OnlyPants Gray Sweatpants', 'OnlyPants Gray Sweatpants',
      'Sweatpants merch OnlyPants, cotton fleece 330gsm, potongan straight relaxed dengan tali serut.',
      'Official OnlyPants sweatpants, 330gsm cotton fleece, relaxed straight fit with drawstring.',
      249000, 299000, null, '', '',
      '{}', true),
    ('distressed-metal-cargo', 'thrift', 'pants', 'Distressed Metal Cargo', 'Distressed Metal Cargo',
      'Cargo hitam distressed dengan aksen metal spike di samping. Edgy dan langka.',
      'Black distressed cargo with metal spike side details. Edgy and rare.',
      850000, null, 8, 'Distressed memang desainnya, spike lengkap.', 'Distressing is by design, all spikes intact.',
      '{"waist":78,"length":105,"inseam":79,"thigh":32,"leg_opening":30}', true),
    ('vintage-peanuts-snapback', 'merch', 'accessories', 'Vintage Peanuts Snapback', 'Vintage Peanuts Snapback',
      'Snapback bergambar Peanuts dengan bordir penuh, visor hijau.',
      'Snapback with all-over Peanuts embroidery and green visor.',
      225000, 275000, null, '', '',
      '{}', false),
    ('thrill-ride-messenger-bag', 'thrift', 'accessories', '"Thrill Ride" Messenger Bag', '"Thrill Ride" Messenger Bag',
      'Messenger bag canvas cokelat dengan print "Thrill Ride" dan studs. Muat laptop 13".',
      'Brown canvas messenger bag with "Thrill Ride" print and studs. Fits a 13" laptop.',
      275000, 350000, 8, 'Sedikit kusam di tali, wajar untuk vintage.', 'Slight wear on the strap, normal for vintage.',
      '{"width":36,"height":28,"depth":9}', false),
    ('chunky-tassel-loafers', 'thrift', 'footwear', 'Chunky Tassel Loafers', 'Chunky Tassel Loafers',
      'Loafers kulit cokelat dengan tassel dan sol chunky. Size EU 42.',
      'Brown leather loafers with tassels and a chunky sole. Size EU 42.',
      750000, 950000, 9, 'Sol masih tebal, kulit mulus.', 'Sole still thick, leather in great shape.',
      '{"insole":27}', false),
    ('vintage-a2-leather-jacket', 'thrift', 'outerwear', 'Vintage A-2 Leather Jacket', 'Vintage A-2 Leather Jacket',
      'Jaket kulit model A-2 flight jacket, kulit asli, lining satin.',
      'A-2 style flight jacket in genuine leather with satin lining.',
      950000, 1250000, 8, 'Patina natural, resleting berfungsi normal.', 'Natural patina, zipper works perfectly.',
      '{"pit_to_pit":58,"length":68,"sleeve":62}', true),
    ('mohair-plaid-cardigan', 'thrift', 'outerwear', 'Mohair Plaid Cardigan', 'Mohair Plaid Cardigan',
      'Cardigan mohair motif kotak hijau-oranye, hangat dan fluffy.',
      'Green and orange plaid mohair cardigan, warm and fluffy.',
      425000, null, 9, 'Sangat baik, tidak ada lubang.', 'Excellent, no holes.',
      '{"pit_to_pit":54,"length":66,"sleeve":60}', false)
  ) as v(slug, type, cat, name_id, name_en, desc_id, desc_en, price, compare_at, cond, cond_id, cond_en, meas, featured)
  join categories c on c.slug = v.cat
  returning id, slug
)
insert into product_images (product_id, url, alt, sort)
select id, '/images/products/' || slug || '.jpg', slug, 0 from p;

-- Variants: thrift = one size, qty 1. Merch = several sizes with qty.
insert into variants (product_id, size_label, sku, sort, stock_on_hand)
select p.id, v.size_label, upper(left(replace(p.slug, '-', ''), 10)) || '-' || v.sort, v.sort, v.qty
from products p
join (values
  ('brown-graphic-cargo', 'W32 L31', 0, 1),
  ('artwork-painted-jeans', 'W30 L30', 0, 1),
  ('brown-double-knee-carpenter', 'W34 L30', 0, 1),
  ('black-faded-wide-jeans', 'W31 L32', 0, 1),
  ('onlypants-gray-sweatpants', 'S', 0, 4),
  ('onlypants-gray-sweatpants', 'M', 1, 6),
  ('onlypants-gray-sweatpants', 'L', 2, 6),
  ('onlypants-gray-sweatpants', 'XL', 3, 3),
  ('distressed-metal-cargo', 'W30 L32', 0, 1),
  ('vintage-peanuts-snapback', 'All Size', 0, 3),
  ('thrill-ride-messenger-bag', 'One Size', 0, 1),
  ('chunky-tassel-loafers', 'EU 42', 0, 1),
  ('vintage-a2-leather-jacket', 'L', 0, 1),
  ('mohair-plaid-cardigan', 'M', 0, 1)
) as v(slug, size_label, sort, qty) on v.slug = p.slug;

insert into stock_movements (variant_id, type, qty, note)
select id, 'restock', stock_on_hand, 'initial seed' from variants;

insert into settings (key, value) values
  ('store', '{
    "name": "OnlyPants",
    "whatsapp": "6281200000000",
    "email": "hello@onlypants.test",
    "instagram": "maali29_",
    "address": "Tanjung Barat, Jagakarsa, Jakarta Selatan",
    "hours": "09.00–21.00 WIB"
  }'),
  ('payment', '{
    "qris_image_url": "/images/brand/qris-dummy.svg",
    "merchant_name": "ONLYPANTS (CONTOH)",
    "is_dummy": true
  }'),
  ('timeouts', '{"quote_hours": 48, "payment_hours": 24}');
