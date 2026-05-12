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
    <div className="min-h-screen bg-[#f7f7f3]">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f7f7f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-base font-bold text-stone-950">
            <span className="flex size-9 items-center justify-center rounded bg-teal-800 text-white">
              <Database className="size-5" aria-hidden="true" />
            </span>
            Vidravault
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-stone-600 md:inline">{user?.email}</span>
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
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex h-10 shrink-0 items-center gap-2 rounded border px-3 text-sm font-semibold",
                  isActive
                    ? "border-teal-800 bg-teal-800 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
                )
              }
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
