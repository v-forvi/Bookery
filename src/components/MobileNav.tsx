"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Network, Scan, Settings, Archive, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibrarianOnly } from "./RoleGuard";

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
  {
    name: "Scan",
    href: "/scan",
    icon: Scan,
    primary: true, // Highlight the scan button
  },
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

const librarianNavItems = [
  {
    name: "Admin",
    href: "/admin/patrons",
    icon: Shield,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full min-w-0",
                "active:scale-95 transition-transform duration-100"
              )}
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center",
                  item.primary
                    ? "relative -mt-6"
                    : ""
                )}
              >
                {item.primary ? (
                  // Primary scan button - larger with gradient background
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
                      isActive
                        ? "bg-purple-700 text-white"
                        : "bg-gradient-to-br from-purple-600 to-purple-700 text-white"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                ) : (
                  // Regular nav item
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
                )}
                {!item.primary && (
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
                )}
              </div>
            </Link>
          );
 })}

        {/* Librarian-only nav items */}
        <LibrarianOnly>
          {librarianNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full min-w-0",
                  "active:scale-95 transition-transform duration-100"
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
              </Link>
            );
          })}
        </LibrarianOnly>
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
