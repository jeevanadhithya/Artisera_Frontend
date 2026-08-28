import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Home, Compass, Plus, BarChart3, User } from "lucide-react";
import type { ReactNode } from "react";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <button aria-label="Menu" onClick={onMenu} className="text-primary">
        <Menu className="h-6 w-6" />
      </button>
      <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-primary">
        Artisera
      </Link>
      <button aria-label="Notifications" className="text-primary">
        <Bell className="h-6 w-6" />
      </button>
    </header>
  );
}

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/add", label: "Add", icon: Plus },
  { to: "/leads", label: "Leads", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-card px-2 pb-2 pt-1.5">
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex justify-center">
              <Link
                to={to}
                className={
                  "flex min-w-0 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground")
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PhoneFrame({
  children,
  chrome = true,
}: {
  children: ReactNode;
  chrome?: boolean;
}) {
  return (
    <div className="flex min-h-screen justify-center">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-background shadow-[0_0_60px_-20px_rgba(30,20,80,0.5)]">
        {chrome ? <TopBar /> : null}
        <main className="flex-1 overflow-x-hidden">{children}</main>
        {chrome ? <BottomNav /> : null}
      </div>
    </div>
  );
}
