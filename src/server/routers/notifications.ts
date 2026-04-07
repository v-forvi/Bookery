/**
 * Notifications Router
 *
 * tRPC procedures for managing patron notifications.
 */

import { z } from "zod";
import { router } from "../trpc";
import { telegramRegisteredProcedure } from "../procedures";
import { notificationsService } from "../services/notifications.service";

export const notificationsRouter = router({
  // Get all notifications for current patron
  getMyNotifications: telegramRegisteredProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return await notificationsService.getForPatron(ctx.patron!.id, input.limit);
    }),

  // Get unread notifications for current patron
  getMyUnread: telegramRegisteredProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return await notificationsService.getUnreadForPatron(ctx.patron!.id, input.limit);
    }),

  // Get unread count for current patron
  getMyUnreadCount: telegramRegisteredProcedure
    .query(async ({ ctx }) => {
      return await notificationsService.getUnreadCount(ctx.patron!.id);
    }),

  // Mark notification as read
  markAsRead: telegramRegisteredProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await notificationsService.markAsRead(input.notificationId);
    }),

  // Mark all notifications as read
  markAllAsRead: telegramRegisteredProcedure
    .mutation(async ({ ctx }) => {
      await notificationsService.markAllAsRead(ctx.patron!.id);
      return { success: true };
    }),

  // Delete a notification
  delete: telegramRegisteredProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await notificationsService.delete(input.notificationId);
      return { success: true };
    }),
});
