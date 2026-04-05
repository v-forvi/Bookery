/**
 * Telegram Mini App integration utilities
 */

// Telegram WebApp types (based on @twa-dev/sdk)
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string | null;
  backgroundColor: string | null;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(show: boolean): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  expand(): void;
  close(): void;
  ready(): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
}

export interface TelegramInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

// Get Telegram WebApp instance
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

// Initialize Telegram WebApp
export function initTelegramWebApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (webApp) {
    // Tell Telegram we're ready
    webApp.ready();
    // Expand to full height
    webApp.expand();
    // Enable closing confirmation
    webApp.enableClosingConfirmation();
    // Set theme
    document.documentElement.setAttribute('data-theme', webApp.colorScheme);
  }
  return webApp;
}

// Get current user from Telegram
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe.user || null;
}

// Check if running inside Telegram
export function isTelegramMiniApp(): boolean {
  return getTelegramWebApp() !== null;
}

// Request phone number (triggers Telegram's one-time approval dialog)
export function requestPhoneNumber(): void {
  const webApp = getTelegramWebApp();
  if (webApp?.MainButton) {
    // This will be handled by Telegram's native UI
    // when the user clicks a button with special request_phone=true attribute
  }
}

// Show back button
export function showBackButton(onClick: () => void): void {
  const webApp = getTelegramWebApp();
  if (webApp?.BackButton) {
    webApp.BackButton.show();
    webApp.BackButton.onClick(onClick);
  }
}

// Hide back button
export function hideBackButton(): void {
  const webApp = getTelegramWebApp();
  if (webApp?.BackButton) {
    webApp.BackButton.hide();
  }
}

// Haptic feedback
export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
  const webApp = getTelegramWebApp();
  webApp?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotification(type: 'error' | 'success' | 'warning'): void {
  const webApp = getTelegramWebApp();
  webApp?.HapticFeedback?.notificationOccurred(type);
}

export function hapticSelection(): void {
  const webApp = getTelegramWebApp();
  webApp?.HapticFeedback?.selectionChanged();
}
