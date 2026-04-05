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
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg h-full">
        <CardContent className="p-5 h-full">
          <div className="flex gap-5">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              {showPlaceholder ? (
                <div className="flex h-32 w-20 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
                  <BookOpen className="h-8 w-8 text-zinc-400" />
                </div>
              ) : (
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="h-32 w-20 rounded object-cover shadow-sm"
                />
              )}
            </div>

            {/* Book Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2 text-base">
                      {book.title}
                    </h3>
                    {/* Lending Status Badges */}
                    {(book as any).status === 'on_loan' && (
                      <Badge variant="secondary" className="ml-0 text-xs">
                        On Loan
                      </Badge>
                    )}
                    {(book as any).status === 'borrowed' && (book as any).borrowedFrom && (
                      <Badge variant="outline" className="ml-0 text-xs">
                        Borrowed from {(book as any).borrowedFrom}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {book.author}
                  </p>
                  {book.publicationYear && (
                    <span className="text-xs text-zinc-400 mt-1 inline-block">
                      {book.publicationYear}
                    </span>
                  )}
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(book)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Genres */}
              {parsedGenres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {parsedGenres.slice(0, 3).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="text-xs px-2 py-0.5"
                    >
                      {genre}
                    </Badge>
                  ))}
                  {parsedGenres.length > 3 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
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
