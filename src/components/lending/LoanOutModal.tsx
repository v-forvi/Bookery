'use client';

import { useState, useEffect } from 'react';
import { trpc as api } from '@/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Book } from '@/server/schema';
import { ScanMethodSelector } from './ScanMethodSelector';
import { ManualBookSearch } from './ManualBookSearch';

interface LoanOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedBook?: Book | null;
}

type Step = 'select-method' | 'scanning' | 'confirm';

export function LoanOutModal({ isOpen, onClose, onSuccess, preselectedBook }: LoanOutModalProps) {
  const [step, setStep] = useState<Step>('select-method');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [personName, setPersonName] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const loanOutMutation = api.loans.loanOut.useMutation();

  // When preselectedBook changes, skip directly to confirm step
  useEffect(() => {
    if (preselectedBook) {
      setSelectedBook(preselectedBook);
      setStep('confirm');
    } else {
      setSelectedBook(null);
      setStep('select-method');
    }
  }, [preselectedBook, isOpen]);

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedBook || !personName.trim()) return;

    setLoading(true);

    try {
      await loanOutMutation.mutateAsync({
        bookId: selectedBook.id,
        personName: personName.trim(),
        loanDate,
        notes: notes.trim() || undefined,
      });

      setSelectedBook(null);
      setPersonName('');
      setNotes('');
      setStep('select-method');

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Loan out failed:', error);
      alert(error.message || 'Failed to loan out book');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedBook(null);
    setPersonName('');
    setNotes('');
    setStep('select-method');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'select-method' && (
          <>
            <DialogHeader>
              <DialogTitle>Loan Out Book</DialogTitle>
              <DialogDescription>
                Choose how to identify the book you want to loan out.
              </DialogDescription>
            </DialogHeader>

            <ScanMethodSelector
              onSelect={(method) => {
                setStep('scanning');
              }}
            />
          </>
        )}

        {step === 'scanning' && (
          <>
            <DialogHeader>
              <DialogTitle>Find Book to Loan</DialogTitle>
              <DialogDescription>
                Search for the book in your library.
              </DialogDescription>
            </DialogHeader>

            <ManualBookSearch
              onSelect={handleBookSelect}
              onCancel={() => setStep('select-method')}
            />
          </>
        )}

        {step === 'confirm' && selectedBook && (
          <>
            <DialogHeader>
              <DialogTitle>Loan Out Book</DialogTitle>
              <DialogDescription>
                Found: <strong>{selectedBook.title}</strong> by {selectedBook.author}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="person-name" className="text-sm font-medium">
                  Loan to <span className="text-red-500">*</span>
                </label>
                <Input
                  id="person-name"
                  placeholder="Enter person's name"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="loan-date" className="text-sm font-medium">
                  Loan Date
                </label>
                <Input
                  id="loan-date"
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="Any conditions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              {preselectedBook ? (
                // When book is preselected (from book detail page), back button closes modal
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setStep('select-method')}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                disabled={!personName.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Loan
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
