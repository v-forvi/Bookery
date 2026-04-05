'use client';

import { useState } from 'react';
import { trpc as api } from '@/client/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Archive } from 'lucide-react';

export default function ArchivePage() {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = api.loans.getArchive.useQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Archive className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Borrowed Books Archive</h1>
      </div>

      {!data || data.books.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No borrowed books have been returned and archived yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            {data.total} {data.total === 1 ? 'book' : 'books'} archived
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.books.map((book: any) => (
              <Card key={book.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{book.title}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                    </div>
                    <Badge variant="outline">Returned</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Borrowed from:</span>{' '}
                      {book.borrowedFrom}
                    </p>
                    {book.archivedAt && (
                      <p>
                        <span className="font-medium">Returned:</span>{' '}
                        {new Date(book.archivedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                variant="outline"
              >
                Previous
              </Button>
              <span className="flex items-center">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
