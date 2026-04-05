"use client";

import { useState } from "react";
import { BookList } from "@/components/books/BookList";
import { LoanOutModal } from '@/components/lending/LoanOutModal';
import { ReturnModal } from '@/components/lending/ReturnModal';
import { AddBookDialog } from '@/components/books/AddBookDialog';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/client/trpc";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export default function Home() {
  const [loanOutOpen, setLoanOutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const utils = trpc.useUtils();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20 md:pb-0">
      {/* Header - Simplified on mobile since we have bottom nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Bookery
              </h1>
            </div>

            {/* Desktop nav - hide on mobile */}
            <nav className="hidden md:flex items-center gap-2">
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
              <AddBookDialog />
              <PWAInstallButton />
            </nav>

            {/* Mobile Add Book button - replaces useless menu */}
            <div className="md:hidden">
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
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        {/* Quick Actions - Hide on mobile since they're in bottom nav/scan */}
        <div className="hidden md:flex gap-2 mb-6">
          <Button onClick={() => setLoanOutOpen(true)}>
            Loan Out Book
          </Button>
          <Button onClick={() => setReturnOpen(true)} variant="outline">
            Return Book
          </Button>
        </div>

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
