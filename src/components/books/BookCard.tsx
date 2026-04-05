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

  // Parse genres - handle both string and array
  const parsedGenres: string[] = Array.isArray(book.genres)
    ? book.genres
    : book.genres
      ? JSON.parse(book.genres)
      : [];

  // Default cover placeholder
  const coverUrl = book.coverUrl || undefined;
  const showPlaceholder = !book.coverUrl;

  return (
    <>
      <Card
        className="group overflow-hidden transition-shadow hover:shadow-lg h-full cursor-pointer"
        onClick={() => router.push(`/book/${book.id}`)}
      >
        <CardContent className="p-3 md:p-5 h-full">
          {/* Desktop: Horizontal layout, Mobile: Vertical layout */}
          <div className="flex md:gap-5 gap-3 flex-col md:flex-row">
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
            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* Lending Status Badges - Show above title on mobile */}
                  {((book as any).status === 'on_loan' || ((book as any).status === 'borrowed' && (book as any).borrowedFrom)) && (
                    <div className="flex md:hidden justify-center mb-1.5 gap-1.5 flex-wrap">
                      {(book as any).status === 'on_loan' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          On Loan
                        </Badge>
                      )}
                      {(book as any).status === 'borrowed' && (book as any).borrowedFrom && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          From {(book as any).borrowedFrom}
                        </Badge>
                      )}
                    </div>
                  )}
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 text-sm md:text-base">
                    {book.title}
                  </h3>
                  {/* Desktop badges inline with title */}
                  <div className="hidden md:flex items-center gap-2 flex-wrap">
                    {(book as any).status === 'on_loan' && (
                      <Badge variant="secondary" className="text-xs">
                        On Loan
                      </Badge>
                    )}
                    {(book as any).status === 'borrowed' && (book as any).borrowedFrom && (
                      <Badge variant="outline" className="text-xs">
                        Borrowed from {(book as any).borrowedFrom}
                      </Badge>
                    )}
                  </div>
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

              {/* Genres - Centered on mobile */}
              {parsedGenres.length > 0 && (
                <div className="mt-2 md:mt-3 flex flex-wrap gap-1 md:gap-1.5 justify-center md:justify-start">
                  {parsedGenres.slice(0, 3).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="text-[10px] md:text-xs px-1.5 md:px-2 py-0"
                    >
                      {genre}
                    </Badge>
                  ))}
                  {parsedGenres.length > 3 && (
                    <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0">
                      +{parsedGenres.length - 3}
                    </Badge>
                  )}
                </div>
              )}
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
