// src/app/scan/page.tsx

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Check, X, BookOpen, Network, Loader2, Layers, Library } from "lucide-react";
import { trpc } from "@/client/trpc";
import { useTemporaryBookStore } from "@/stores/temporary-book.store";

type ScanMode = "single" | "batch";

export default function ScanPage() {
  const router = useRouter();
  const setTemporaryBook = useTemporaryBookStore(state => state.setTemporaryBook);
  const temporaryBook = useTemporaryBookStore(state => state.temporaryBook);
  const clearTemporaryBook = useTemporaryBookStore(state => state.clearTemporaryBook);

  const [scanMode, setScanMode] = useState<ScanMode>("batch");
  const [selectedIntent, setSelectedIntent] = useState<"add" | "loaned" | "testing">("add");
  const [lenderName, setLenderName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const scanPreview = trpc.books.scanPreview.useMutation();
  const batchAddFromShelf = trpc.books.batchAddFromShelf.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      utils.graph.getGraphData.invalidate();
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    setBatchResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        try {
          if (scanMode === "single") {
            const result = await scanPreview.mutateAsync({ imageData: base64 });
            setScanResult(result);
          } else {
            const result = await batchAddFromShelf.mutateAsync({ imageData: base64 });
            setBatchResult(result);
          }
        } catch (error: any) {
          setScanError(error.message || "Failed to analyze image");
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      setScanError(error.message || "Failed to process image");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetake = () => {
    setScanResult(null);
    setBatchResult(null);
    setScanError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDone = () => {
    router.push("/graph");
  };

  // Temporary book preview (from "See where it fits" mode)
  if (temporaryBook) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <Network className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Previewing Connections</h2>
            <p className="text-gray-600">
              "{temporaryBook.title}" is being previewed to see how it connects to your library.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                clearTemporaryBook();
                router.push("/graph");
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">
            {scanMode === "batch" ? "Import Books from Shelf" : "Scan Book"}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* Mode Toggle */}
        {!scanResult && !batchResult && (
          <div className="mb-4 flex justify-center">
            <div className="bg-white rounded-lg shadow p-1 flex gap-1">
              <button
                onClick={() => setScanMode("batch")}
                className={`px-4 py-2 rounded flex items-center gap-2 ${
                  scanMode === "batch"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Layers className="h-4 w-4" />
                Bookshelf Photo
              </button>
              <button
                onClick={() => setScanMode("single")}
                className={`px-4 py-2 rounded flex items-center gap-2 ${
                  scanMode === "single"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Single Book
              </button>
            </div>
          </div>
        )}

        {/* Upload/Scanning State */}
        {!scanResult && !batchResult ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">
              {scanMode === "batch"
                ? "Upload a Bookshelf Photo"
                : "Upload a Book Cover Photo"}
            </h2>
            <p className="text-gray-600 mb-6">
              {scanMode === "batch"
                ? "Take a photo of your bookshelf. We'll extract all visible titles and authors using AI, then add them to your library."
                : "Take a photo of a book cover and we'll extract the title, author, and other metadata using AI."}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning || batchAddFromShelf.isPending || scanPreview.isPending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isScanning || batchAddFromShelf.isPending || scanPreview.isPending) ? (
                <>
                  <Loader2 className="h-5 w-5 inline mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 inline mr-2" />
                  Choose Photo
                </>
              )}
            </button>

            {scanError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {scanError}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded text-left text-sm text-gray-600">
              <p className="font-medium mb-2">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1">
                {scanMode === "batch" ? (
                  <>
                    <li>Use good lighting - avoid shadows on the books</li>
                    <li>Hold the camera parallel to the shelf</li>
                    <li>Make sure book spines are clearly visible</li>
                    <li>JPG or PNG formats work best</li>
                  </>
                ) : (
                  <>
                    <li>Use good lighting - avoid shadows on the book cover</li>
                    <li>Hold the camera parallel to the book spine</li>
                    <li>Make sure the title and author are clearly visible</li>
                    <li>JPG or PNG formats work best</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : scanMode === "single" && scanResult ? (
          /* Single Book Result */
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-4 mb-6">
              {scanResult.coverUrl ? (
                <img
                  src={scanResult.coverUrl}
                  alt={scanResult.title}
                  className="w-24 h-36 object-cover rounded"
                />
              ) : (
                <div className="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{scanResult.title || "Unknown Title"}</h2>
                <p className="text-gray-600">{scanResult.author || "Unknown Author"}</p>
                {scanResult.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {scanResult.description}
                  </p>
                )}
                {scanResult.isbn && (
                  <p className="text-xs text-gray-400 mt-1">ISBN: {scanResult.isbn}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Retake
              </button>
              <button
                onClick={handleDone}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : batchResult ? (
          /* Batch Result */
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <Library className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
              <p className="text-gray-600">
                Found {batchResult.totalExtracted} books, added {batchResult.added?.length || 0} to your library
                {batchResult.skipped?.length > 0 && ` (skipped ${batchResult.skipped.length} already exist)`}
                .
              </p>
              {batchResult.apiUsed && (
                <p className="text-xs text-gray-400 mt-1">
                  Processed with {batchResult.apiUsed.toUpperCase()} in {batchResult.processingTimeMs}ms
                </p>
              )}
            </div>

            {/* Added Books */}
            {batchResult.added && batchResult.added.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Added ({batchResult.added.length})
                </h3>
                <div className="max-h-60 overflow-y-auto border rounded divide-y">
                  {batchResult.added.map((book: any, idx: number) => (
                    <div key={idx} className="p-3 flex items-start gap-3">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-gray-200 rounded flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{book.title}</p>
                        <p className="text-sm text-gray-500 truncate">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Books */}
            {batchResult.skipped && batchResult.skipped.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-600">
                  <X className="h-5 w-5" />
                  Skipped ({batchResult.skipped.length})
                </h3>
                <div className="max-h-40 overflow-y-auto border rounded bg-yellow-50 p-3">
                  {batchResult.skipped.map((book: any, idx: number) => (
                    <p key={idx} className="text-sm text-gray-600 truncate">
                      {book.title} {book.author && `by ${book.author}`}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {batchResult.errors && batchResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                  <X className="h-5 w-5" />
                  Errors ({batchResult.errors.length})
                </h3>
                <div className="max-h-40 overflow-y-auto border rounded bg-red-50 p-3">
                  {batchResult.errors.map((error: any, idx: number) => (
                    <p key={idx} className="text-sm text-red-600">
                      {error.title || "Unknown"}: {error.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Import More
              </button>
              <button
                onClick={handleDone}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Library
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
