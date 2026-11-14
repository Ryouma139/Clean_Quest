import { MENU_PAGES, menuPageOf, pageMeta } from "../../config/pages";
import { useApp } from "../../state/AppContext";
import { Avatar } from "../Avatar";
import { formatPoints } from "../../utils/format";

export function Sidebar() {
  const { page, navigate, user, signOut } = useApp();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandmark">⌂</div>
        <span className="brand-name">Clean Quest</span>
      </div>
      <div className="nav-label">MENU</div>
      <nav className="nav">
        {MENU_PAGES.filter((p) => !p.adminOnly || user.isAdmin).map((p) => (
          <button key={p.id} className={menuPageOf(page) === p.id ? "active" : ""} onClick={() => navigate(p.id)}>
            <span className="ico">{p.icon}</span>
            <span className="nav-text">{p.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        小さな掃除を、毎日の達成感に。
        <br />
        <strong>今日も一歩ずつ！</strong>
      </div>
      <button className="sidebar-logout" onClick={signOut} title="ログアウト">
        <span className="ico">⎋</span>
        <span className="nav-text">ログアウト</span>
      </button>
    </aside>
  );
}

export function Topbar() {
  const { page, user, navigate, signOut } = useApp();
  return (
    <header className="topbar">
      <div className="crumb">{pageMeta(page).breadcrumb}</div>
      <div className="top-actions">
        <span className="points-pill">🟡 {formatPoints(user.stats.pointsBalance)} pt</span>
        <button className="secondary small topbar-logout" onClick={signOut} title="ログアウト">
          <span className="logout-icon">⎋</span>
          <span className="logout-text">ログアウト</span>
        </button>
        <button className="avatar" title={user.profile.name} onClick={() => navigate("profile")}>
          <Avatar emoji={user.profile.avatar} imagePath={user.profile.avatarImage} alt={user.profile.name} />
        </button>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { page, navigate } = useApp();
  return (
    <nav className="mobile-nav">
      {MENU_PAGES.filter((p) => p.mobileLabel).map((p) => (
        <button key={p.id} className={menuPageOf(page) === p.id ? "active" : ""} onClick={() => navigate(p.id)}>
          <span>{p.icon}</span>
          {p.mobileLabel}
        </button>
      ))}
    </nav>
  );
}
