import { create } from "zustand";

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  isbn13?: string;
  coverUrl?: string;
  description?: string;
  genres: string[];
  publicationYear?: number;
  pageCount?: number;
  publisher?: string;
  language: string;
  source: "google_books" | "openlibrary" | "manual";
  externalId?: string;
  dateAdded: string;
  lastModified: string;
}

interface BookStore {
  books: Book[];
  selectedBooks: Set<number>;
  searchQuery: string;
  genreFilter: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBooks: (books: Book[]) => void;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  removeBook: (id: number) => void;
  toggleSelectBook: (id: number) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setGenreFilter: (genre: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  selectedBooks: new Set(),
  searchQuery: "",
  genreFilter: null,
  isLoading: false,
  error: null,

  setBooks: (books) => set({ books }),

  addBook: (book) =>
    set((state) => ({
      books: [book, ...state.books],
    })),

  updateBook: (book) =>
    set((state) => ({
      books: state.books.map((b) => (b.id === book.id ? book : b)),
    })),

  removeBook: (id) =>
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
      selectedBooks: new Set([...state.selectedBooks].filter((i) => i !== id)),
    })),

  toggleSelectBook: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedBooks);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedBooks: newSet };
    }),

  clearSelection: () => set({ selectedBooks: new Set() }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setGenreFilter: (genreFilter) => set({ genreFilter }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
