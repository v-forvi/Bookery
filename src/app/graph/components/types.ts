// src/app/graph/components/types.ts

import type { Node, Edge } from "vis-network";

export type GraphMode = "overview" | "focused" | "isolated";

export interface GraphFilters {
  genres?: string[];
  readingStatus?: ("unread" | "reading" | "paused" | "completed")[];
  concepts?: number[];
  searchQuery?: string;
}

// Extend vis-network types for our data
export interface BiblioNode extends Node {
  bookId: number;
  title: string;
  author: string;
  coverUrl?: string;
  genre?: string;
  readingStatus: string;
}

export interface BiblioEdge extends Edge {
  strength: number;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
}

export interface GraphViewProps {
  mode: GraphMode;
  selectedBook: Book | null;
  onBookSelect: (book: Book | null) => void;
  onDoubleClick: (book: Book) => void;
  filters?: GraphFilters;
  focusedBookId?: number;
}
