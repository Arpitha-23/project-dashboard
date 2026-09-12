import prisma from "../lib/prisma";
import { getSocketIO } from "../lib/socket";

export async function createNotification(
  userId: number,
  message: string
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });

  try {
    const io = getSocketIO();

    io.to(`user:${userId}`).emit(
      "notification:new",
      notification
    );

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    io.to(`user:${userId}`).emit(
      "notification:count",
      unreadCount
    );
  } catch {
    // Socket.IO may not be initialized during some backend operations.
  }

  return notification;
}

export async function getNotifications(userId: number) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getUnreadNotificationCount(userId: number) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markNotificationRead(
  notificationId: number,
  userId: number
) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllNotificationsRead(userId: number) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}