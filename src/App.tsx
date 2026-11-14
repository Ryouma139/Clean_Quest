import { useCallback, useState, type ComponentType } from "react";
import { useAuth } from "./auth/AuthProvider";
import { MobileNav, Sidebar, Topbar } from "./components/layout";
import { Toast } from "./components/ui";
import { useToast } from "./hooks/useToast";
import { toJaError } from "./lib/errors";
import { supabaseConfigError } from "./lib/supabase";
import { AuthPage } from "./pages/AuthPage";
import { CleaningPage } from "./pages/CleaningPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RewardsPage } from "./pages/RewardsPage";
import { ToolsPage } from "./pages/ToolsPage";
import { AppProvider } from "./state/AppContext";
import type { PageId } from "./types";

/** 画面ID → 画面コンポーネント */
const SCREENS: Record<PageId, ComponentType> = {
  home: HomePage,
  cleaning: CleaningPage,
  history: HistoryPage,
  rewards: RewardsPage,
  tools: ToolsPage,
  profile: ProfilePage,
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
    signOut()
      .then(() => setPage("home"))
      .catch((e) => toast.show(toJaError(e)));
  }, [signOut, toast.show]);

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
      <Toast message={toast.message} visible={toast.visible} />
    </AppProvider>
  );
}
