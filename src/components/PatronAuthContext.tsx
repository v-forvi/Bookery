'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTelegram } from './TelegramProvider';
import { trpc } from '@/client/trpc';

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
  isLibrarian: boolean; // Effective role (respects viewAsPatron toggle)
  isPatron: boolean; // true if registered but not a librarian (effective)
  actualIsLibrarian: boolean; // Real librarian status (NOT affected by view toggle)
  needsRegistration: boolean;
  viewAsPatron: boolean; // Librarian-only toggle to view as patron
  setViewAsPatron: (value: boolean) => void;
  refreshPatron: () => void;
}

const PatronAuthContext = createContext<PatronAuthContextType>({
  patron: null,
  isLoading: true,
  isRegistered: false,
  isLibrarian: false,
  isPatron: false,
  actualIsLibrarian: false,
  needsRegistration: false,
  viewAsPatron: false,
  setViewAsPatron: () => {},
  refreshPatron: () => {},
});

export function usePatronAuth() {
  return useContext(PatronAuthContext);
}

export function PatronAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: telegramUser, isReady: telegramReady, isTelegram } = useTelegram();
  const [mounted, setMounted] = useState(false);
  const [viewAsPatron, setViewAsPatron] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldQuery = mounted && telegramReady && isTelegram && !!telegramUser?.id;

  const { data: patronData, isLoading: isQueryLoading, refetch } = trpc.patrons.me.useQuery(undefined, {
    enabled: shouldQuery,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
    staleTime: 60 * 1000, // Cache for 60s — patron data doesn't change often
  });

  // Derive everything — no useState mirrors that cause extra render cycles
  const isLoading = shouldQuery && isQueryLoading;
  const patron = patronData ?? null;
  const isRegistered = !!patron;
  const actualIsLibrarian = patron?.isLibrarian ?? false; // Real librarian status from DB
  const isPatron = isRegistered && !actualIsLibrarian;
  const needsRegistration = !isLoading && telegramReady && isTelegram && !!telegramUser && !isRegistered;

  // Effective role based on view toggle
  const effectiveIsLibrarian = actualIsLibrarian && !viewAsPatron;
  const effectiveIsPatron = (isPatron || (actualIsLibrarian && viewAsPatron));

  const refreshPatron = () => {
    refetch();
  };

  return (
    <PatronAuthContext.Provider
      value={{
        patron,
        isLoading,
        isRegistered,
        isLibrarian: effectiveIsLibrarian,
        isPatron: effectiveIsPatron,
        actualIsLibrarian, // Real status, not affected by view toggle
        needsRegistration,
        viewAsPatron,
        setViewAsPatron,
        refreshPatron,
      }}
    >
      {children}
    </PatronAuthContext.Provider>
  );
}

/**
 * Registration guard - DISABLED, returns null
 * Manual registration will be handled separately
 */
export function PatronRegistrationGuard() {
  return null;
}
