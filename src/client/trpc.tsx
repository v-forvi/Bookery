"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/root";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { httpBatchLink } from "@trpc/client";
import { getTelegramUser } from "@/lib/telegram";

export const trpc = createTRPCReact<AppRouter>();

interface TRPCProviderProps {
  children: ReactNode;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds — prevents cascade refetch storms
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on mount if data is cached
      },
    },
  }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers: () => {
            // Add Telegram ID to headers for authentication
            const telegramUser = getTelegramUser();
            console.log('[tRPC] telegramUser:', telegramUser);
            if (telegramUser?.id) {
              console.log('[tRPC] Sending x-telegram-id:', telegramUser.id);
              return {
                "x-telegram-id": telegramUser.id.toString(),
              };
            }
            console.log('[tRPC] No telegram user found');
            return {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
