"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Network, Scan, Settings, Archive, Shield, BookOpen, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibrarianOnly, PatronOnly } from "./RoleGuard";

const navItems = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Graph",
    href: "/graph",
    icon: Network,
  },
  // Scan is now librarian-only
  {
    name: "Archive",
    href: "/archive",
    icon: Archive,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

// Librarian-only scan button (primary, centered)
const librarianScanItem = {
  name: "Scan",
  href: "/scan",
  icon: Scan,
  primary: true,
};

const librarianNavItems = [
  {
    name: "Admin",
    href: "/admin/patrons",
    icon: Shield,
  },
  {
    name: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
  },
];

const patronNavItems = [
  {
    name: "My Loans",
    href: "/my-loans",
    icon: BookOpen,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNav = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16 pb-safe">
        {/* Regular nav items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => handleNav(item.href)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full min-w-0 bg-transparent border-0",
                "active:scale-95 transition-transform duration-100 cursor-pointer"
              )}
            >
              <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12",
                    isActive
                      ? "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium mt-0.5",
                    isActive
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {item.name}
                </span>
              </div>
            </button>
          );
        })}

        {/* Librarian-only Scan button (centered, primary) - always visible to actual librarians */}
        <LibrarianOnly actual={true}>
          <button
            onClick={() => handleNav(librarianScanItem.href)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full min-w-0 bg-transparent border-0",
              "active:scale-95 transition-transform duration-100 cursor-pointer"
            )}
          >
            <div className="flex flex-col items-center justify-center relative -mt-6">
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
                  pathname === librarianScanItem.href
                    ? "bg-purple-700 text-white"
                    : "bg-gradient-to-br from-purple-600 to-purple-700 text-white"
                )}
              >
                <librarianScanItem.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
            </div>
          </button>
        </LibrarianOnly>

        {/* Librarian-only nav items - always visible to actual librarians */}
        <LibrarianOnly actual={true}>
          {librarianNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full min-w-0 bg-transparent border-0",
                  "active:scale-95 transition-transform duration-100 cursor-pointer"
                )}
              >
                <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12",
                      isActive
                        ? "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950"
                        : "text-purple-500 dark:text-purple-400"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium mt-0.5",
                      isActive
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-purple-500 dark:text-purple-400"
                    )}
                  >
                    {item.name}
                  </span>
                </div>
              </button>
            );
          })}
        </LibrarianOnly>

        {/* Patron-only nav items */}
        <PatronOnly>
          {patronNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full min-w-0 bg-transparent border-0",
                  "active:scale-95 transition-transform duration-100 cursor-pointer"
                )}
              >
                <div className="flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12">
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg min-w-12 min-h-12",
                      isActive
                        ? "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950"
                        : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium mt-0.5",
                      isActive
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    {item.name}
                  </span>
                </div>
              </button>
            );
          })}
        </PatronOnly>
      </div>

      {/* Safe area padding for iOS */}
      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}
