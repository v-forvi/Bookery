/**
 * Notifications Service
 *
 * Manages in-app notifications for patrons.
 */

import { eq, desc, and } from "drizzle-orm";
import type { Notification, NewNotification } from "../schema";
import { notifications } from "../schema";
import { db } from "../db";

export type NotificationType = 'borrow_confirmed' | 'return_confirmed' | 'loan_reminder' | 'request_rejected';

export interface CreateNotificationInput {
  patronId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Notifications Service
 */
export class NotificationsService {
  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        patronId: input.patronId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      })
      .returning();

    return notification;
  }

  /**
   * Get notifications for a patron
   */
  async getForPatron(patronId: number, limit = 50) {
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(eq(notifications.patronId, patronId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return notificationsList;
  }

  /**
   * Get unread notifications for a patron
   */
  async getUnreadForPatron(patronId: number, limit = 50) {
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.patronId, patronId),
          eq(notifications.read, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return notificationsList;
  }

  /**
   * Get unread count for a patron
   */
  async getUnreadCount(patronId: number): Promise<number> {
    const [result] = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.patronId, patronId),
          eq(notifications.read, false)
        )
      );

    return Number(result?.count || 0);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return updated;
  }

  /**
   * Mark all notifications as read for a patron
   */
  async markAllAsRead(patronId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.patronId, patronId));
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Helper: Create borrow confirmed notification
   */
  async notifyBorrowConfirmed(patronId: number, bookTitle: string): Promise<Notification> {
    return this.create({
      patronId,
      type: 'borrow_confirmed',
      title: 'Borrow Request Confirmed',
      message: `Your request to borrow "${bookTitle}" has been confirmed. Please pick it up from the librarian.`,
      link: '/my-loans',
    });
  }

  /**
   * Helper: Create return confirmed notification
   */
  async notifyReturnConfirmed(patronId: number, bookTitle: string): Promise<Notification> {
    return this.create({
      patronId,
      type: 'return_confirmed',
      title: 'Return Confirmed',
      message: `"${bookTitle}" has been returned. Thank you!`,
      link: '/my-loans',
    });
  }

  /**
   * Helper: Create request rejected notification
   */
  async notifyRequestRejected(patronId: number, bookTitle: string): Promise<Notification> {
    return this.create({
      patronId,
      type: 'request_rejected',
      title: 'Request Not Available',
      message: `Your request for "${bookTitle}" could not be fulfilled. Please contact the librarian for more information.`,
    });
  }
}

// Singleton instance
export const notificationsService = new NotificationsService();
