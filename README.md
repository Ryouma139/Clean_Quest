# Clean Quest

掃除をクエストに変える Web アプリ（React + TypeScript + Vite + Supabase）。

## セットアップ

1. Supabase でプロジェクトを作り、SQL Editor で `supabase/migrations/` の SQL をファイル名順に実行する
2. Authentication → URL Configuration の Site URL に `http://localhost:5173` を設定する
3. `.env.example` を `.env.local` にコピーし、Project Settings → API の URL と anon key を設定する
4. 起動

```bash
npm install
npm run dev
```

- 画面仕様：[docs/screens.md](docs/screens.md)
- DB 設計：[docs/database.md](docs/database.md)
