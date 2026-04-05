"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Book } from "@/server/schema";
import { trpc } from "@/client/trpc";
import { Loader2, X, BookOpen } from "lucide-react";

interface EditBookModalProps {
  book: Book & { genres?: string[] };
  isOpen: boolean;
  onClose: () => void;
}

export function EditBookModal({ book, isOpen, onClose }: EditBookModalProps) {
  const [formData, setFormData] = useState({
    title: book.title,
    author: book.author,
    isbn: book.isbn || "",
    coverUrl: book.coverUrl || "",
    description: book.description || "",
    genres: Array.isArray(book.genres) ? book.genres.join(', ') : '',
    pageCount: book.pageCount?.toString() || "",
    publisher: book.publisher || "",
    publicationYear: book.publicationYear?.toString() || "",
  });

  const utils = trpc.useUtils();
  const updateBook = trpc.books.update.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      utils.graph.getGraphData.invalidate();
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update book:", error);
      alert(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!formData.title || !formData.author) return;

    updateBook.mutate({
      id: book.id,
      title: formData.title,
      author: formData.author,
      isbn: formData.isbn || undefined,
      coverUrl: formData.coverUrl || undefined,
      description: formData.description || undefined,
      genres: formData.genres ? formData.genres.split(',').map(g => g.trim()).filter(Boolean) : undefined,
      pageCount: formData.pageCount ? parseInt(formData.pageCount) : undefined,
      publisher: formData.publisher || undefined,
      publicationYear: formData.publicationYear ? parseInt(formData.publicationYear) : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Book</h2>
          <button
            onClick={onClose}
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
              {formData.coverUrl ? (
                <img
                  src={formData.coverUrl}
                  alt={formData.title}
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
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author *
            </label>
            <Input
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            />
          </div>

          {/* ISBN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ISBN
            </label>
            <Input
              value={formData.isbn}
              onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
              placeholder="ISBN-10 or ISBN-13"
            />
          </div>

          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genres (comma-separated)
            </label>
            <Input
              value={formData.genres}
              onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
              placeholder="Fiction, Science, Philosophy"
            />
          </div>

          {/* Publisher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publisher
            </label>
            <Input
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            />
          </div>

          {/* Year & Pages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publication Year
              </label>
              <Input
                type="number"
                value={formData.publicationYear}
                onChange={(e) => setFormData({ ...formData, publicationYear: e.target.value })}
                placeholder="2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Count
              </label>
              <Input
                type="number"
                value={formData.pageCount}
                onChange={(e) => setFormData({ ...formData, pageCount: e.target.value })}
                placeholder="300"
              />
            </div>
          </div>

          {/* Cover URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image URL
            </label>
            <Input
              type="url"
              value={formData.coverUrl}
              onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the book..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBook.isPending || !formData.title || !formData.author}
          >
            {updateBook.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
