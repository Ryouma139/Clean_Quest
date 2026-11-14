-- マスタデータ（src/data/index.ts から移行）

insert into public.default_tasks (template_key, name, area, freq, points, emoji, sort_order) values
  ('stove',     'コンロ', 'キッチン', '週1回', 50, '🔥', 1),
  ('sink',      'シンク', 'キッチン', '毎日',  30, '🧽', 2),
  ('washbasin', '洗面台', '水回り',   '週2回', 30, '🚰', 3),
  ('bathtub',   '浴槽',   '水回り',   '週2回', 50, '🛁', 4),
  ('floor',     '床掃除', '居室',     '週1回', 40, '🧹', 5);

insert into public.missions (id, name, area, comment, time_label, points, emoji, image_url, steps, task_template_key, sort_order) values
  ('washbasin', '洗面台を磨こう！', '水回り', '朝の洗面台、少し汚れていませんか？ たった3分で気分もスッキリ！', '3〜5分', 30, '🚰',
   'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=85',
   array['洗面台の汚れを拭き取る', '蛇口の水垢を落とす', '鏡をきれいにする'], 'washbasin', 1),
  ('kitchen-sink', 'キッチンのシンクを洗おう！', 'キッチン', '食器を洗ったついでに、シンクもさっとリセット！', '5分', 30, '🧽',
   'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&q=85',
   array['ゴミ受けのゴミを捨てる', 'シンクを洗う', '水滴を拭き取る'], 'sink', 2),
  ('floor', '床をさっと掃除しよう！', '居室', '床のホコリを取るだけでも、お部屋の印象が変わります。', '5〜10分', 40, '🧹',
   'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=85',
   array['床のものを片付ける', '掃除機をかける', '気になる場所を拭く'], 'floor', 3),
  ('bathtub', '浴槽をきれいにしよう！', '水回り', '次に使う自分のために、浴槽をリセットしませんか？', '5〜8分', 50, '🛁',
   'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=85',
   array['浴槽全体を濡らす', '洗剤で洗う', 'しっかりすすぐ'], 'bathtub', 4);

insert into public.rewards (id, name, description, points, emoji, sort_order) values
  ('sweets', 'スイーツ',       'お気に入りのお菓子を楽しもう', 500,  '🍫', 1),
  ('game',   'ゲーム時間',     '好きなゲームをゆっくり楽しむ', 800,  '🎮', 2),
  ('cafe',   'カフェ休憩',     'カフェでひと息つこう',         600,  '☕', 3),
  ('gift',   '自分へのご褒美', '少し特別なプレゼント',         1500, '🎁', 4),
  ('movie',  '映画タイム',     '好きな映画を一本楽しもう',     700,  '🎬', 5),
  ('book',   '読書タイム',     'ゆっくり読書を楽しもう',       400,  '📚', 6);

insert into public.cleaning_tools (id, name, description, emoji, category, sort_order) values
  ('cloth',   'マイクロファイバークロス', '鏡・テーブル・水回りの拭き掃除に', '🧽', '拭き掃除', 1),
  ('vacuum',  'コードレス掃除機',         '床やカーペットの日常清掃に',       '🧹', '床掃除',   2),
  ('brush',   '浴室用ブラシ',             '浴槽や床の汚れを落とす',           '🪥', '水回り',   3),
  ('kitchen', 'キッチン用クリーナー',     'コンロやシンクのお手入れに',       '🧴', 'キッチン', 4),
  ('glass',   'ガラスクリーナー',         '窓や鏡をすっきり仕上げる',         '✨', '拭き掃除', 5),
  ('roller',  '粘着クリーナー',           'ソファや衣類のホコリ取りに',       '🧻', '居室',     6);

insert into public.badges (id, emoji, label, sort_order) values
  ('first-clean', '🏆', 'はじめての掃除', 1),
  ('streak-3',    '🧹', '連続3日達成',    2),
  ('home-master', '🏠', 'おうちマスター', 3),
  ('points-1000', '⭐', '1,000 pt達成',   4);

insert into public.challenges (id, title, kind, target, bonus) values
  ('streak-3', '3日連続で掃除しよう', 'streak', 3, 50);
