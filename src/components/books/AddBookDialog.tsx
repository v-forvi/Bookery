"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, X, Search, Edit } from "lucide-react";
import { trpc } from "@/client/trpc";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent, SheetClose } from "@/components/ui/sheet";

interface AddBookDialogProps {
  trigger?: ({ setOpen }: { setOpen: (open: boolean) => void }) => React.ReactNode;
  buttonClassName?: string;
}

export function AddBookDialog({ trigger, buttonClassName }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "manual">("search");
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
      setSearchResults([]);
    },
  });

  // Google Books search
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
    if (!manualForm.title || !manualForm.author) return;

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
    if (!searchQuery.title && !searchQuery.author && !searchQuery.isbn) return;

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
    <>
      {trigger && trigger({ setOpen })}
      {!trigger && (
        <button
          onClick={() => setOpen(true)}
          className={buttonClassName}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Book
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
          <div>
            <SheetTitle className="text-base">Add a Book</SheetTitle>
            <SheetDescription className="text-xs">Search or enter manually</SheetDescription>
          </div>
          <SheetClose onClick={() => { setOpen(false); setSearchResults([]); }}>
            <X className="h-5 w-5" />
          </SheetClose>
        </SheetHeader>

        <SheetContent>
          {/* Tab Toggle */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "search"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-4 w-4 mr-1.5 inline" />
              Search
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "manual"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit className="h-4 w-4 mr-1.5 inline" />
              Manual
            </button>
          </div>

          {/* Search Tab Content */}
          {activeTab === "search" && (
            <div className="space-y-4 pb-4">
              <div>
                <Label htmlFor="search-isbn" className="text-xs">ISBN</Label>
                <Input
                  id="search-isbn"
                  placeholder="0374533555"
                  value={searchQuery.isbn}
                  onChange={(e) => setSearchQuery({ ...searchQuery, isbn: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">
                — or —
              </div>
              <div>
                <Label htmlFor="search-title" className="text-xs">Title</Label>
                <Input
                  id="search-title"
                  placeholder="Book title"
                  value={searchQuery.title}
                  onChange={(e) => setSearchQuery({ ...searchQuery, title: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="search-author" className="text-xs">Author</Label>
                <Input
                  id="search-author"
                  placeholder="Author name"
                  value={searchQuery.author}
                  onChange={(e) => setSearchQuery({ ...searchQuery, author: e.target.value })}
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.isbn && !searchQuery.title && !searchQuery.author}
                className="w-full h-10"
              >
                {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search Google Books
              </Button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} found
                  </p>
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex gap-3 p-3 bg-muted border rounded-lg"
                    >
                      {result.coverUrl && (
                        <img
                          src={result.coverUrl}
                          alt=""
                          className="h-16 w-12 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.authors?.join(", ")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addFromSearch(result)}
                        disabled={addBook.isPending}
                        className="h-8 px-3 flex-shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Tab Content */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 pb-4">
              <div>
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  required
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="author" className="text-xs">Author *</Label>
                <Input
                  id="author"
                  required
                  value={manualForm.author}
                  onChange={(e) => setManualForm({ ...manualForm, author: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="isbn" className="text-xs">ISBN</Label>
                  <Input
                    id="isbn"
                    placeholder="Optional"
                    value={manualForm.isbn}
                    onChange={(e) => setManualForm({ ...manualForm, isbn: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="year" className="text-xs">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="2020"
                    value={manualForm.publicationYear}
                    onChange={(e) => setManualForm({ ...manualForm, publicationYear: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="genres" className="text-xs">Genres</Label>
                <Input
                  id="genres"
                  placeholder="Fiction, Sci-Fi"
                  value={manualForm.genres}
                  onChange={(e) => setManualForm({ ...manualForm, genres: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Optional"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addBook.isPending}>
                  {addBook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Book
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
