import { Request, Response } from "express";
import { z } from "zod";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service";

const idSchema = z.coerce.number().int().positive();

export async function list(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const notifications = await getNotifications(userId);

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
}

export async function unreadCount(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const count = await getUnreadNotificationCount(userId);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification count",
    });
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await markNotificationRead(
      parsedId.data,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to mark notification";

    if (message === "Notification not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification",
    });
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const result = await markAllNotificationsRead(
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications",
    });
  }
}