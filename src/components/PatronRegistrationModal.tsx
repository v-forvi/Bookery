'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, Phone, Loader2 } from 'lucide-react';
import { useTelegram } from './TelegramProvider';
import { trpc } from '@/client/trpc';

interface PatronRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PatronRegistrationModal({ isOpen, onClose, onSuccess }: PatronRegistrationModalProps) {
  const { user: telegramUser } = useTelegram();
  const registerPatron = trpc.patrons.register.useMutation();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(telegramUser?.first_name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !telegramUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please provide a phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerPatron.mutateAsync({
        telegramId: telegramUser.id,
        telegramUsername: telegramUser.username,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Failed to register. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Register as Patron</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <p>Welcome to Bookery! Please register to access the library.</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                ref={nameInputRef}
                type="text"
                inputMode="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                ref={phoneInputRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full pl-10 pr-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              For contact regarding book loans
            </p>
          </div>

          {/* Telegram Info */}
          <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-200">Telegram:</strong> {telegramUser.first_name} {telegramUser.last_name || ''}
              {telegramUser.username && ` (@${telegramUser.username})`}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-700 dark:text-zinc-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !phoneNumber.trim()}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
