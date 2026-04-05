"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/client/trpc";
import { BookCard } from "./BookCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddBookDialog } from "./AddBookDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, Download, ArrowUpDown, Plus, Filter, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Book } from "@/server/schema";
import { EditBookModal } from "./EditBookModal";
import { cn } from "@/lib/utils";

type SortOption = 'titleAsc' | 'titleDesc' | 'authorAsc' | 'authorDesc' | 'genre' | 'recent' | 'random';

type BookWithParsedGenres = Book & { genres?: string[] };

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
      <SelectTrigger className="w-full sm:w-[180px]">
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
  const [editingBook, setEditingBook] = useState<BookWithParsedGenres | null>(null);
  // Lending feature filters
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'borrowed'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_loan' | 'borrowed'>('all');
  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  const utils = trpc.useUtils();

  // Use separate state for actual search (only applied when user presses Enter or clicks Search)
  const [activeSearch, setActiveSearch] = useState("");

  const { data, isLoading } = trpc.books.list.useQuery({
    search: activeSearch || undefined,
    genre: selectedGenre || undefined,
    ownership: ownershipFilter === 'all' ? undefined : ownershipFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const books = data || [];

  // Client-side state for random sorting to avoid hydration mismatch
  const [shuffledBooks, setShuffledBooks] = useState<BookWithParsedGenres[]>([]);

  // Sort books
  const sortedBooks: BookWithParsedGenres[] = useMemo(() => {
    const toSort = [...books];
    // Parse genres for all books
    const booksWithParsedGenres: BookWithParsedGenres[] = toSort.map((book) => {
      const { genres, ...bookWithoutGenres } = book;
      const parsedGenres = typeof genres === 'string' ? JSON.parse(genres || '[]') : genres || [];
      return {
        ...bookWithoutGenres,
        genres: parsedGenres,
      } as BookWithParsedGenres;
    });
    // Skip random sort during SSR to avoid hydration mismatch
    if (sortBy === 'random') {
      // Return unsorted for SSR, client will shuffle via useEffect
      return booksWithParsedGenres;
    }
    return booksWithParsedGenres.sort((a, b) => {
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

  // Client-side only shuffling for random sort to avoid hydration mismatch
  useEffect(() => {
    if (sortBy === 'random') {
      const toShuffle = [...sortedBooks];
      for (let i = toShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
      }
      setShuffledBooks(toShuffle);
    }
  }, [sortBy, sortedBooks]);

  // Use shuffled books for random sort, sorted books for everything else
  const displayBooks = sortBy === 'random' ? shuffledBooks : sortedBooks;

  // Extract all unique genres from displayBooks
  const allGenres = Array.from(
    new Set(
      displayBooks.flatMap((book) => {
        const genres = typeof book.genres === 'string' ? JSON.parse(book.genres || '[]') : book.genres || [];
        return genres;
      })
    )
  ).sort();

  const handleSearchSubmit = () => {
    setActiveSearch(searchQuery.trim());
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
  };

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

  const activeFilterCount =
    (selectedGenre ? 1 : 0) +
    (ownershipFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Search Bar - Always Visible */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="pl-9 pr-20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 rounded"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          )}
        </div>
        <Button onClick={handleSearchSubmit} size="touch" disabled={isLoading}>
          Search
        </Button>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="flex md:hidden items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters & Sort</span>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
          </div>
        </button>
      </div>

      {/* Filters Section - Collapsible on Mobile */}
      <div className={cn(
        "space-y-4",
        // On mobile, show/hide based on toggle; on desktop, always show
        "md:block",
        !showFilters && "hidden md:block"
      )}>
        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sort</span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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

          {/* Ownership Filter */}
          <Select value={ownershipFilter} onValueChange={(value: any) => setOwnershipFilter(value)}>
            <SelectTrigger className="w-[130px] flex-shrink-0">
              <SelectValue placeholder="Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Books</SelectItem>
              <SelectItem value="owned">Owned</SelectItem>
              <SelectItem value="borrowed">Borrowed</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[130px] flex-shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="on_loan">On Loan</SelectItem>
              <SelectItem value="borrowed">Borrowed</SelectItem>
            </SelectContent>
          </Select>

          {/* Genre Filter */}
          {allGenres.length > 0 && (
            <GenreFilter
              selectedGenre={selectedGenre}
              onSelectGenre={setSelectedGenre}
              genres={allGenres}
            />
          )}

          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop Grid Toggle - Hide on mobile */}
        <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
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
      </div>

      {/* Books Grid - 2 columns on mobile, responsive on larger screens */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      ) : displayBooks.length > 0 ? (
        <>
          <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {displayBooks.map((book) => (
              // @ts-expect-error - genres type mismatch after parsing, runtime is correct
              <BookCard key={book.id} book={book} onEdit={setEditingBook} />
            ))}
          </div>
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Showing {displayBooks.length} book{displayBooks.length !== 1 ? "s" : ""}
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
