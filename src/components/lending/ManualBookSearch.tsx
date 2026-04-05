'use client';

import { useState } from 'react';
import { api } from '@/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { Book } from '@/server/schema';

interface ManualBookSearchProps {
  onSelect: (book: Book) => void;
  onCancel: () => void;
}

export function ManualBookSearch({ onSelect, onCancel }: ManualBookSearchProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Book[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setSearching(true);
    setSearched(true);

    try {
      const result = await api.loans.searchBook.query({ query });
      setResults(result);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Enter book title or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          autoFocus
        />

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={query.trim().length < 2 || searching}
            className="flex-1"
          >
            {searching ? (
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

      {searched && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No books found. Try different search terms or add this book first.
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
