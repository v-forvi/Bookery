'use client';

import { useState } from 'react';
import { X, User, Phone, Loader2 } from 'lucide-react';
import { useTelegram } from './TelegramProvider';
import { trpc } from '@/client/trpc';
import { usePatronAuth } from './PatronAuthContext';

interface PatronRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatronRegistrationModal({ isOpen, onClose }: PatronRegistrationModalProps) {
  const { user: telegramUser } = useTelegram();
  const { refreshPatron } = usePatronAuth();
  const registerPatron = trpc.patrons.register.useMutation();

  const [fullName, setFullName] = useState(telegramUser?.first_name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      refreshPatron();
      onClose();
    } catch (err) {
      setError('Failed to register. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestPhoneNumber = () => {
    // In Telegram Mini App, this would trigger the native phone number request
    // For now, we'll show the input field
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp?.requestPhoneNumber) {
      // This would trigger Telegram's phone number dialog
      // For now, we rely on manual input
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Register as Patron</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            <p>Welcome to Bookery! Please register to access the library.</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              For contact regarding book loans
            </p>
          </div>

          {/* Telegram Info */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-600">
              <strong>Telegram:</strong> {telegramUser.first_name} {telegramUser.last_name}
              {telegramUser.username && ` (@${telegramUser.username})`}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
