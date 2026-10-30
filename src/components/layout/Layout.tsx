import { useState } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Library,
  ClipboardList,
  Files,
  Sparkles,
  MessageSquare,
  BarChart3,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  ChevronDown,
  Sun,
  Moon,
  Search,
  Shield,
  Users,
  PlusCircle,
  CheckSquare,
} from "lucide-react";
import { useApp } from "../../app/context";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui";
import type { Role } from "../../domain/models";
export function LanguagePicker() {
  const { i18n, t } = useTranslation();
  const { profile, demo } = useApp();
  return (
    <select
      aria-label={t("language")}
      className="language"
      value={i18n.language}
      onChange={async (e) => {
        const l = e.target.value;
        await i18n.changeLanguage(l);
        if (profile && !demo && supabase)
          await supabase
            .from("profiles")
            .update({ language: l })
            .eq("id", profile.id);
      }}
    >
      <option value="kk">🇰🇿 Қазақша</option>
      <option value="ru">🇷🇺 Русский</option>
      <option value="en">🇬🇧 English</option>
    </select>
  );
}
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span>
        <GraduationCap size={23} />
      </span>
      EduSmart<span className="ai-tag">AI</span>
    </Link>
  );
}
export function Protected({
  roles,
  children,
}: {
  roles?: Role[];
  children?: React.ReactNode;
}) {
  const { profile, session, loading, demo } = useApp();
  const loc = useLocation();
  const { t } = useTranslation();
  if (loading) return <div className="empty">{t("loading")}</div>;
  if (!session && !demo)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(profile?.role || "student"))
    return <div className="empty">{t("accessDenied")}</div>;
  return children || <Outlet />;
}
const nav = [
  ["dashboard", LayoutDashboard],
  ["courses", BookOpen],
  ["catalog", Library],
  ["assignments", ClipboardList],
  ["grades", CheckSquare],
  ["analytics", BarChart3],
  ["calendar", CalendarDays],
] as const;
const aiNav = [
  ["analyzer", Sparkles],
  ["assistant", MessageSquare],
  ["quizzes", PlusCircle],
  ["documents", Files],
] as const;
export function Layout() {
  const { t } = useTranslation();
  const { profile, demo, setDemo, theme, toggleTheme } = useApp();
  const [mobile, setMobile] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobile(false)}
            aria-label={t("cancel")}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">E</span>
          <div>
            <strong>{t("workspace")}</strong>
            <small>
              {t(profile?.role === "teacher" ? "teacher" : "student")}
            </small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav>
          <p className="nav-label">{t("workspace")}</p>
          {nav.map(([key, Icon]) => (
            <NavLink
              key={key}
              to={"/app/" + key}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              <span>{t(key)}</span>
            </NavLink>
          ))}
          <p className="nav-label">{t("quickTools")}</p>
          {aiNav.map(([key, Icon]) => (
            <NavLink
              key={key}
              to={"/app/" + key}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              <span>{t(key)}</span>
              {key === "assistant" && <b className="tiny-ai">AI</b>}
            </NavLink>
          ))}
          {["teacher", "admin"].includes(profile?.role || "") && (
            <>
              <p className="nav-label">{t("teacher")}</p>
              {[
                ["teacher", LayoutDashboard],
                ["manageCourses", BookOpen],
                ["lessons", Library],
                ["manageAssignments", ClipboardList],
                ["submissions", CheckSquare],
                ["students", Users],
              ].map(([key, Icon]) => (
                <NavLink key={key as string} to={"/app/" + key}>
                  <Icon size={19} />
                  <span>
                    {t(
                      key === "manageAssignments"
                        ? "assignments"
                        : (key as string),
                    )}
                  </span>
                </NavLink>
              ))}
            </>
          )}
          {profile?.role === "admin" && (
            <NavLink to="/app/admin">
              <Shield size={19} />
              <span>{t("admin")}</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/app/settings">
            <Settings size={18} />
            <span>{t("settings")}</span>
          </NavLink>
          <button
            onClick={async () => {
              if (demo) setDemo(false);
              else await supabase?.auth.signOut();
            }}
          >
            <LogOut size={18} />
            <span>{t("logout")}</span>
          </button>
          <button
            className="collapse-control"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={t("workspace")}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setMobile(true)}
            aria-label={t("workspace")}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            {t("workspace")} <span>/</span>{" "}
            <strong>{t(location.pathname.split("/")[2] || "dashboard")}</strong>
          </div>
          <form className="header-search" action="/app/catalog">
            <Search size={16} />
            <input
              aria-label={t("search")}
              placeholder={t("search") + "…"}
              name="q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <LanguagePicker />
          <button
            className="icon-button"
            aria-label={t("theme")}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            className="icon-button notification-bell"
            to="/app/notifications"
            aria-label={t("notifications")}
          >
            <Bell size={20} />
          </Link>
          <Link to="/app/profile" className="avatar" aria-label={t("profile")}>
            {profile?.full_name?.slice(0, 1) || "E"}
          </Link>
        </header>
        {demo && (
          <div className="demo-banner">
            {t("demoNotice")} <Link to="/register">{t("register")} →</Link>
          </div>
        )}
        <main>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} EduSmart AI</span>
          <span>{t("footer")}</span>
        </footer>
      </div>
    </div>
  );
}
