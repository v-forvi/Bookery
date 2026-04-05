"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/client/trpc";
import { BookCard } from "./BookCard";
import { AddBookDialog } from "./AddBookDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, Download, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Book } from "@/server/schema";
import { EditBookModal } from "./EditBookModal";

type SortOption = 'titleAsc' | 'titleDesc' | 'authorAsc' | 'authorDesc' | 'genre' | 'recent' | 'random';

interface GenreFilterProps {
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  genres: string[];
}

interface BookListProps {
  gridColumns: 4 | 6;
  setGridColumns: (cols: 4 | 6) => void;
}

function GenreFilter({ selectedGenre, onSelectGenre, genres }: GenreFilterProps) {
  return (
    <Select
      value={selectedGenre || "all"}
      onValueChange={(value) => onSelectGenre(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by genre" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Genres</SelectItem>
        {genres.map((genre) => (
          <SelectItem key={genre} value={genre}>
            {genre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BookList({ gridColumns, setGridColumns }: BookListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [editingBook, setEditingBook] = useState<(Book & { genres?: string[] }) | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.books.list.useQuery({
    search: searchQuery || undefined,
    genre: selectedGenre || undefined,
  });

  const books = data || [];

  // Extract all unique genres from books
  const allGenres = Array.from(
    new Set(
      books.flatMap((book) => {
        const genres = typeof book.genres === 'string' ? JSON.parse(book.genres || '[]') : book.genres || [];
        return genres;
      })
    )
  ).sort();

  // Sort books
  const sortedBooks = useMemo(() => {
    const toSort = [...books];
    if (sortBy === 'random') {
      const shuffled = [...toSort];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return toSort.sort((a, b) => {
      switch (sortBy) {
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'authorAsc':
          return a.author.localeCompare(b.author);
        case 'authorDesc':
          return b.author.localeCompare(a.author);
        case 'genre':
          const aGenres = typeof a.genres === 'string' ? JSON.parse(a.genres || '[]') : a.genres || [];
          const bGenres = typeof b.genres === 'string' ? JSON.parse(b.genres || '[]') : b.genres || [];
          const aGenre = (aGenres[0] || 'No Genre').toLowerCase();
          const bGenre = (bGenres[0] || 'No Genre').toLowerCase();
          return aGenre.localeCompare(bGenre);
        case 'recent':
          const aDate = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          const bDate = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          return bDate - aDate;
        default:
          return 0;
      }
    });
  }, [books, sortBy]);

  const handleExport = async (format: "csv" | "json") => {
    // This would use the books.export endpoint
    const blob = new Blob([
      format === "json"
        ? JSON.stringify(data, null, 2)
        : "id,title,author,isbn\n" +
          (data || [])
            .map(
              (b) =>
                `${b.id},"${b.title}","${b.author}",${b.isbn || ""}`
            )
            .join("\n")
    ], {
      type: format === "json" ? "application/json" : "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biblio-export-${format}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Grid Column Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setGridColumns(4)}
              className={`px-3 py-1 rounded text-sm ${
                gridColumns === 4 ? "bg-white dark:bg-zinc-700 shadow font-medium" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              4 cols
            </button>
            <button
              onClick={() => setGridColumns(6)}
              className={`px-3 py-1 rounded text-sm ${
                gridColumns === 6 ? "bg-white dark:bg-zinc-700 shadow font-medium" : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              6 cols
            </button>
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                Recently Added
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('titleAsc')}>
                Title (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('titleDesc')}>
                Title (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('authorAsc')}>
                Author (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('genre')}>
                Genre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('random')}>
                Random
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {allGenres.length > 0 && (
            <GenreFilter
              selectedGenre={selectedGenre}
              onSelectGenre={setSelectedGenre}
              genres={allGenres}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AddBookDialog />
        </div>
      </div>

      {/* Books Grid - 5 columns */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      ) : sortedBooks.length > 0 ? (
        <>
          <div className={`grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${
            gridColumns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
          }`}>
            {sortedBooks.map((book) => (
              <BookCard key={book.id} book={book} onEdit={setEditingBook} />
            ))}
          </div>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Showing {sortedBooks.length} book{sortedBooks.length !== 1 ? "s" : ""}
          </p>
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            No books found
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {searchQuery || selectedGenre
              ? "Try adjusting your search or filters"
              : "Get started by adding your first book."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {!searchQuery && !selectedGenre && <AddBookDialog />}
            {(searchQuery || selectedGenre) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre(null);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <EditBookModal
          book={editingBook}
          isOpen={!!editingBook}
          onClose={() => setEditingBook(null)}
        />
      )}
    </div>
  );
}
