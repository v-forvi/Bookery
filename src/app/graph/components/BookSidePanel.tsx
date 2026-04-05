// src/app/graph/components/BookSidePanel.tsx

"use client";

import { X, Link2, Edit, BookOpen } from "lucide-react";
import { trpc } from "@/client/trpc";

interface BookSidePanelProps {
  book: {
    id: number;
    title: string;
    author: string;
    coverUrl?: string;
    genre?: string;
    readingStatus: string;
  };
  concepts?: Array<{
    id: number;
    name: string;
    domain: string;
    weight: number;
  }>;
  connections?: Array<{
    book: {
      id: number;
      title: string;
      author: string;
      coverUrl?: string;
    };
    sharedConcepts: Array<{
      id: number;
      name: string;
      weight: number;
    }>;
    strength: number;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onEditConcepts: () => void;
}

export function BookSidePanel({
  book,
  concepts,
  connections,
  isOpen,
  onClose,
  onEditConcepts,
}: BookSidePanelProps) {
  const utils = trpc.useUtils();

  // Reading status mutation
  const updateStatus = trpc.books.updateStatus.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      utils.graph.getGraphData.invalidate();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg border-l z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">Book Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Book Cover & Title */}
        <div className="p-4 border-b">
          <div className="flex gap-4">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-16 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
              <p className="text-gray-600 text-sm">by {book.author}</p>
            </div>
          </div>
        </div>

        {/* Book Info */}
        <div className="px-4 pb-4 border-b">
          <p className="text-gray-600 mb-2">by {book.author}</p>
          {book.genre && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
              {book.genre}
            </span>
          )}
        </div>

        {/* Reading Status */}
        <div className="px-4 py-4 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reading Status
          </label>
          <select
            value={book.readingStatus}
            onChange={(e) => updateStatus.mutate({ bookId: book.id, status: e.target.value as any })}
            disabled={updateStatus.isPending}
            className="w-full border rounded px-3 py-2 disabled:opacity-50"
          >
            <option value="unread">Unread</option>
            <option value="reading">Reading</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          {updateStatus.isPending && (
            <p className="text-xs text-gray-500 mt-1">Saving...</p>
          )}
        </div>

        {/* Concepts */}
        <div className="px-4 py-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Concepts</h3>
            <button
              onClick={onEditConcepts}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Edit size={14} /> Edit
            </button>
          </div>
          {concepts && concepts.length > 0 ? (
            <ul className="space-y-2">
              {concepts.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.domain}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${c.weight}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No concepts yet. Analyze this book to extract concepts.
            </p>
          )}
        </div>

        {/* Connected Books */}
        <div className="px-4 py-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Link2 size={16} /> Connected Books
          </h3>
          {connections && connections.length > 0 ? (
            <ul className="space-y-3">
              {connections.slice(0, 5).map((conn) => (
                <li
                  key={conn.book.id}
                  className="text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <div className="font-medium">{conn.book.title}</div>
                  <div className="text-gray-500 text-xs">{conn.book.author}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {conn.sharedConcepts.slice(0, 3).map((c) => (
                      <span key={c.id} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {c.name}
                      </span>
                    ))}
                    {conn.sharedConcepts.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{conn.sharedConcepts.length - 3}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No connections yet. Add concepts to see connections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
