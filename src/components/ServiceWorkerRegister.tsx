"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegister() {
  const [swReady, setSwReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingSw, setWaitingSw] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration.scope);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
                setUpdateAvailable(true);
                setWaitingSw(newWorker);
              }
            });
          }
        });

        setSwReady(true);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });

    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Reload the page when new service worker takes control
      window.location.reload();
    });
  }, []);

  const handleUpdateClick = () => {
    if (waitingSw) {
      // Tell the new service worker to skip waiting and become active
      waitingSw.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <>
      {/* PWA Install Prompt */}
      {swReady && !navigator.serviceWorker.controller && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
          <div className="bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium">Install Bookery as an app</p>
            <p className="text-xs opacity-90 mt-1">
              Add to home screen for quick access
            </p>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New version available</p>
              <p className="text-xs opacity-90">Refresh to get the latest features</p>
            </div>
            <button
              onClick={handleUpdateClick}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
