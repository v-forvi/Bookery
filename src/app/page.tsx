"use client";

import { useState } from "react";
import { BookList } from "@/components/books/BookList";
import { LoanOutModal } from '@/components/lending/LoanOutModal';
import { ReturnModal } from '@/components/lending/ReturnModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Menu } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [gridColumns, setGridColumns] = useState<4 | 6>(4);
  const [loanOutOpen, setLoanOutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Bookery
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Phase 1: Knowledge Graph
              </p>
            </div>

            <nav className="flex items-center gap-2">
              <Link href="/graph">
                <Button variant="ghost" size="sm">
                  View Graph
                </Button>
              </Link>
              <Link href="/scan">
                <Button variant="ghost" size="sm">
                  Scan Book
                </Button>
              </Link>
              <Link href="/archive">
                <Button variant="ghost" size="sm">
                  Archive
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/settings">API Settings</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 transition-all duration-300 ${
        gridColumns === 4 ? 'max-w-[1800px]' : 'max-w-[2600px]'
      }`}>
        <div className="mb-6">
          <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-50">
            Your Library
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your personal book collection
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-6">
          <Button onClick={() => setLoanOutOpen(true)}>
            Loan Out Book
          </Button>
          <Button onClick={() => setReturnOpen(true)} variant="outline">
            Return Book
          </Button>
        </div>

        <BookList gridColumns={gridColumns} setGridColumns={setGridColumns} />
      </main>

      {/* Lending Modals */}
      <LoanOutModal
        isOpen={loanOutOpen}
        onClose={() => setLoanOutOpen(false)}
        onSuccess={() => {
          // Refresh will be handled by the modal's internal logic
          window.location.reload();
        }}
      />

      <ReturnModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onSuccess={() => {
          // Refresh will be handled by the modal's internal logic
          window.location.reload();
        }}
      />
    </div>
  );
}
