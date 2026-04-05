// src/app/graph/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { GraphControls } from "./components/GraphControls";
import { GraphView } from "./components/GraphView";
import { BookSidePanel } from "./components/BookSidePanel";
import { ConceptEditor } from "@/components/ui/ConceptEditor";
import type { BiblioNode, GraphMode, GraphFilters, Book } from "./components/types";
import { trpc } from "@/client/trpc";

export default function GraphPage() {
  const router = useRouter();
  const params = useParams();

  const [mode, setMode] = useState<GraphMode>("overview");
  const [selectedBook, setSelectedBook] = useState<BiblioNode>();
  const [filters, setFilters] = useState<GraphFilters>();
  const [showConceptEditor, setShowConceptEditor] = useState(false);

  const utils = trpc.useUtils();

  // Fetch concepts for the selected book when editor is opened
  const { data: selectedBookConcepts } = trpc.concepts.getByBook.useQuery(
    { bookId: selectedBook?.bookId || 0 },
    { enabled: showConceptEditor && !!selectedBook }
  );

  // Mutations for concept operations
  const addToBook = trpc.concepts.addToBook.useMutation({
    onSuccess: () => {
      utils.concepts.getByBook.invalidate({ bookId: selectedBook?.bookId || 0 });
      utils.graph.getGraphData.invalidate();
    },
  });

  const removeFromBook = trpc.concepts.removeFromBook.useMutation({
    onSuccess: () => {
      utils.concepts.getByBook.invalidate({ bookId: selectedBook?.bookId || 0 });
      utils.graph.getGraphData.invalidate();
    },
  });

  const updateWeight = trpc.concepts.updateWeight.useMutation({
    onSuccess: () => {
      utils.concepts.getByBook.invalidate({ bookId: selectedBook?.bookId || 0 });
      utils.graph.getGraphData.invalidate();
    },
  });

  // Handle book selection
  const handleBookSelect = (book: Book | null) => {
    if (!book) {
      setSelectedBook(undefined);
      return;
    }
    // Convert Book to BiblioNode for internal state
    const biblioNode: BiblioNode = {
      id: book.id,
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      label: book.title,
      readingStatus: "unknown",
    };
    setSelectedBook(biblioNode);
    if (mode === "overview") {
      setMode("focused");
    }
  };

  // Handle double click (enter isolated view)
  const handleDoubleClick = (book: Book) => {
    router.push(`/graph?isolated=${book.id}`);
    setMode("isolated");
  };

  // Handle search
  const handleSearch = (query: string) => {
    setFilters({ ...filters, searchQuery: query });
  };

  // Handle filter change
  const handleFilterChange = (newFilters: GraphFilters) => {
    setFilters(newFilters);
  };

  // Handle mode change
  const handleModeChange = (newMode: GraphMode) => {
    setMode(newMode);
    if (newMode === "overview") {
      setSelectedBook(undefined);
    }
  };

  // Handle concept changes
  const handleConceptAdd = (name: string, weight: number) => {
    if (!selectedBook) return;
    addToBook.mutate({
      bookId: selectedBook.bookId,
      conceptName: name,
      domain: "general",
      weight,
    });
  };

  const handleConceptRemove = (conceptId: number) => {
    if (!selectedBook) return;
    removeFromBook.mutate({
      bookId: selectedBook.bookId,
      conceptId,
    });
  };

  const handleWeightChange = (conceptId: number, weight: number) => {
    if (!selectedBook) return;
    updateWeight.mutate({
      bookId: selectedBook.bookId,
      conceptId,
      weight,
    });
  };

  // Check for isolated mode in URL
  const isolatedBookId = params.isolated
    ? parseInt(params.isolated as string)
    : undefined;

  // Exit isolated mode on escape
  useEffect(() => {
    const handleExitIsolated = () => {
      router.push("/graph");
      setMode("overview");
      setSelectedBook(undefined);
    };

    window.addEventListener("exit-isolated", handleExitIsolated);
    return () => window.removeEventListener("exit-isolated", handleExitIsolated);
  }, [router]);

  return (
    <div className="h-screen w-full bg-gray-50 relative flex flex-col">
      {/* Graph Controls */}
      <GraphControls
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        onModeChange={handleModeChange}
        currentMode={isolatedBookId ? "isolated" : mode}
      />

      {/* Main Graph View */}
      <GraphView
        mode={isolatedBookId ? "isolated" : mode}
        selectedBook={selectedBook ? {
          id: typeof selectedBook.id === "number" ? selectedBook.id : selectedBook.bookId,
          title: selectedBook.title,
          author: selectedBook.author,
          coverUrl: selectedBook.coverUrl,
        } : null}
        onBookSelect={handleBookSelect}
        onDoubleClick={handleDoubleClick}
        filters={filters}
        focusedBookId={isolatedBookId || selectedBook?.bookId}
      />

      {/* Side Panel */}
      {selectedBook && (
        <BookSidePanel
          book={{
            id: typeof selectedBook.id === "number" ? selectedBook.id : selectedBook.bookId,
            title: selectedBook.title,
            author: selectedBook.author,
            coverUrl: selectedBook.coverUrl,
            genre: selectedBook.genre,
            readingStatus: selectedBook.readingStatus,
          }}
          concepts={(selectedBookConcepts || []).map(c => ({
            id: c.id,
            name: c.name,
            domain: c.domain || "general",
            weight: c.weight,
          }))}
          connections={[]}
          isOpen={!!selectedBook && !showConceptEditor}
          onClose={() => setSelectedBook(undefined)}
          onEditConcepts={() => setShowConceptEditor(true)}
        />
      )}

      {/* Concept Editor Modal */}
      {showConceptEditor && selectedBook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Concepts</h2>
            <ConceptEditor
              bookId={selectedBook.bookId}
              concepts={(selectedBookConcepts || []).map(c => ({
            id: c.id,
            name: c.name,
            domain: c.domain || "general",
            weight: c.weight,
          }))}
              onAdd={handleConceptAdd}
              onRemove={handleConceptRemove}
              onWeightChange={handleWeightChange}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowConceptEditor(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
