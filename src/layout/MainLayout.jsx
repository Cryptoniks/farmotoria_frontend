// src/layout/MainLayout.jsx
import Header from "../components/Header";
import Footer from "../components/Footer";
import LeftMenu from "../components/LeftMenu";
import RightPanel from "../components/RightPanel";
import "./MainLayout.css";

export default function MainLayout({
  children,
  user,
  isAuthenticated,
  coinsBalance,
  onLogout,
}) {
  return (
    <div className="app-root">
      <div className="app-shell">
        <Header
          user={user}
          isAuthenticated={isAuthenticated}
          coinsBalance={coinsBalance}
          onLogout={onLogout}
        />

        <div className="app-body">
          <aside className="body-left">
            {isAuthenticated ? <LeftMenu /> : null}
          </aside>

          <main className="body-center">{children}</main>

          <aside className="body-right">
            <RightPanel user={user} />
          </aside>
        </div>

        <Footer />
      </div>
    </div>
  );
}