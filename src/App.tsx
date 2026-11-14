import { useCallback, useState, type ComponentType } from "react";
import { useAuth } from "./auth/AuthProvider";
import { InactivityWarning, resetInactivityWarning } from "./components/InactivityWarning";
import { MobileNav, Sidebar, Topbar } from "./components/layout";
import { Toast } from "./components/ui";
import { useToast } from "./hooks/useToast";
import { toJaError } from "./lib/errors";
import { supabaseConfigError } from "./lib/supabase";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { CleaningPage } from "./pages/CleaningPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RankingPage } from "./pages/RankingPage";
import { RewardItemsPage } from "./pages/RewardItemsPage";
import { RewardsPage } from "./pages/RewardsPage";
import { ToolsPage } from "./pages/ToolsPage";
import { AppProvider } from "./state/AppContext";
import type { PageId } from "./types";

/** 画面ID → 画面コンポーネント */
const SCREENS: Record<PageId, ComponentType> = {
  home: HomePage,
  cleaning: CleaningPage,
  calendar: CalendarPage,
  history: HistoryPage,
  ranking: RankingPage,
  rewards: RewardsPage,
  rewardItems: RewardItemsPage,
  tools: ToolsPage,
  profile: ProfilePage,
  admin: AdminPage,
};

export default function App() {
  const { session, ready, signOut } = useAuth();
  const [page, setPage] = useState<PageId>("home");
  const toast = useToast();

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    window.scrollTo(0, 0);
  }, []);

  const handleSignOut = useCallback(() => {
    if (!window.confirm("ログアウトしますか？")) return;
    // 次にログインしたときにも警告を出せるように、表示済みの印を消す
    if (session) resetInactivityWarning(session.user.id);
    setPage("home");
    signOut().catch((e) => toast.show(toJaError(e)));
  }, [signOut, toast.show, session]);

  if (supabaseConfigError) return <div className="center-screen">{supabaseConfigError}</div>;
  if (!ready) return <div className="center-screen muted">読み込み中…</div>;
  if (!session) return <AuthPage />;

  const Screen = SCREENS[page];

  return (
    <AppProvider key={session.user.id} userId={session.user.id} page={page} navigate={navigate} toast={toast.show} signOut={handleSignOut}>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Topbar />
          <div className="content">
            <section className="page active">
              <Screen />
            </section>
          </div>
        </main>
        <MobileNav />
      </div>
      <InactivityWarning accountCreatedAt={new Date(session.user.created_at)} />
      <Toast message={toast.message} visible={toast.visible} />
    </AppProvider>
  );
}
