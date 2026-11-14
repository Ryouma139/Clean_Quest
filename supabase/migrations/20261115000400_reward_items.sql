-- 報酬ごとの「ご褒美商品」（交換後に表示する商品リンクの一覧）
-- 報酬ショップで交換すると、その報酬に紐づく商品の一覧画面に移動する

create table public.reward_items (
  id            text primary key,
  reward_id     text not null references public.rewards (id) on delete cascade,
  name          text not null,
  description   text not null default '',
  emoji         text not null default '🎁',
  image_url     text check (image_url     is null or image_url     ~* '^https://'),
  affiliate_url text check (affiliate_url is null or affiliate_url ~* '^https://'),
  sort_order    int  not null default 0,
  is_active     boolean not null default true
);
create index reward_items_reward_idx on public.reward_items (reward_id, sort_order);

comment on table  public.reward_items               is '報酬ごとのご褒美商品（アフィリエイトリンク）';
comment on column public.reward_items.image_url     is '商品画像のURL（https）。空なら emoji を表示';
comment on column public.reward_items.affiliate_url is 'アフィリエイトリンク（https）。空なら「商品リンク準備中」';

alter table public.reward_items enable row level security;
create policy "read master" on public.reward_items for select to anon, authenticated using (is_active);

-- サンプル商品（画像URL・アフィリエイトリンクは Table Editor で入力する）
insert into public.reward_items (id, reward_id, name, description, emoji, sort_order) values
  ('sweets-baked',     'sweets', '焼き菓子アソート',         'クッキーやフィナンシェの詰め合わせ',   '🍪', 1),
  ('sweets-choco',     'sweets', 'チョコレート詰め合わせ',   'ちょっと贅沢なチョコでひと休み',       '🍫', 2),
  ('sweets-pudding',   'sweets', 'プリン・ゼリーセット',     '冷やして食べるご褒美スイーツ',         '🍮', 3),
  ('game-controller',  'game',   'ゲームコントローラー',     '手になじむコントローラーで快適に',     '🎮', 1),
  ('game-headset',     'game',   'ゲーミングヘッドセット',   '音までしっかり楽しめる',               '🎧', 2),
  ('game-giftcard',    'game',   'ゲーム用ギフトカード',     '欲しかったソフトや追加コンテンツに',   '💳', 3),
  ('cafe-drip',        'cafe',   'ドリップコーヒーセット',   'おうちでカフェ気分',                   '☕', 1),
  ('cafe-tea',         'cafe',   '紅茶ティーバッグ詰め合わせ','その日の気分で選べる紅茶',            '🫖', 2),
  ('cafe-giftcard',    'cafe',   'カフェギフトカード',       'お気に入りのお店でひと息',             '💳', 3),
  ('gift-bath',        'gift',   '入浴剤ギフトセット',       'お風呂時間をちょっと特別に',           '🛁', 1),
  ('gift-aroma',       'gift',   'アロマディフューザー',     'きれいになった部屋に好きな香りを',     '🌿', 2),
  ('gift-handcream',   'gift',   'ハンドクリームセット',     '掃除のあとの手をいたわる',             '🧴', 3),
  ('movie-ticket',     'movie',  '映画鑑賞券',               '映画館で観たい作品を',                 '🎟️', 1),
  ('movie-popcorn',    'movie',  'ポップコーンメーカー',     'おうち映画のお供に',                   '🍿', 2),
  ('movie-blanket',    'movie',  'ブランケット',             'ソファでゆったり映画鑑賞',             '🛋️', 3),
  ('book-cover',       'book',   'ブックカバー',             'お気に入りの本をきれいに持ち歩く',     '📕', 1),
  ('book-light',       'book',   '読書用ライト',             '夜の読書も目にやさしく',               '💡', 2),
  ('book-giftcard',    'book',   '図書カード',               '次に読む本を選ぶ楽しみ',               '📚', 3);

-- 値の登録例
-- update public.reward_items set
--   image_url     = 'https://example.com/baked.jpg',
--   affiliate_url = 'https://example.com/affiliate/baked'
-- where id = 'sweets-baked';
