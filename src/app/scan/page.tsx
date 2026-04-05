// src/app/scan/page.tsx

"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Upload, Check, X, BookOpen, Loader2, Layers, Library, Handshake, ArrowLeft, RotateCcw } from "lucide-react";
import { trpc } from "@/client/trpc";
import { LoanOutModal } from "@/components/lending/LoanOutModal";
import { ReturnModal } from "@/components/lending/ReturnModal";
import { CameraCaptureButton } from "@/components/CameraCapture";

type ScanMode = "loan" | "import" | "return";

// Helper function to call tRPC query outside of React hooks
async function callTrpcQuery(procPath: string, input: any) {
  // Filter out null and undefined values
  const cleanInput = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== null && value !== undefined)
  );

  const url = `/api/trpc/${procPath}?input=${encodeURIComponent(JSON.stringify(cleanInput))}`;
  console.log('Calling API:', url);
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`Query failed: ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  console.log('API response:', data);
  const result = data.result?.data;
  console.log('Extracted result:', result);
  return result;
}

function ScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read mode from URL, default to 'loan'
  const initialMode = (searchParams.get('mode') as ScanMode) || 'loan';

  const [scanMode, setScanMode] = useState<ScanMode>(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [existingBook, setExistingBook] = useState<any>(null);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [bookNotFound, setBookNotFound] = useState(false);
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
    setExistingBook(null);
    setShowLoanModal(false);
    setBookNotFound(false);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        try {
          if (scanMode === "loan") {
            // Scan to find existing book for loaning
            const result = await scanPreview.mutateAsync({ imageData: base64 });
            setScanResult(result);

            // Check if book exists in library
            setCheckingExisting(true);
            try {
              console.log('OCR Result - Title:', result.title);
              console.log('OCR Result - Author:', result.author);
              const existing = await callTrpcQuery('books.findExisting', {
                title: result.title,
                author: result.author,
              });
              console.log('Existing book found:', existing);
              if (existing) {
                setExistingBook(existing);
              } else {
                console.log('No existing book found, setting bookNotFound=true');
                setBookNotFound(true);
              }
            } catch (err) {
              console.error('Error checking existing book:', err);
              setBookNotFound(true);
            } finally {
              setCheckingExisting(false);
            }
          } else if (scanMode === "return") {
            // Return mode - same as loan mode but shows return UI
            const result = await scanPreview.mutateAsync({ imageData: base64 });
            setScanResult(result);

            // Check if book exists in library
            setCheckingExisting(true);
            try {
              console.log('OCR Result - Title:', result.title);
              console.log('OCR Result - Author:', result.author);
              const existing = await callTrpcQuery('books.findExisting', {
                title: result.title,
                author: result.author,
              });
              console.log('Existing book found:', existing);
              if (existing) {
                setExistingBook(existing);
              } else {
                console.log('No existing book found, setting bookNotFound=true');
                setBookNotFound(true);
              }
            } catch (err) {
              console.error('Error checking existing book:', err);
              setBookNotFound(true);
            } finally {
              setCheckingExisting(false);
            }
          } else {
            // Import mode - batch add from shelf
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
    setExistingBook(null);
    setShowLoanModal(false);
    setBookNotFound(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLoanOut = () => {
    if (existingBook) {
      if (scanMode === "return") {
        setShowReturnModal(true);
      } else {
        setShowLoanModal(true);
      }
    }
  };

  const handleLoanSuccess = () => {
    setShowLoanModal(false);
    utils.books.list.invalidate();
    utils.loans.getActive.invalidate();
    router.push("/");
  };

  const handleReturnSuccess = () => {
    setShowReturnModal(false);
    utils.books.list.invalidate();
    utils.loans.getActive.invalidate();
    router.push("/");
  };

  const handleDone = () => {
    router.push("/");
  };

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    handleRetake();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">
            {scanMode === "loan" ? "Loan Out Book" :
             scanMode === "return" ? "Return Book" :
             "Import Books"}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* Mode Toggle - hide when showing results */}
        {!scanResult && !batchResult && (
          <div className="mb-6 flex justify-center">
            <div className="bg-white rounded-lg shadow p-1 flex gap-1">
              <button
                onClick={() => handleModeChange("loan")}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                  (scanMode as string) === "loan"
                    ? "bg-orange-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Handshake className="h-4 w-4" />
                <span className="hidden sm:inline">Loan Out</span>
                <span className="sm:hidden">Loan</span>
              </button>
              <button
                onClick={() => handleModeChange("return")}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                  (scanMode as string) === "return"
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Return</span>
                <span className="sm:hidden">Return</span>
              </button>
              <button
                onClick={() => handleModeChange("import")}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                  (scanMode as string) === "import"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload/Scanning State */}
        {!scanResult && !batchResult ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">
              {scanMode === "loan"
                ? "Scan Book to Loan Out"
                : scanMode === "return"
                ? "Scan Book to Return"
                : "Upload a Bookshelf Photo"}
            </h2>
            <p className="text-gray-600 mb-6">
              {scanMode === "loan"
                ? "Take a photo of the book cover. We'll find it in your library so you can loan it out."
                : scanMode === "return"
                ? "Take a photo of the book cover. We'll find it in your library so you can mark it as returned."
                : "Take a photo of your bookshelf. We'll extract all visible titles and add them to your library."}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Camera button - shown first on mobile */}
              <CameraCaptureButton
                onCapture={(base64) => {
                  // Create a fake File object from base64
                  const base64Data = base64.split(',')[1];
                  const byteCharacters = atob(base64Data);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'image/jpeg' });

                  // Trigger the file select handler with the blob
                  const fakeEvent = {
                    target: { files: [new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })] }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileSelect(fakeEvent);
                }}
                disabled={isScanning || batchAddFromShelf.isPending || scanPreview.isPending}
              />

              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning || batchAddFromShelf.isPending || scanPreview.isPending}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isScanning || batchAddFromShelf.isPending || scanPreview.isPending) ? (
                  <>
                    <Loader2 className="h-5 w-5 inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 inline mr-2" />
                    Choose from Gallery
                  </>
                )}
              </button>
            </div>

            {scanError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {scanError}
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded text-left text-sm text-gray-600">
              <p className="font-medium mb-2">Tips for best results:</p>
              <ul className="list-disc list-inside space-y-1">
                {scanMode === "loan" || scanMode === "return" ? (
                  <>
                    <li>Use good lighting - avoid shadows on the book cover</li>
                    <li>Hold the camera parallel to the book</li>
                    <li>Make sure the title is clearly visible</li>
                    <li>The book must already be in your library</li>
                  </>
                ) : (
                  <>
                    <li>Use good lighting - avoid shadows on the books</li>
                    <li>Hold the camera parallel to the shelf</li>
                    <li>Make sure book spines are clearly visible</li>
                    <li>JPG or PNG formats work best</li>
                  </>
                )}
              </ul>
            </div>
          </div>

        /* ========== LOAN/RETURN MODE: Single Book Result ========== */
        ) : (scanMode === "loan" || scanMode === "return") && scanResult ? (
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

            {/* Status indicator */}
            {checkingExisting ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-center text-blue-600">
                <Loader2 className="h-5 w-5 inline mr-2 animate-spin" />
                Searching your library...
              </div>
            ) : bookNotFound ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium">
                  ✗ This book was not found in your library.
                </p>
                <p className="text-sm text-red-600">
                  You can only loan out books that are already in your library.
                  <br />
                  <span className="text-xs">
                    Found: "{scanResult.title}" {scanResult.author && `by ${scanResult.author}`}
                  </span>
                </p>
              </div>
            ) : existingBook ? (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">
                  ✓ Found in your library!
                </p>
                <p className="text-sm text-green-600">
                  {scanMode === "return"
                    ? `"${existingBook.title}" is ready to be returned.`
                    : `"${existingBook.title}" is ready to be loaned out.`
                  }
                </p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Try Different Photo
              </button>
              {existingBook && (
                <button
                  onClick={handleLoanOut}
                  className={`flex-1 px-4 py-2 text-white rounded flex items-center justify-center gap-2 ${
                    scanMode === "return"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {scanMode === "return" ? (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Return This Book
                    </>
                  ) : (
                    <>
                      <Handshake className="h-4 w-4" />
                      Loan Out This Book
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        /* ========== IMPORT MODE: Batch Result ========== */
        ) : scanMode === "import" && batchResult ? (
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

      {/* Loan Out Modal */}
      {showLoanModal && existingBook && (
        <LoanOutModal
          isOpen={showLoanModal}
          onClose={() => setShowLoanModal(false)}
          onSuccess={handleLoanSuccess}
          preselectedBook={existingBook}
        />
      )}

      {/* Return Modal */}
      {showReturnModal && existingBook && (
        <ReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          onSuccess={handleReturnSuccess}
          preselectedBook={existingBook}
        />
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
