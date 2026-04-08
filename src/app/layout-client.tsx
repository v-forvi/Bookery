"use client";

import * as React from "react";
import { MobileNav } from "@/components/MobileNav";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { PatronRegistrationModal } from "@/components/PatronRegistrationModal";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const { needsRegistration } = usePatronAuth();
  const [showRegistration, setShowRegistration] = React.useState(false);

  // Show registration modal when needed (only for new Telegram users)
  React.useEffect(() => {
    if (needsRegistration) {
      // Small delay to ensure Telegram WebApp is ready
      const timer = setTimeout(() => {
        setShowRegistration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsRegistration]);

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    // Reload the page to refetch patron data with new registration
    window.location.reload();
  };

  return (
    <>
      {children}
      <MobileNav />
      <PatronRegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
}
