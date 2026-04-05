'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTelegram } from './TelegramProvider';
import { trpc } from '@/client/trpc';
import { PatronRegistrationModal } from './PatronRegistrationModal';

export interface Patron {
  id: number;
  telegramId: number;
  telegramUsername: string | null;
  fullName: string;
  phoneNumber: string;
  dateRegistered: string;
  isLibrarian: boolean;
}

interface PatronAuthContextType {
  patron: Patron | null;
  isLoading: boolean;
  isRegistered: boolean;
  isLibrarian: boolean;
  needsRegistration: boolean;
  refreshPatron: () => void;
}

const PatronAuthContext = createContext<PatronAuthContextType>({
  patron: null,
  isLoading: true,
  isRegistered: false,
  isLibrarian: false,
  needsRegistration: false,
  refreshPatron: () => {},
});

export function usePatronAuth() {
  return useContext(PatronAuthContext);
}

export function PatronAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: telegramUser, isReady: telegramReady, isTelegram } = useTelegram();
  const [patron, setPatron] = useState<Patron | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current patron using Telegram auth (from headers)
  // The 'me' endpoint uses telegramAuth middleware which extracts telegramId from headers
  const { data: patronData, refetch } = trpc.patrons.me.useQuery(undefined, {
    enabled: mounted && telegramReady && isTelegram && !!telegramUser?.id,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isTelegram || !telegramReady) {
      // Not in Telegram - no patron needed
      setPatron(null);
      setIsLoading(false);
      return;
    }

    if (patronData !== undefined) {
      setPatron(patronData || null);
      setIsLoading(false);
    }
  }, [patronData, isTelegram, telegramReady]);

  const isRegistered = !!patron;
  const isLibrarian = patron?.isLibrarian || false;
  const needsRegistration = telegramReady && isTelegram && !!telegramUser && !isRegistered;

  const refreshPatron = () => {
    refetch();
  };

  return (
    <PatronAuthContext.Provider
      value={{
        patron,
        isLoading,
        isRegistered,
        isLibrarian,
        needsRegistration,
        refreshPatron,
      }}
    >
      {children}
    </PatronAuthContext.Provider>
  );
}

/**
 * Guard component that shows registration modal when needed
 * Only shows in Telegram Mini App when user is not registered
 */
export function PatronRegistrationGuard() {
  const { needsRegistration } = usePatronAuth();

  // For web (non-Telegram), don't show registration
  const { isTelegram } = useTelegram();
  if (!isTelegram) return null;

  return (
    <PatronRegistrationModal
      isOpen={needsRegistration}
      onClose={() => {
        // Can't close - registration is required in Telegram Mini App
      }}
    />
  );
}
