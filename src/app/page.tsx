"use client";

import { useState } from "react";
import { BookList } from "@/components/books/BookList";
import { LoanOutModal } from '@/components/lending/LoanOutModal';
import { ReturnModal } from '@/components/lending/ReturnModal';
import { AddBookDialog } from '@/components/books/AddBookDialog';
import { Button } from "@/components/ui/button";
import { Plus, Shield, Scan } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/client/trpc";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { useTelegram } from "@/components/TelegramProvider";
import { LibrarianOnly, RoleBadge } from "@/components/RoleGuard";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { NotificationBell } from "@/components/NotificationBell";

export default function Home() {
  const [loanOutOpen, setLoanOutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const utils = trpc.useUtils();
  const { isLibrarian, isRegistered } = usePatronAuth();
  const { isTelegram } = useTelegram();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20 md:pb-0">
      {/* Header - Simplified on mobile since we have bottom nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Bookery
                </h1>
                {/* Last updated: 2025-04-08 */}
                {/* Show role badge in Telegram Mini App */}
                {isTelegram && isRegistered && (
                  <RoleBadge className="mt-1" />
                )}
              </div>
            </div>

            {/* Desktop nav - hide on mobile */}
            <nav className="hidden md:flex items-center gap-2">
              <LibrarianOnly>
                <Link href="/scan">
                  <Button variant="default" size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Scan className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                </Link>
              </LibrarianOnly>
              <Link href="/graph">
                <Button variant="ghost" size="sm">
                  View Graph
                </Button>
              </Link>
              <Link href="/archive">
                <Button variant="ghost" size="sm">
                  Archive
                </Button>
              </Link>

              {/* Role switcher for librarians */}
              <RoleSwitcher />

              {/* Notification bell for registered users */}
              <NotificationBell />

              {/* Librarian-only admin link and Add book */}
              <LibrarianOnly>
                <Link href="/admin/patrons">
                  <Button variant="ghost" size="sm" className="text-purple-600">
                    <Shield className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </Link>
                <AddBookDialog />
              </LibrarianOnly>

              <PWAInstallButton />
            </nav>

            {/* Mobile actions */}
            <div className="md:hidden flex items-center gap-2">
              {/* Role switcher for librarians on mobile */}
              <RoleSwitcher />

              {/* Notification bell for registered users on mobile */}
              <NotificationBell />

              {/* Librarian admin indicator and Add book on mobile */}
              <LibrarianOnly>
                <Link href="/admin/patrons">
                  <button
                    type="button"
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-purple-600 dark:text-purple-400"
                  >
                    <Shield className="h-5 w-5" />
                  </button>
                </Link>
                <AddBookDialog
                  trigger={({ setOpen }) => (
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                    >
                      <Plus className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                  )}
                />
              </LibrarianOnly>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        {/* Quick Actions - Hide on mobile since they're in bottom nav/scan */}
        <LibrarianOnly>
          <div className="hidden md:flex gap-2 mb-6">
            <Link href="/scan">
              <Button>
                <Scan className="h-4 w-4 mr-1" />
                Scan Book
              </Button>
            </Link>
            <Button onClick={() => setLoanOutOpen(true)}>
              Loan Out Book
            </Button>
            <Button onClick={() => setReturnOpen(true)} variant="outline">
              Return Book
            </Button>
            <Link href="/admin/patrons">
              <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                <Shield className="h-4 w-4 mr-1" />
                Manage Patrons
              </Button>
            </Link>
          </div>
        </LibrarianOnly>

        <BookList gridColumns={4} setGridColumns={() => {}} />
      </main>

      {/* Lending Modals */}
      <LoanOutModal
        isOpen={loanOutOpen}
        onClose={() => setLoanOutOpen(false)}
        onSuccess={() => {
          setLoanOutOpen(false);
          utils.books.list.invalidate();
          utils.loans.getActive.invalidate();
        }}
      />

      <ReturnModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onSuccess={() => {
          setReturnOpen(false);
          utils.books.list.invalidate();
          utils.loans.getActive.invalidate();
        }}
      />
    </div>
  );
}
