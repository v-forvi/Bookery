'use client';

import { useState } from 'react';
import { trpc as api } from '@/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { Book } from '@/server/schema';

interface ManualBookSearchProps {
  onSelect: (book: Book) => void;
  onCancel: () => void;
}

export function ManualBookSearch({ onSelect, onCancel }: ManualBookSearchProps) {
  const [searchInput, setSearchInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const utils = api.useUtils();

  // Use the query reactively - it will fetch when enabled is true
  const { data: results = [], isLoading, refetch } = api.loans.searchBook.useQuery(
    { query: searchInput },
    {
      enabled: false, // Only fetch when we explicitly call refetch
      retry: false,
    }
  );

  const handleSearch = async () => {
    if (searchInput.trim().length < 2) return;

    setHasSearched(true);
    await refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Show results after user has searched
  const showResults = hasSearched || results.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Enter book title or author..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyPress}
          autoFocus
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={searchInput.trim().length < 2 || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Database
              </>
            )}
          </Button>

          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>

      {showResults && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {isLoading ? 'Searching...' : 'No books found. Try different search terms or add this book first.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelect(book)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <p className="font-medium">{book.title}</p>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
