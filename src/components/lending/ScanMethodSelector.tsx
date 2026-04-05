'use client';

import { Button } from '@/components/ui/button';

type ScanMethod = 'cover' | 'barcode' | 'manual';

interface ScanMethodSelectorProps {
  onSelect: (method: ScanMethod) => void;
  title?: string;
}

export function ScanMethodSelector({ onSelect, title = "How would you like to identify this book?" }: ScanMethodSelectorProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-6">
      <p className="text-lg font-medium text-center">{title}</p>

      <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
        <Button
          onClick={() => onSelect('cover')}
          variant="outline"
          className="flex items-center gap-2 h-16 text-base"
        >
          <span className="text-2xl">📷</span>
          <span>Scan Cover</span>
        </Button>

        <Button
          onClick={() => onSelect('barcode')}
          variant="outline"
          className="flex items-center gap-2 h-16 text-base"
        >
          <span className="text-2xl">📊</span>
          <span>Scan Barcode</span>
        </Button>

        <Button
          onClick={() => onSelect('manual')}
          variant="outline"
          className="flex items-center gap-2 h-16 text-base"
        >
          <span className="text-2xl">🔍</span>
          <span>Manual Search</span>
        </Button>
      </div>
    </div>
  );
}
