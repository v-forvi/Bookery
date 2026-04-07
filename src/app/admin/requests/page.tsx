"use client";

/**
 * Librarian Request Queue Page
 *
 * Shows pending borrow/return requests for librarian approval.
 * Part of the no-scan borrowing model.
 */

import { trpc } from "@/client/trpc";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { LibrarianOnly } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Check, X, BookOpen, User, Clock, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export default function RequestsPage() {
  const { isLibrarian } = usePatronAuth();
  const { data: requests, isLoading, refetch } = trpc.loanRequests.getPending.useQuery(undefined, {
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const confirmMutation = trpc.loanRequests.confirm.useMutation({
    onSuccess: () => refetch(),
  });

  const rejectMutation = trpc.loanRequests.reject.useMutation({
    onSuccess: () => refetch(),
  });

  const handleConfirm = (requestId: number) => {
    if (confirm("Confirm this request?")) {
      confirmMutation.mutate({ requestId });
    }
  };

  const handleReject = (requestId: number) => {
    if (confirm("Reject this request?")) {
      rejectMutation.mutate({ requestId });
    }
  };

  if (!isLibrarian) {
    return (
      <LibrarianOnly>
        <div />
      </LibrarianOnly>
    );
  }

  const pendingRequests = requests || [];

  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Request Queue</h1>
        <p className="text-muted-foreground">
          {pendingRequests.length === 0
            ? "No pending requests."
            : `${pendingRequests.length} pending request${pendingRequests.length === 1 ? '' : 's'}`}

        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">All Caught Up</h2>
            <p className="text-muted-foreground">No pending requests to process.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(({ request, loan, book }) => {
            const isBorrow = request.requestType === 'borrow';
            const timeAgo = formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true });

            return (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Book cover */}
                    {book?.coverUrl && (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-24 h-36 object-cover rounded flex-shrink-0"
                      />
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{book?.title}</h3>
                          <p className="text-sm text-muted-foreground">{book?.author}</p>
                        </div>
                        <Badge variant={isBorrow ? "default" : "secondary"} className="flex-shrink-0">
                          {isBorrow ? (
                            <>
                              <ArrowDownToLine className="h-3 w-3 mr-1" />
                              Borrow
                            </>
                          ) : (
                            <>
                              <ArrowUpFromLine className="h-3 w-3 mr-1" />
                              Return
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{loan?.personName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{timeAgo}</span>
                        </div>
                      </div>

                      {request.notes && (
                        <p className="text-sm italic text-muted-foreground mb-4">
                          Note: {request.notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(request.id)}
                          disabled={confirmMutation.isPending}
                          className="flex-1 md:flex-none"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={rejectMutation.isPending}
                          className="flex-1 md:flex-none"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <a
                          href={`/book/${book?.id}`}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 bg-transparent shadow-sm hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 px-4 py-2 flex-1 md:flex-none"
                        >
                          View Book
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
