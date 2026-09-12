import { Request, Response } from "express";
import { z } from "zod";
import { Priority, TaskStatus } from "@prisma/client";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
} from "../services/task.service";

const createTaskSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  projectId: z.number().int().positive(),
  developerId: z.number().int().positive(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date(),
});

const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
});

export async function create(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = createTaskSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid task data",
      });
    }

    const task = await createTask(
      req.user.userId,
      req.user.role,
      result.data
    );

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create task";

    if (message === "Project not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message === "Developer not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message.includes("permission")) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function list(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = taskFilterSchema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid task filters",
      });
    }

    const tasks = await getTasks(
      req.user.userId,
      req.user.role,
      result.data
    );

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch tasks";

    if (message.includes("permission")) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
export async function getById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await getTaskById(
      taskId,
      req.user.userId,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch task";

    if (message === "Task not found") {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (message.includes("permission")) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
export async function updateStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const taskId = Number(req.params.id);

    const schema = z.object({
      status: z.nativeEnum(TaskStatus),
    });

    const result = schema.safeParse(req.body);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const task = await updateTaskStatus(
      taskId,
      req.user.userId,
      req.user.role,
      result.data.status
    );

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update task";

    if (message === "Task not found") {
      return res.status(404).json({ success: false, message });
    }

    if (message.includes("permission")) {
      return res.status(403).json({ success: false, message });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}