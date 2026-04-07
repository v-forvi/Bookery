"use client";

import { usePatronAuth } from "./PatronAuthContext";
import { LibrarianOnly } from "./RoleGuard";
import { Shield, User } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Role Switcher - allows librarians to toggle "View as Patron" mode
 * This appears in the header and lets librarians experience the patron UI
 *
 * Uses actual=true so the switcher is always visible to actual librarians,
 * even when they're currently viewing as a patron.
 */
export function RoleSwitcher() {
  const { isLibrarian, viewAsPatron, setViewAsPatron } = usePatronAuth();

  return (
    <LibrarianOnly actual={true}>
      <Button
        variant={viewAsPatron ? "default" : "outline"}
        size="sm"
        onClick={() => setViewAsPatron(!viewAsPatron)}
        className="flex items-center gap-2"
      >
        {viewAsPatron ? (
          <>
            <User className="h-4 w-4" />
            Viewing as Patron
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Librarian View
          </>
        )}
      </Button>
    </LibrarianOnly>
  );
}
