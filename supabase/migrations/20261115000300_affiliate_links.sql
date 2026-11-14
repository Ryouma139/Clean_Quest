-- 掃除用品に「画像URL」と「アフィリエイトリンク」を持たせる
-- どちらも空なら画面は絵文字表示・リンクなしになる

-- product_url は affiliate_url に名前を変更
alter table public.cleaning_tools rename column product_url to affiliate_url;
alter table public.cleaning_tools add column image_url text;

-- https 以外（javascript: など）を登録できないようにする
alter table public.cleaning_tools
  add constraint cleaning_tools_image_url_https     check (image_url     is null or image_url     ~* '^https://'),
  add constraint cleaning_tools_affiliate_url_https check (affiliate_url is null or affiliate_url ~* '^https://');

comment on column public.cleaning_tools.image_url     is '商品画像のURL（https）。空なら emoji を表示';
comment on column public.cleaning_tools.affiliate_url is 'アフィリエイトリンク（https）。空ならリンクを表示しない';

-- 値の登録例（Table Editor で直接入力しても可）
-- update public.cleaning_tools set
--   image_url     = 'https://example.com/cloth.jpg',
--   affiliate_url = 'https://example.com/affiliate/cloth'
-- where id = 'cloth';
