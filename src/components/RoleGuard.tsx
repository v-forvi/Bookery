'use client';

import { usePatronAuth } from './PatronAuthContext';
import { Shield, User } from 'lucide-react';

/**
 * LibrarianOnly - Renders children only for librarians
 * Use for admin-only features like patron management
 */
export function LibrarianOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isLibrarian, isLoading } = usePatronAuth();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isLibrarian) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * PatronOnly - Renders children only for non-librarian patrons
 * Use for patron-specific features
 */
export function PatronOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isLibrarian, isRegistered, isLoading } = usePatronAuth();

  if (isLoading || !isRegistered) {
    return <>{fallback}</>;
  }

  if (isLibrarian) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * RoleBadge - Displays the user's role with an icon
 */
export function RoleBadge({
  className = '',
}: {
  className?: string;
}) {
  const { isLibrarian, isRegistered } = usePatronAuth();

  if (!isRegistered) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isLibrarian
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
      } ${className}`}
    >
      {isLibrarian ? (
        <>
          <Shield className="h-3 w-3" />
          Librarian
        </>
      ) : (
        <>
          <User className="h-3 w-3" />
          Patron
        </>
      )}
    </div>
  );
}

/**
 * LibrarianBadge - Small badge to identify librarian features
 */
export function LibrarianBadge({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ${className}`}
    >
      <Shield className="h-3 w-3" />
      Librarian
    </div>
  );
}

/**
 * ForLibrarianEyesOnly - Shows a message to non-librarians
 * Useful for indicating restricted access
 */
export function ForLibrarianEyesOnly({
  message = 'This feature is only available to librarians',
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <Shield className="h-8 w-8 text-zinc-400" />
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}
