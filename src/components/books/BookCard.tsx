"use client";

import { Book } from "@/server/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, BookOpen } from "lucide-react";
import { trpc } from "@/client/trpc";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookCardProps {
  book: Book & { genres?: string[] | string };
  onEdit?: (book: Book & { genres?: string[] | string }) => void;
}

export function BookCard({ book, onEdit }: BookCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const utils = trpc.useUtils();

  const deleteBook = trpc.books.delete.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
    },
  });

  const handleDelete = async () => {
    await deleteBook.mutateAsync({ id: book.id });
    setShowDeleteDialog(false);
  };

  // Smart genre filtering - removes junk, duplicates, category slugs
  const parsedGenres: string[] = (() => {
    const rawGenres = Array.isArray(book.genres)
      ? book.genres
      : book.genres
        ? JSON.parse(book.genres)
        : [];

    const junkWords = new Set(['etc.', 'and', 'the', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    const seen = new Set<string>();

    return rawGenres
      .filter((g: string) => {
        if (!g || typeof g !== 'string') return false;
        const trimmed = g.trim();
        if (trimmed.length === 0) return false;
        if (trimmed.length < 2) return false;
        if (junkWords.has(trimmed.toLowerCase())) return false;
        if (trimmed.includes('/')) return false; // Category slugs
        if (trimmed.startsWith('effect of')) return false;
        return true;
      })
      .map((g: string) => g.trim())
      .filter((g: string) => {
        const lower = g.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .slice(0, 8); // Show max 8 genres on card
  })();

  // Default cover placeholder
  const coverUrl = book.coverUrl || undefined;
  const showPlaceholder = !book.coverUrl;

  // Determine loan status
  const isOnLoan = book.status === 'on_loan';
  const isBorrowed = book.status === 'borrowed' && book.borrowedFrom;

  return (
    <>
      <Card
        className="group overflow-hidden transition-all hover:shadow-md h-full cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative"
        onClick={() => router.push(`/book/${book.id}`)}
      >
        <CardContent className="p-3 md:p-5 h-full">
          {/* Desktop: Horizontal layout, Mobile: Vertical layout */}
          <div className="flex md:gap-5 gap-3 flex-col md:flex-row h-full">
            {/* Cover Image - Smaller on mobile */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              {showPlaceholder ? (
                <div className="flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 h-28 w-20 md:h-32 md:w-20">
                  <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-zinc-400" />
                </div>
              ) : (
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="rounded object-cover shadow-sm h-28 w-20 md:h-32 md:w-20"
                />
              )}
            </div>

            {/* Book Info */}
            <div className="min-w-0 flex-1 text-center md:text-left flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 text-sm md:text-base">
                    {book.title}
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {book.author}
                  </p>
                  {book.publicationYear && (
                    <span className="text-[10px] md:text-xs text-zinc-400 mt-1 inline-block">
                      {book.publicationYear}
                    </span>
                  )}
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/book/${book.id}`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(book);
                      }}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Quick Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Spacer to push status to bottom */}
              <div className="flex-1"></div>

              {/* Loan Status - Bottom left */}
              <div className="text-left mt-2">
                {isOnLoan && (
                  <span className="inline-block px-2 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded uppercase tracking-wide">
                    On Loan
                  </span>
                )}
                {!isOnLoan && !isBorrowed && (
                  <span className="inline-block px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded uppercase tracking-wide">
                    Available
                  </span>
                )}
                {isBorrowed && (
                  <span className="inline-block px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded uppercase tracking-wide">
                    Borrowed
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{book.title}&quot; by {book.author}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
