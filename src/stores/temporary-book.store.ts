// src/stores/temporary-book.store.ts

import { create } from "zustand";

interface TemporaryBook {
  id: string; // Temporary ID
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  genres?: string[];
  concepts: Array<{
    name: string;
    domain: string;
    weight: number;
  }>;
}

interface TemporaryBookState {
  temporaryBook: TemporaryBook | null;
  setTemporaryBook: (book: TemporaryBook) => void;
  clearTemporaryBook: () => void;
}

export const useTemporaryBookStore = create<TemporaryBookState>((set) => ({
  temporaryBook: null,
  setTemporaryBook: (book) => set({ temporaryBook: book }),
  clearTemporaryBook: () => set({ temporaryBook: null }),
}));
