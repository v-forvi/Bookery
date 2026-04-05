// src/app/graph/components/GraphControls.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, List, Sparkles, X, Home } from "lucide-react";
import { trpc } from "@/client/trpc";
import type { GraphFilters, GraphMode } from "./types";

interface GraphControlsProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: GraphFilters) => void;
  onModeChange: (mode: GraphMode) => void;
  currentMode: GraphMode;
}

export function GraphControls({
  onSearch,
  onFilterChange,
  onModeChange,
  currentMode,
}: GraphControlsProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const utils = trpc.useUtils();
  const batchExtract = trpc.concepts.batchExtract.useMutation({
    onSuccess: () => {
      utils.graph.getGraphData.invalidate();
      utils.concepts.getByBook.invalidate();
    },
  });
  const isExtracting = batchExtract.isPending;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleAnalyzeUnread = () => {
    batchExtract.mutate(
      { filter: "unread" },
      {
        onSuccess: () => {
          alert("Concept extraction complete!");
        },
        onError: (err) => {
          alert(`Extraction failed: ${err.message}`);
        },
      }
    );
  };

  const modes: Array<{ value: GraphMode; label: string; icon: string }> = [
    { value: "overview", label: "Overview", icon: "🌐" },
    { value: "focused", label: "Focused", icon: "🎯" },
    { value: "isolated", label: "Isolated", icon: "🔍" },
  ];

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center gap-4 flex-wrap">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
      </form>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`p-2 border rounded-lg ${showFilters ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"}`}
        title="Filters"
      >
        <Filter className="h-4 w-4" />
      </button>

      {/* Reading Status Filters */}
      {showFilters && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                const statuses: ("unread" | "reading" | "paused" | "completed")[] = e.target.checked ? ["unread", "reading"] : [];
                onFilterChange({ readingStatus: statuses });
              }}
              className="rounded"
            />
            <span>Unread</span>
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                const statuses: ("unread" | "reading" | "paused" | "completed")[] = e.target.checked ? ["reading"] : [];
                onFilterChange({ readingStatus: statuses });
              }}
              className="rounded"
            />
            <span>Reading</span>
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              onChange={(e) => {
                const statuses: ("unread" | "reading" | "paused" | "completed")[] = e.target.checked ? ["completed"] : [];
                onFilterChange({ readingStatus: statuses });
              }}
              className="rounded"
            />
            <span>Completed</span>
          </label>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={`px-3 py-1 rounded text-sm ${
              currentMode === mode.value
                ? "bg-white shadow font-medium"
                : "hover:bg-gray-200"
            }`}
          >
            <span className="mr-1">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Home Button */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Home className="h-4 w-4" />
        Home
      </button>

      {/* Analyze Unread Button */}
      <button
        onClick={handleAnalyzeUnread}
        disabled={isExtracting}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="h-4 w-4" />
        {isExtracting ? "Analyzing..." : "Analyze Unread"}
      </button>

      {/* Clear Filters */}
      {searchQuery || showFilters ? (
        <button
          onClick={() => {
            setSearchQuery("");
            setShowFilters(false);
            onFilterChange({});
          }}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
