// src/app/library/page.tsx

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, BookOpen, ArrowLeft, Edit, Trash2, X, Loader2 } from "lucide-react";
import { trpc } from "@/client/trpc";

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  genres?: string[];
  pageCount?: number;
  publisher?: string;
  publicationYear?: number;
  dateAdded?: string;
}

interface EditingBook {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  description?: string;
  genres: string; // CSV string for editing
  pageCount?: number;
  publisher?: string;
  publicationYear?: number;
}

type SortOption = 'titleAsc' | 'titleDesc' | 'authorAsc' | 'authorDesc' | 'genre' | 'recent' | 'random';

export default function LibraryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBook, setEditingBook] = useState<EditingBook | null>(null);
  const [gridSize, setGridSize] = useState<3 | 6 | 9>(3);
  const [sortBy, setSortBy] = useState<SortOption>('titleAsc');

  const utils = trpc.useUtils();
  const deleteBook = trpc.books.delete.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      utils.graph.getGraphData.invalidate();
    },
  });

  const updateBook = trpc.books.update.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      utils.graph.getGraphData.invalidate();
      setEditingBook(null);
    },
    onError: (error) => {
      console.error("Failed to update book:", error);
      alert(`Failed to save: ${error.message}`);
    },
  });

  const { data: booksData, isLoading } = trpc.books.list.useQuery({
    search: searchQuery || undefined,
  });

  const books = booksData || [];

  // Sort books based on selected option (with stable random)
  const sortedBooks = useMemo(() => {
    const toSort = [...books];
    if (sortBy === 'random') {
      // Stable shuffle using Fisher-Yates with ID-based seed
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
          const aGenre = (a.genres?.[0] || 'No Genre').toLowerCase();
          const bGenre = (b.genres?.[0] || 'No Genre').toLowerCase();
          return aGenre.localeCompare(bGenre);
        case 'recent':
          const aDate = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          const bDate = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          return bDate - aDate; // Most recent first
        default:
          return 0;
      }
    });
  }, [books, sortBy]);

  const handleDelete = (bookId: number, title: string) => {
    if (confirm(`Delete "${title}" from your library?`)) {
      deleteBook.mutate({ id: bookId });
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook({
      ...book,
      genres: Array.isArray(book.genres) ? book.genres.join(', ') : '',
    });
  };

  const handleSave = () => {
    if (!editingBook) return;

    updateBook.mutate({
      id: editingBook.id,
      title: editingBook.title,
      author: editingBook.author,
      isbn: editingBook.isbn || undefined,
      coverUrl: editingBook.coverUrl || undefined,
      description: editingBook.description || undefined,
      genres: editingBook.genres ? editingBook.genres.split(',').map(g => g.trim()).filter(Boolean) : undefined,
      pageCount: editingBook.pageCount || undefined,
      publisher: editingBook.publisher || undefined,
      publicationYear: editingBook.publicationYear || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">My Library</h1>
            <span className="text-sm text-gray-500">({books.length} books)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search titles or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Grid Size Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGridSize(3)}
                className={`px-3 py-1 rounded text-sm ${
                  gridSize === 3 ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="3 per row"
              >
                3×
              </button>
              <button
                onClick={() => setGridSize(6)}
                className={`px-3 py-1 rounded text-sm ${
                  gridSize === 6 ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="6 per row"
              >
                6×
              </button>
              <button
                onClick={() => setGridSize(9)}
                className={`px-3 py-1 rounded text-sm ${
                  gridSize === 9 ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="9 per row"
              >
                9×
              </button>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSortBy('titleAsc')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'titleAsc' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Title A-Z"
              >
                Title ↑
              </button>
              <button
                onClick={() => setSortBy('titleDesc')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'titleDesc' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Title Z-A"
              >
                Title ↓
              </button>
              <button
                onClick={() => setSortBy('authorAsc')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'authorAsc' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Author A-Z"
              >
                Author ↑
              </button>
              <button
                onClick={() => setSortBy('genre')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'genre' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Genre"
              >
                Genre
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'recent' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Recently Added"
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy('random')}
                className={`px-3 py-1 rounded text-xs ${
                  sortBy === 'random' ? "bg-white shadow" : "hover:bg-gray-200"
                }`}
                title="Random"
              >
                🎲
              </button>
            </div>

            {/* Add Book Button */}
            <button
              onClick={() => router.push("/scan")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Book
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${
        gridSize === 9 ? 'max-w-[1800px]' : gridSize === 6 ? 'max-w-[1400px]' : 'max-w-6xl'
      } mx-auto`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your library is empty</h2>
            <p className="text-gray-500 mb-6">
              Add books by scanning covers or importing from a bookshelf photo.
            </p>
            <button
              onClick={() => router.push("/scan")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Book
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            gridSize === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' :
            gridSize === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' :
            'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-9'
          }`}>
            {sortedBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full"
              >
                {/* Cover Image */}
                <div className="relative h-36 bg-gray-200 flex-shrink-0">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Book Info - grows to push buttons to bottom */}
                <div className="p-3 flex-1 flex flex-col min-h-[100px]">
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2" title={book.title}>
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">{book.author}</p>

                  {/* Spacer to push buttons to bottom */}
                  <div className="flex-1"></div>
                </div>

                {/* Actions - always at bottom */}
                <div className="flex items-center justify-between p-3 pt-0 border-t bg-gray-50">
                  <button
                    onClick={() => handleEdit(book as Book)}
                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => router.push(`/graph?isolated=${book.id}`)}
                    className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                    title="View in Graph"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 005.656 0l1.102-1.101m-.758-4.899a4 4 0 005.656 0l-4 4a4 4 0 005.656 0l1.103-1.103m-1.103 4.899l4 4a4 4 0 005.656 0l4-4a4 4 0 00-5.656 0l-1.103-1.103" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(book.id, book.title)}
                    disabled={deleteBook.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Book</h2>
              <button
                onClick={() => setEditingBook(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              {/* Cover preview */}
              <div className="flex justify-center">
                <div className="w-32 h-48 bg-gray-100 rounded flex items-center justify-center">
                  {editingBook.coverUrl ? (
                    <img
                      src={editingBook.coverUrl}
                      alt={editingBook.title}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <BookOpen className="h-12 w-12 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISBN
                </label>
                <input
                  type="text"
                  value={editingBook.isbn || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value || undefined })}
                  placeholder="ISBN-10 or ISBN-13"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Genres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genres (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingBook.genres}
                  onChange={(e) => setEditingBook({ ...editingBook, genres: e.target.value })}
                  placeholder="Fiction, Science, Philosophy"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Publisher */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publisher
                </label>
                <input
                  type="text"
                  value={editingBook.publisher || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, publisher: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Year & Pages */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={editingBook.publicationYear || ''}
                    onChange={(e) => setEditingBook({
                      ...editingBook,
                      publicationYear: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder="2024"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Count
                  </label>
                  <input
                    type="number"
                    value={editingBook.pageCount || ''}
                    onChange={(e) => setEditingBook({
                      ...editingBook,
                      pageCount: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    placeholder="300"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={editingBook.coverUrl || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, coverUrl: e.target.value || undefined })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingBook.description || ''}
                  onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value || undefined })}
                  placeholder="Brief description of the book..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setEditingBook(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateBook.isPending || !editingBook.title || !editingBook.author}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateBook.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
