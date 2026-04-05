"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { trpc } from "@/client/trpc";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Book } from "@/server/schema";

interface AddBookDialogProps {
  trigger?: React.ReactNode;
}

export function AddBookDialog({ trigger }: AddBookDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    title: "",
    author: "",
    isbn: "",
    publicationYear: "",
    genres: "",
    description: "",
  });

  // Search form state
  const [searchQuery, setSearchQuery] = useState({
    title: "",
    author: "",
    isbn: "",
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const utils = trpc.useUtils();

  // Manual entry mutation
  const addBook = trpc.books.add.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      setOpen(false);
      resetManualForm();
    },
  });

  // Google Books search - use client to call query on demand
  const trpcClient = trpc.useContext();

  const resetManualForm = () => {
    setManualForm({
      title: "",
      author: "",
      isbn: "",
      publicationYear: "",
      genres: "",
      description: "",
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualForm.title || !manualForm.author) {
      return;
    }

    await addBook.mutateAsync({
      title: manualForm.title,
      author: manualForm.author,
      isbn: manualForm.isbn || undefined,
      publicationYear: manualForm.publicationYear
        ? parseInt(manualForm.publicationYear)
        : undefined,
      genres: manualForm.genres
        ? manualForm.genres.split(",").map((g) => g.trim())
        : undefined,
      description: manualForm.description || undefined,
      source: "manual",
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.title && !searchQuery.author && !searchQuery.isbn) {
      return;
    }

    setIsSearching(true);
    try {
      const results = await trpcClient.books.searchExternal.fetch({
        title: searchQuery.title || undefined,
        author: searchQuery.author || undefined,
        isbn: searchQuery.isbn || undefined,
        maxResults: 5,
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const addFromSearch = async (result: any) => {
    await addBook.mutateAsync({
      title: result.title,
      author: result.authors[0] || "Unknown",
      isbn: result.isbn || result.isbn13,
      isbn13: result.isbn13,
      coverUrl: result.coverUrl,
      description: result.description,
      genres: result.genres,
      publicationYear: result.publicationYear,
      pageCount: result.pageCount,
      publisher: result.publisher,
      language: result.language,
      source: "google_books",
      externalId: result.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        trigger
      ) : (
        <DialogTrigger>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Book
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add a Book</DialogTitle>
          <DialogDescription>
            Add a book manually or search Google Books
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Google Books</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="search-isbn">ISBN (fastest match)</Label>
                <Input
                  id="search-isbn"
                  placeholder="e.g., 0374533555"
                  value={searchQuery.isbn}
                  onChange={(e) =>
                    setSearchQuery({ ...searchQuery, isbn: e.target.value })
                  }
                />
              </div>
              <div className="text-center text-sm text-zinc-500">
                or
              </div>
              <div>
                <Label htmlFor="search-title">Title</Label>
                <Input
                  id="search-title"
                  placeholder="Book title"
                  value={searchQuery.title}
                  onChange={(e) =>
                    setSearchQuery({ ...searchQuery, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="search-author">Author</Label>
                <Input
                  id="search-author"
                  placeholder="Author name"
                  value={searchQuery.author}
                  onChange={(e) =>
                    setSearchQuery({ ...searchQuery, author: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.isbn && !searchQuery.title && !searchQuery.author}
                className="w-full"
              >
                {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search Google Books
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Found {searchResults.length} result(s):</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex gap-3 p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      {result.coverUrl && (
                        <img
                          src={result.coverUrl}
                          alt={result.title}
                          className="h-16 w-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        <p className="text-sm text-zinc-500 truncate">
                          {result.authors?.join(", ")}
                        </p>
                        {result.confidence && (
                          <p className="text-xs text-zinc-400">
                            Match: {Math.round(result.confidence * 100)}%
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addFromSearch(result)}
                        disabled={addBook.isPending}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={manualForm.title}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    required
                    value={manualForm.author}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, author: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    placeholder="10 or 13 digit"
                    value={manualForm.isbn}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, isbn: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="year">Publication Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="e.g., 2020"
                    value={manualForm.publicationYear}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, publicationYear: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="genres">Genres (comma-separated)</Label>
                  <Input
                    id="genres"
                    placeholder="e.g., Fiction, Science Fiction"
                    value={manualForm.genres}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, genres: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description..."
                    value={manualForm.description}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addBook.isPending}>
                  {addBook.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Book
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
