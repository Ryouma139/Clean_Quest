# Clean Quest DB設計（Supabase）

SQL: [supabase/migrations/](../supabase/migrations/) ／ 型: [src/lib/database.types.ts](../src/lib/database.types.ts)

## 1. 現在のコードからの移行対応

| 現在（フロント） | 移行先 | 種類 |
|---|---|---|
| `MISSIONS`（data/index.ts） | `missions` | マスタ |
| `INITIAL_TASKS` | `default_tasks`（雛形）→ サインアップ時に `cleaning_tasks` へコピー | マスタ |
| `REWARDS` | `rewards` | マスタ |
| `TOOLS` | `cleaning_tools` | マスタ |
| `USER_PROFILE.badges` | `badges` + `user_badges` | マスタ＋ユーザー |
| `WEEKLY_CHALLENGE` | `challenges`（進捗は `user_stats.streak_days` から算出） | マスタ |
| `USER_PROFILE.name / avatar` | `profiles` | ユーザー |
| `state.tasks` | `cleaning_tasks` | ユーザー |
| `state.history` | `cleaning_logs` | ユーザー |
| 報酬の交換（今はポイントを引くだけ） | `reward_redemptions` | ユーザー |
| `state.points` | **保存しない**：`user_stats.points_balance` = 獲得合計 − 交換合計 | 集計 |
| `task.done` | **保存しない**：`cleaning_task_status.done_today` | 集計 |
| level / 次レベルまで / 連続日数 / 今週回数 / 累計 | **保存しない**：`user_stats` | 集計 |
| `missionIndex`・フィルター・モーダル開閉 | DBにしない（画面の状態） | — |

## 2. テーブル

### マスタ（全員が読み取りのみ）
- **default_tasks** … 新規ユーザーに配る掃除箇所の雛形（`template_key` が主キー）
- **missions** … ランダムクエスト。`steps text[]` がチェックリスト、`task_template_key` で対応する掃除箇所に紐づける
- **rewards** / **cleaning_tools** / **badges** / **challenges**

### ユーザーデータ（本人の行のみアクセス可）
- **profiles** … `auth.users` と 1:1。表示名とアバター
- **cleaning_tasks** … 掃除箇所。ユーザーが登録・編集できる。削除は `archived_at` による論理削除
- **cleaning_logs** … 掃除の記録＝ポイント獲得の記録。記録時点の名前とポイントを残す
- **reward_redemptions** … 報酬の交換記録
- **user_badges** … 獲得したバッジ

## 3. 集計ビュー
- **cleaning_task_status** … 掃除箇所＋最終実施日時＋`done_today`
- **user_stats** … 保有ポイント、累計回数、累計ポイント、今週回数、連続日数、レベル（暫定：累計 500pt ごとに +1）
- **user_streaks** … 連続達成日数（今日または昨日まで続いているもの）

日付の区切りはすべて Asia/Tokyo です。

## 4. 書き込みのルール
ポイントが増減する操作はクライアントから直接 INSERT させず、RPC 経由に限定しています。ポイントの不正操作を防ぐためです。

| 画面の操作 | 呼び出し |
|---|---|
| 掃除管理「完了」 | `rpc('complete_task', { p_task_id })` ※同じ日に2回は不可 |
| 掃除管理「戻す」 | `rpc('undo_task', { p_task_id })` ※今日の最新記録を削除 |
| ホーム「掃除を完了する」 | `rpc('complete_mission', { p_mission_id })` ※同じミッションは1日1回 |
| 報酬「交換する」 | `rpc('redeem_reward', { p_reward_id })` ※残高チェックは排他制御つき |
| 掃除箇所の登録・編集・削除 | `from('cleaning_tasks').insert / update` |
| プロフィール編集 | `from('profiles').update` |

サインアップすると、トリガー `on_auth_user_created` が `profiles` を作成し、`default_tasks` を `cleaning_tasks` にコピーします。
新規登録フォームのニックネームは `user_metadata.display_name` として渡され、`profiles.display_name` に入ります（`20261115000200_signup_display_name.sql`）。

## 4.5 認証
- 方式：メールアドレス＋パスワード（`supabase.auth.signUp` / `signInWithPassword`）
- 「Confirm email」が有効な場合、登録後に確認メールが届き、リンクを開くとログイン状態でアプリに戻ります（`emailRedirectTo` = アプリのURL）
- 画面：未ログインなら [AuthPage](../src/pages/AuthPage.tsx)、ログイン済みならメイン画面（[App.tsx](../src/App.tsx)）

## 5. 未決事項
- バッジの付与条件と付与タイミング（今はテーブルだけ用意）
- チャレンジ達成時のボーナスの付与
- 頻度（週1回など）を考慮した「やるべき掃除」の判定（今は「今日やったか」のみ）
- レベルの計算式
- 認証方式（メールリンク、匿名サインインなど）
