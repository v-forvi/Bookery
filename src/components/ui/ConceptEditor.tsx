// src/components/ui/ConceptEditor.tsx

"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface ConceptEditorProps {
  bookId: number;
  concepts: Array<{
    id: number;
    name: string;
    domain: string;
    weight: number;
  }>;
  onAdd: (name: string, weight: number) => void;
  onRemove: (conceptId: number) => void;
  onWeightChange: (conceptId: number, weight: number) => void;
}

export function ConceptEditor({
  bookId,
  concepts,
  onAdd,
  onRemove,
  onWeightChange,
}: ConceptEditorProps) {
  const [newConceptName, setNewConceptName] = useState("");
  const [newConceptDomain, setNewConceptDomain] = useState("general");
  const [newConceptWeight, setNewConceptWeight] = useState(50);

  const domains = [
    "general",
    "philosophy",
    "psychology",
    "biology",
    "science",
    "history",
    "literature",
    "art",
    "religion",
    "sociology",
    "economics",
    "politics",
  ];

  const handleAdd = () => {
    if (newConceptName.trim()) {
      onAdd(newConceptName.trim(), newConceptWeight);
      setNewConceptName("");
      setNewConceptWeight(50);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Concepts */}
      {concepts && concepts.length > 0 && (
        <div className="space-y-2">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <input
                  type="text"
                  value={concept.name}
                  disabled
                  className="w-full px-2 py-1 border rounded bg-white text-sm"
                />
                <span className="text-xs text-gray-500 ml-2">{concept.domain}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={concept.weight}
                onChange={(e) => onWeightChange(concept.id, parseInt(e.target.value))}
                className="w-16"
                title={`Weight: ${concept.weight}%`}
              />
              <button
                onClick={() => onRemove(concept.id)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Remove concept"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Concept */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="New concept..."
          value={newConceptName}
          onChange={(e) => setNewConceptName(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <select
          value={newConceptDomain}
          onChange={(e) => setNewConceptDomain(e.target.value)}
          className="px-2 py-2 border rounded-lg"
        >
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="range"
          min="0"
          max="100"
          value={newConceptWeight}
          onChange={(e) => setNewConceptWeight(parseInt(e.target.value))}
          className="w-16"
          title={`Weight: ${newConceptWeight}%`}
        />
        <button
          onClick={handleAdd}
          disabled={!newConceptName.trim()}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add concept"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
