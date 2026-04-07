"use client";

/**
 * My Loans Page
 *
 * Shows current patron's active loans with ability to request returns.
 * Part of the no-scan borrowing model.
 */

import { trpc } from "@/client/trpc";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, Calendar } from "lucide-react";

export default function MyLoansPage() {
  const { patron, isRegistered, isLibrarian } = usePatronAuth();
  const isPatron = isRegistered && !isLibrarian;
  const { data: myLoans, isLoading, refetch } = trpc.loanRequests.getMyActiveLoans.useQuery();

  const requestReturnMutation = trpc.loanRequests.requestReturnByLoanId.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleRequestReturn = (loanId: number) => {
    if (confirm("Request to return this book? The librarian will need to confirm.")) {
      requestReturnMutation.mutate({ loanId });
    }
  };

  if (!isPatron) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Patron Access Required</h2>
            <p className="text-muted-foreground">This page is only available to registered patrons.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pb-20">
        <h1 className="text-2xl font-bold mb-6">My Loans</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const loans = myLoans || [];

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Loans</h1>
        <p className="text-muted-foreground">
          {loans.length === 0
            ? "You don't have any books checked out."
            : `You have ${loans.length} book${loans.length === 1 ? '' : 's'} checked out.`}
        </p>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Loans</h2>
            <p className="text-muted-foreground mb-4">
              Browse the catalog to find books you'd like to borrow.
            </p>
            <Button>
              <a href="/" className="text-white no-underline">Browse Catalog</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loans.map(({ loan, book }) => (
            <Card key={loan.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex gap-3">
                  {book?.coverUrl && (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-2">{book?.title}</CardTitle>
                    <CardDescription className="text-sm">{book?.author}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Since {new Date(loan.loanDate).toLocaleDateString()}</span>
                  </div>
                  {loan.notes && (
                    <p className="text-xs text-muted-foreground italic">{loan.notes}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleRequestReturn(loan.id)}
                  disabled={requestReturnMutation.isPending}
                >
                  Request Return
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
