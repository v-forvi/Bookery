'use client';

import { useState } from 'react';
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
import { Loader2, RotateCcw } from 'lucide-react';
import { Book } from '@/server/schema';
import { ScanMethodSelector } from './ScanMethodSelector';
import { ManualBookSearch } from './ManualBookSearch';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'select-method' | 'scanning' | 'confirm';

export function ReturnModal({ isOpen, onClose, onSuccess }: ReturnModalProps) {
  const [step, setStep] = useState<Step>('select-method');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnNotes, setReturnNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const returnLoanMutation = api.loans.returnLoan.useMutation();
  const { data: activeLoans } = api.loans.getActive.useQuery();

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);

    if (activeLoans) {
      const loan = [...activeLoans.loansOut, ...activeLoans.loansIn]
        .find((l: any) => l.book.id === book.id && l.loan.returnDate === null);

      if (loan) {
        setActiveLoan(loan);
      }
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    if (!selectedBook) return;

    setLoading(true);

    try {
      await returnLoanMutation.mutateAsync({
        bookId: selectedBook.id,
        returnDate,
        returnNotes: returnNotes.trim() || undefined,
      });

      setSelectedBook(null);
      setActiveLoan(null);
      setReturnNotes('');
      setStep('select-method');

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Return failed:', error);
      alert(error.message || 'Failed to return book');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedBook(null);
    setActiveLoan(null);
    setReturnNotes('');
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
              <DialogTitle>Return Book</DialogTitle>
              <DialogDescription>
                Choose how to identify the book being returned.
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
              <DialogTitle>Find Book to Return</DialogTitle>
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
              <DialogTitle>Return Book</DialogTitle>
              <DialogDescription>
                {activeLoan ? (
                  <>Confirm return from <strong>{activeLoan.personName}</strong>?</>
                ) : (
                  <>
                    Found: <strong>{selectedBook.title}</strong>
                    <br />
                    <span className="text-amber-600">
                      This book shows as available. Was it loaned out?
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="return-date" className="text-sm font-medium">
                  Return Date
                </label>
                <Input
                  id="return-date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="return-notes" className="text-sm font-medium">
                  Return Notes (optional)
                </label>
                <Textarea
                  id="return-notes"
                  placeholder="Condition: Good / Fair / Damage..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep('select-method')}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Confirm Return
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
