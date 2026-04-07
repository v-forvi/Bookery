"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/client/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Calendar, User, ArrowLeft, Edit, Trash2, CheckCircle, ArrowUpDown, Hand } from "lucide-react";
import { LoanOutModal } from "@/components/lending/LoanOutModal";
import { ReturnModal } from "@/components/lending/ReturnModal";
import { EditBookModal } from "@/components/books/EditBookModal";
import { PatronOnly, LibrarianOnly } from "@/components/RoleGuard";
import { usePatronAuth } from "@/components/PatronAuthContext";
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

type LoanRecord = {
  id: number;
  loanType: string;
  personName: string;
  loanDate: string;
  returnDate: string | null;
  notes: string | null;
  returnNotes: string | null;
  createdAt: string | null;
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const { patron, isRegistered, isLibrarian } = usePatronAuth();
  const isPatron = isRegistered && !isLibrarian;
  const currentPatronId = patron?.id;

  const [loanOutOpen, setLoanOutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: book, isLoading: bookLoading } = trpc.books.byId.useQuery(
    { id: bookId },
    { enabled: !isNaN(bookId) }
  );

  const { data: activeLoan } = trpc.loans.getActiveLoanForBook.useQuery(
    { bookId },
    { enabled: !isNaN(bookId) }
  );

  const { data: loanHistory, isLoading: historyLoading } = trpc.loans.getHistory.useQuery(
    { bookId, limit: 50 },
    { enabled: !isNaN(bookId) }
  );

  const utils = trpc.useUtils();
  const deleteBook = trpc.books.delete.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  const requestBorrowMutation = trpc.loanRequests.requestBorrow.useMutation({
    onSuccess: () => {
      alert("Borrow request sent! The librarian will confirm your request.");
      utils.loanRequests.getMyActiveLoans.invalidate();
      utils.books.byId.invalidate({ id: bookId });
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  if (isNaN(bookId)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-500">Invalid book ID</p>
      </div>
    );
  }

  if (bookLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-500">Book not found</p>
      </div>
    );
  }

  // Smart genre filtering - removes junk, duplicates, category slugs
  const parsedGenres: string[] = (() => {
    const rawGenres = Array.isArray(book.genres)
      ? book.genres
      : book.genres
        ? JSON.parse(book.genres)
        : [];

    // Filter and clean genres
    const junkWords = new Set(['etc.', 'and', 'the', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    const seen = new Set<string>();

    return rawGenres
      .filter((g: string) => {
        if (!g || typeof g !== 'string') return false;
        const trimmed = g.trim();
        if (trimmed.length === 0) return false;
        if (trimmed.length < 2) return false; // Single letters
        if (junkWords.has(trimmed.toLowerCase())) return false;
        if (trimmed.includes('/')) return false; // Category slugs like "SCIENCE / Life Sciences"
        if (trimmed.startsWith('effect of')) return false; // Incomplete phrases
        return true;
      })
      .map((g: string) => g.trim())
      .filter((g: string) => {
        // Remove duplicates (case-insensitive)
        const lower = g.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      })
      .slice(0, 15); // Limit to top 15 genres
  })();

  const handleDelete = async () => {
    await deleteBook.mutateAsync({ id: book.id });
    setShowDeleteDialog(false);
  };

  const getStatusBadge = () => {
    if (book.status === 'on_loan') {
      return <Badge variant="secondary" className="text-xs text-zinc-900 dark:text-zinc-100">On Loan</Badge>;
    }
    if (book.status === 'borrowed' && book.borrowedFrom) {
      return <Badge variant="outline" className="text-xs text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700">Borrowed from {book.borrowedFrom}</Badge>;
    }
    return <Badge variant="default" className="text-xs bg-green-600 text-white">Available</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Book Info Card */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Cover */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-28 h-40 md:w-32 md:h-48 rounded object-cover shadow-md"
                  />
                ) : (
                  <div className="w-28 h-40 md:w-32 md:h-48 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-zinc-400" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-2 md:space-y-3 text-center md:text-left w-full">
                <div>
                  <div className="flex items-start gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {book.title}
                    </h1>
                    {getStatusBadge()}
                  </div>
                  <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">
                    by {book.author}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                  {book.publicationYear && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {book.publicationYear}
                    </span>
                  )}
                  {book.publisher && (
                    <span>{book.publisher}</span>
                  )}
                  {book.pageCount && (
                    <span>{book.pageCount} pages</span>
                  )}
                  {book.isbn && (
                    <span>ISBN: {book.isbn}</span>
                  )}
                </div>

                {/* Genres */}
                {parsedGenres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {parsedGenres.map((genre) => (
                      <Badge key={genre} variant="outline" className="text-xs text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description */}
                {book.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-4">
                    {book.description}
                  </p>
                )}

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* Patron: Request Borrow button */}
                  <PatronOnly>
                    {book.ownership === 'owned' && book.status === 'available' && (
                      <Button
                        size="sm"
                        onClick={() => requestBorrowMutation.mutate({ bookId: book.id, requestType: 'borrow' })}
                        disabled={requestBorrowMutation.isPending}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Hand className="h-4 w-4 mr-1" />
                        {requestBorrowMutation.isPending ? "Requesting..." : "Request to Borrow"}
                      </Button>
                    )}
                  </PatronOnly>

                  {/* Librarian: Loan Out and Edit/Delete buttons */}
                  <LibrarianOnly>
                    {book.ownership === 'owned' && book.status === 'available' && (
                      <Button
                        size="sm"
                        onClick={() => setLoanOutOpen(true)}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Loan Out
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowEditModal(true)}
                      className="text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </LibrarianOnly>

                  {/* Return button logic */}
                  {book.status === 'on_loan' && (
                    <>
                      {/* Show Return button to librarians OR the patron who borrowed it */}
                      {(isLibrarian || activeLoan?.borrowerId === currentPatronId) ? (
                        <Button
                          size="sm"
                          onClick={() => setReturnOpen(true)}
                          className="bg-green-600 text-white hover:bg-green-700 border-0"
                        >
                          Return
                        </Button>
                      ) : (
                        /* Other patrons see "On Loan" status in red */
                        <Badge variant="destructive" className="text-sm py-1 px-3">
                          On Loan
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loan History Card */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Loan History
            </h2>

            {historyLoading ? (
              <p className="text-zinc-500 text-sm">Loading history...</p>
            ) : !loanHistory?.loans || loanHistory.loans.length === 0 ? (
              <p className="text-zinc-500 text-sm">No loan history for this book.</p>
            ) : (
              <div className="space-y-3">
                {loanHistory.loans.map((loan: LoanRecord) => (
                  <div
                    key={loan.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 md:p-4 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {loan.loanType === 'out' ? (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                Loaned Out
                              </Badge>
                              <span className="text-sm">
                                to <span className="font-medium">{loan.personName}</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-xs">
                                Borrowed
                              </Badge>
                              <span className="text-sm">
                                from <span className="font-medium">{loan.personName}</span>
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 text-xs text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Out: {formatDate(loan.loanDate)}
                          </span>
                          {loan.returnDate && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Back: {formatDate(loan.returnDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!loan.returnDate && (
                        <Badge variant="default" className="text-xs bg-amber-500 self-start">
                          Active
                        </Badge>
                      )}
                    </div>
                    {(loan.notes || loan.returnNotes) && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        {loan.notes && (
                          <p><span className="font-medium">Notes:</span> {loan.notes}</p>
                        )}
                        {loan.returnNotes && (
                          <p><span className="font-medium">Return notes:</span> {loan.returnNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      <LoanOutModal
        isOpen={loanOutOpen}
        onClose={() => setLoanOutOpen(false)}
        onSuccess={() => {
          setLoanOutOpen(false);
          utils.books.byId.invalidate({ id: bookId });
          utils.loans.getHistory.invalidate({ bookId });
        }}
        preselectedBook={book}
      />

      <ReturnModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onSuccess={() => {
          setReturnOpen(false);
          utils.books.byId.invalidate({ id: bookId });
          utils.loans.getHistory.invalidate({ bookId });
        }}
        preselectedBook={book}
      />

      {/* Delete Confirmation */}
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

      {/* Edit Modal */}
      {showEditModal && (
        <EditBookModal
          book={book}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
