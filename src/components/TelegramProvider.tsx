'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getTelegramUser, initTelegramWebApp, isTelegramMiniApp, type TelegramUser } from '@/lib/telegram';

interface TelegramContextType {
  user: TelegramUser | null;
  isReady: boolean;
  isTelegram: boolean;
  isInTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  isReady: false,
  isTelegram: false,
  isInTelegram: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    // Check if running in Telegram Mini App
    const inTelegram = isTelegramMiniApp();
    setIsTelegram(inTelegram);

    if (inTelegram) {
      // Initialize Telegram WebApp
      const webApp = initTelegramWebApp();

      if (webApp) {
        // Get user data from Telegram
        const telegramUser = getTelegramUser();
        setUser(telegramUser || null);

        // Apply Telegram theme
        const root = document.documentElement;
        if (webApp.themeParams.bg_color) {
          root.style.setProperty('--background', webApp.themeParams.bg_color);
        }
        if (webApp.themeParams.text_color) {
          root.style.setProperty('--foreground', webApp.themeParams.text_color);
        }
        if (webApp.themeParams.button_color) {
          root.style.setProperty('--primary', webApp.themeParams.button_color);
        }
        if (webApp.themeParams.button_text_color) {
          root.style.setProperty('--primary-foreground', webApp.themeParams.button_text_color);
        }

        // Note: Theme changes are handled automatically by Telegram
        // The webApp.themeParams are updated automatically when theme changes
      }
    }

    setIsReady(true);
  }, []);

  return (
    <TelegramContext.Provider value={{ user, isReady, isTelegram, isInTelegram: isTelegram }}>
      {children}
    </TelegramContext.Provider>
  );
}
