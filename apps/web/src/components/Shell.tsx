import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Database, LayoutDashboard, ListVideo, LogOut, Plus, Search, Settings } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../lib/auth";
import { Button } from "./Button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add", label: "Add video", icon: Plus },
  { to: "/videos", label: "Videos", icon: ListVideo },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#d8e2ea] bg-white/[0.86] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3 text-base font-bold text-[#17212b]">
            <span className="flex size-9 items-center justify-center rounded-md bg-[#0f766e] text-white shadow-sm">
              <Database className="size-5" aria-hidden="true" />
            </span>
            Vidravault
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-md border border-[#d8e2ea] bg-[#f7fafc] px-3 py-1.5 text-sm text-[#596776] md:inline">
              {user?.email}
            </span>
            <Button
              title="Log out"
              onClick={() => {
                void logout().then(() => {
                  void navigate("/login");
                });
              }}
            >
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="surface flex gap-2 overflow-x-auto rounded-lg p-2 lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "focus-ring flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                  isActive
                    ? "border-[#0f766e] bg-[#e7f5f3] text-[#0b5954] shadow-sm"
                    : "border-transparent text-[#596776] hover:border-[#d8e2ea] hover:bg-[#f7fafc] hover:text-[#17212b]",
                )
              }
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
