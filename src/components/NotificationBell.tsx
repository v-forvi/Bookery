"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/client/trpc";
import { usePatronAuth } from "@/components/PatronAuthContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const router = useRouter();
  const { isRegistered } = usePatronAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.getMyUnreadCount.useQuery(undefined, {
    enabled: isRegistered,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const { data: notifications, refetch } = trpc.notifications.getMyUnread.useQuery(
    { limit: 10 },
    {
      enabled: isOpen && isRegistered,
    }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleClick = (link?: string) => {
    setIsOpen(false);
    if (link) {
      router.push(link);
    }
  };

  if (!isRegistered) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <button className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unreadCount && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!notifications || notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleClick(notification.link || undefined)}
              >
                <div className="flex-1 w-full">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt || ''), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 ml-2"
                >
                  Mark read
                </button>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
