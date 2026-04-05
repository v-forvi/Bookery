"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", handler);

    // Also check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // Already installed
      return;
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA installed");
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Remember that user dismissed - don't show again for this session
    sessionStorage.setItem("pwa-install-dismissed", "true");
  };

  // Don't show if user dismissed
  useEffect(() => {
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setShowBanner(false);
    }
  }, []);

  if (!deferredPrompt) return null;

  return (
    <>
      {/* Install Banner (shows on first visit) */}
      {showBanner && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-purple-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <span className="font-medium">Install Bookery as an app</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-purple-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Install Button (in nav) */}
      {!showBanner && (
        <Button
          onClick={handleInstall}
          variant="outline"
          size="sm"
          className="relative"
        >
          <Download className="h-4 w-4 mr-2" />
          Install App
        </Button>
      )}
    </>
  );
}
