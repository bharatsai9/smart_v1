import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ParkingSquare,
  Layers,
  Car,
  History,
  CreditCard,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

function SidebarLink({ item, location, onClick }: { item: typeof navItems[0]; location: string; onClick?: () => void }) {
  const isActive = location === item.href;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-white/15 text-white shadow-sm"
          : "text-slate-400 hover:text-white hover:bg-white/10"
      )}
    >
      <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-indigo-300")} />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="ml-auto h-4 w-4 text-indigo-300" />}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = useMemo(
    () => [
      {
        href: "/",
        label: user?.role === "admin" ? "Operations" : "My parking",
        icon: LayoutDashboard,
      },
      { href: "/book", label: "Book slot", icon: ParkingSquare },
      { href: "/levels", label: "Level map", icon: Layers },
      { href: "/my-car", label: "Find my car", icon: Car },
      {
        href: "/history",
        label: user?.role === "admin" ? "All bookings" : "My bookings",
        icon: History,
      },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
    [user?.role],
  );

  const currentPage = navItems.find((n) => n.href === location)?.label ?? "Parking System";

  return (
    <div className="min-h-screen flex bg-[#F8F7F4] font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1E2535] sticky top-0 self-start h-screen overflow-y-auto">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl shadow">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-lg tracking-tight leading-none">SmartPark</div>
              <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">Management System</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} location={location} />
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 space-y-3">
          {user && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {user.role === "admin" ? (
                <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              ) : (
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate font-mono">{user.username}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 capitalize">{user.role}</span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
          <div className="text-xs text-slate-500">College Campus Parking</div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#1E2535] flex flex-col transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl shadow">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div className="font-bold text-white text-lg">SmartPark</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} location={location} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 md:hidden">
          {user && (
            <div className="text-xs text-slate-400 mb-2 font-mono">
              {user.username} · {user.role}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400"
            onClick={() => {
              logout();
              setMobileOpen(false);
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 h-16 flex items-center gap-4 shadow-sm">
          <button
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-semibold text-slate-900 text-base leading-none">{currentPage}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Smart Multi-Level Parking System</p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
