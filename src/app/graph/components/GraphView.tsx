// src/app/graph/components/GraphView.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network/standalone";
import { DataSet } from "vis-data/peer";
import type { Data, Options } from "vis-network/standalone";
import { trpc } from "@/client/trpc";
import type { GraphViewProps, BiblioNode, BiblioEdge, GraphMode } from "./types";
import { getDomainColor } from "@/lib/graph-utils";

export function GraphView({
  mode,
  selectedBook,
  onBookSelect,
  onDoubleClick,
  filters,
  focusedBookId,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesRef = useRef<DataSet<BiblioNode> | undefined>(undefined);
  const edgesRef = useRef<DataSet<BiblioEdge> | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Fetch graph data
  const { data: graphData, isLoading: dataLoading, error: queryError } = trpc.graph.getGraphData.useQuery({
    filters,
    limit: mode === "isolated" ? 100 : 200,
  });

  // Debug: log when data arrives
  useEffect(() => {
    if (graphData) {
      console.log('Graph data received:', {
        nodes: graphData.nodes.length,
        edges: graphData.edges.length,
        total: graphData.total,
        sampleNode: graphData.nodes[0]
      });
    }
  }, [graphData]);

  // Fetch neighborhood for focused/isolated modes
  const { data: connections } = trpc.graph.getBookConnections.useQuery(
    { bookId: focusedBookId || 0 },
    { enabled: !!focusedBookId && mode !== "overview" }
  );

  useEffect(() => {
    if (queryError) {
      setError(queryError.message || "Failed to load graph data");
      return;
    }

    if (!containerRef.current || !graphData) return;

    // Clear any previous error
    setError(null);

    // Create data sets
    if (!nodesRef.current) {
      nodesRef.current = new DataSet<BiblioNode>();
    }
    if (!edgesRef.current) {
      edgesRef.current = new DataSet<BiblioEdge>();
    }

    // Build nodes for vis-network (clean slate approach)
    const visNodes: BiblioNode[] = graphData.nodes.map(node => ({
      id: node.id,
      bookId: node.bookId,
      label: node.label,
      title: node.title,
      author: node.author,
      coverUrl: node.coverUrl,
      genre: node.genre,
      readingStatus: node.readingStatus,
      // Use book cover as node image, fallback to colored dot
      shape: node.coverUrl ? "circularImage" : "dot",
      image: node.coverUrl || undefined,
      color: node.coverUrl ? undefined : {
        background: node.color,
        border: node.color,
      },
      size: node.size * 1.5, // Larger for images
      font: {
        size: 16,
        color: node.coverUrl ? "#000000" : "#ffffff", // Black for images, white for colored dots
        face: "Arial, sans-serif",
        strokeWidth: 0,
        background: "rgba(255, 255, 255, 0.8)", // Text background for readability
      },
      borderWidth: 2,
    }));

    // Build edges for vis-network
    const visEdges: BiblioEdge[] = graphData.edges.map(edge => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      strength: edge.strength,
      width: edge.width,
      color: edge.color,
    }));

    // Update data sets
    nodesRef.current.clear();
    nodesRef.current.add(visNodes);

    edgesRef.current.clear();
    edgesRef.current.add(visEdges);

    // Initialize or update network
    if (!networkRef.current) {
      const options: Options = {
        nodes: {
          // Don't set shape globally - let each node specify its own
          borderWidth: 2,
          borderWidthSelected: 4,
          // Default font (overridden per node)
          font: {
            size: 16,
            color: "#000000",
            face: "Arial, sans-serif",
            background: "rgba(232, 228, 220, 0.9)", // Match background with slight transparency
          },
        },
        edges: {
          width: 1,
          color: { color: "#9ca3af", highlight: "#3b82f6" },
          smooth: { enabled: true, type: "continuous", roundness: 0.5 },
          selectionWidth: 2,
        },
        physics: {
          stabilization: false,
          barnesHut: {
            gravitationalConstant: -3000,
            springConstant: 0.04,
          },
        },
        interaction: {
          hover: true,
          multiselect: false,
          tooltipDelay: 100,
        },
      };

      const data: Data = {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      };

      networkRef.current = new Network(containerRef.current, data, options);

      // Event handlers
      networkRef.current.on("click", (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodesRef.current?.get(nodeId) as BiblioNode | undefined;
          if (node) {
            // Extract bookId from "book-{id}" format or use directly
            const bookId = typeof node.id === "number" ? node.id : node.bookId;
            onBookSelect({
              id: bookId,
              title: node.title,
              author: node.author,
              coverUrl: node.coverUrl,
            });
          }
        }
      });

      networkRef.current.on("doubleClick", (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodesRef.current?.get(nodeId) as BiblioNode | undefined;
          if (node) {
            const bookId = typeof node.id === "number" ? node.id : node.bookId;
            onDoubleClick({
              id: bookId,
              title: node.title,
              author: node.author,
              coverUrl: node.coverUrl,
            });
          }
        }
      });

      // Handle keyboard
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && mode === "isolated") {
          window.dispatchEvent(new CustomEvent("exit-isolated"));
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else {
      // Network already exists, just fit it
      networkRef.current.fit();
    }
  }, [graphData, mode, onBookSelect, onDoubleClick]);

  // Loading state
  if (dataLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: "#e8e4dc" }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-800">Loading graph...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || queryError) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: "#e8e4dc" }}>
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Graph</h3>
          <p className="text-gray-700 mb-4">{error || queryError?.message || "Unknown error"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: "#e8e4dc" }}>
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 01-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No books in graph</h3>
          <p className="text-gray-700 mb-4">
            {graphData ? "No books match your current filters." : "Unable to load graph data."}
          </p>
          <button
            onClick={() => window.location.href = "/library"}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "500px", backgroundColor: "#e8e4dc" }} // Darker earthy beige
    />
  );
}
