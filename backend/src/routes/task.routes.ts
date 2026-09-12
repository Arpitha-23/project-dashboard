import { Router, Request, Response } from "express";
import { z } from "zod";
import { Priority, Role, TaskStatus } from "@prisma/client";

import { authenticate } from "../middleware/auth.middleware";

import {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  getRecentActivities,
} from "../services/task.service";

const router = Router();

/* =========================================================
   CREATE TASK
   POST /api/tasks
========================================================= */

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.number().int().positive(),
  developerId: z.number().int().positive(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime(),
});

router.post(
  "/",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const result = createTaskSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid task data",
          errors: result.error.flatten(),
        });
      }

      const task = await createTask(
        req.user!.userId,
        req.user!.role,
        {
          ...result.data,
          dueDate: new Date(result.data.dueDate),
        }
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

      return res.status(403).json({
        success: false,
        message,
      });
    }
  }
);


/* =========================================================
   GET RECENT ACTIVITIES
   GET /api/tasks/activities/recent

   IMPORTANT:
   This route MUST appear before /:taskId
========================================================= */

router.get(
  "/activities/recent",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const activities = await getRecentActivities(
        req.user!.userId,
        req.user!.role
      );

      return res.status(200).json({
        success: true,
        activities,
      });
    } catch (error) {
      console.error("Recent activities error:", error);

      return res.status(403).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load activities",
      });
    }
  }
);


/* =========================================================
   GET ALL TASKS
   GET /api/tasks

   Filters:
   ?status=IN_PROGRESS
   ?priority=HIGH
   ?dueDateFrom=2026-09-01
   ?dueDateTo=2026-09-30
========================================================= */

router.get(
  "/",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const status =
        typeof req.query.status === "string"
          ? req.query.status
          : undefined;

      const priority =
        typeof req.query.priority === "string"
          ? req.query.priority
          : undefined;

      const dueDateFrom =
        typeof req.query.dueDateFrom === "string"
          ? req.query.dueDateFrom
          : undefined;

      const dueDateTo =
        typeof req.query.dueDateTo === "string"
          ? req.query.dueDateTo
          : undefined;

      if (
        status &&
        !Object.values(TaskStatus).includes(
          status as TaskStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      if (
        priority &&
        !Object.values(Priority).includes(
          priority as Priority
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      const tasks = await getTasks(
        req.user!.userId,
        req.user!.role,
        {
          status: status as TaskStatus | undefined,
          priority: priority as Priority | undefined,
          dueDateFrom: dueDateFrom
            ? new Date(dueDateFrom)
            : undefined,
          dueDateTo: dueDateTo
            ? new Date(dueDateTo)
            : undefined,
        }
      );

      return res.status(200).json({
        success: true,
        tasks,
      });
    } catch (error) {
      console.error("Get tasks error:", error);

      return res.status(403).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch tasks",
      });
    }
  }
);


/* =========================================================
   GET SINGLE TASK
   GET /api/tasks/:taskId
========================================================= */

router.get(
  "/:taskId",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.taskId);

      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      const task = await getTaskById(
        taskId,
        req.user!.userId,
        req.user!.role
      );

      return res.status(200).json({
        success: true,
        task,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch task";

      return res.status(403).json({
        success: false,
        message,
      });
    }
  }
);


/* =========================================================
   UPDATE TASK STATUS
   PATCH /api/tasks/:taskId/status
========================================================= */

const updateStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

router.patch(
  "/:taskId/status",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.taskId);

      if (!Number.isInteger(taskId) || taskId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      const result =
        updateStatusSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
          errors: result.error.flatten(),
        });
      }

      const task = await updateTaskStatus(
        taskId,
        req.user!.userId,
        req.user!.role,
        result.data.status
      );

      return res.status(200).json({
        success: true,
        message: "Task status updated successfully",
        task,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update task status";

      return res.status(403).json({
        success: false,
        message,
      });
    }
  }
);


export default router;