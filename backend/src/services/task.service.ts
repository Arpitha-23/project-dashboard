
import prisma from "../lib/prisma";
import { Priority, Role, TaskStatus } from "@prisma/client";
import { emitActivity } from "../lib/socket";
import { createNotification } from "./notification.service";

interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: number;
  developerId: number;
  status?: TaskStatus;
  priority?: Priority;
  dueDate: Date;
}

/**
 * Create a new task.
 * Admin can create tasks for any project.
 * Project Manager can create tasks only for their own projects.
 */
export async function createTask(
  userId: number,
  role: Role,
  input: CreateTaskInput
) {
  if (role !== Role.ADMIN && role !== Role.PROJECT_MANAGER) {
    throw new Error("You do not have permission to create tasks");
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // PM can manage only projects created by them
  if (
    role === Role.PROJECT_MANAGER &&
    project.createdById !== userId
  ) {
    throw new Error("You do not have permission to manage this project");
  }

  // Developer must exist and must actually have DEVELOPER role
  const developer = await prisma.user.findUnique({
    where: { id: input.developerId },
  });

  if (!developer || developer.role !== Role.DEVELOPER) {
    throw new Error("Developer not found");
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      developerId: input.developerId,
      status: input.status ?? TaskStatus.TODO,
      priority: input.priority ?? Priority.MEDIUM,
      dueDate: input.dueDate,
    },
    include: {
      developer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          createdById: true,
        },
      },
    },
  });
  await createNotification(
  input.developerId,
  `You have been assigned Task #${task.id}: ${task.title}`
);

  return task;
}

/**
 * Get tasks according to the logged-in user's role.
 *
 * Admin:
 *   Can see all tasks.
 *
 * Project Manager:
 *   Can see tasks only from projects created by them.
 *
 * Developer:
 *   Can see only tasks assigned to them.
 *
 * Supports:
 *   status
 *   priority
 *   dueDateFrom
 *   dueDateTo
 */
export async function getTasks(
  userId: number,
  role: Role,
  filters?: {
    status?: TaskStatus;
    priority?: Priority;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }
) {
  const where: any = {};

  // ADMIN → all tasks
  if (role === Role.ADMIN) {
    // No additional restriction
  }

  // PROJECT MANAGER → only their projects
  else if (role === Role.PROJECT_MANAGER) {
    where.project = {
      createdById: userId,
    };
  }

  // DEVELOPER → only their assigned tasks
  else if (role === Role.DEVELOPER) {
    where.developerId = userId;
  }

  else {
    throw new Error("You do not have permission to view tasks");
  }

  // Status filter
  if (filters?.status) {
    where.status = filters.status;
  }

  // Priority filter
  if (filters?.priority) {
    where.priority = filters.priority;
  }

  // Due-date range filter
  if (filters?.dueDateFrom || filters?.dueDateTo) {
    where.dueDate = {};

    if (filters.dueDateFrom) {
      where.dueDate.gte = filters.dueDateFrom;
    }

    if (filters.dueDateTo) {
      where.dueDate.lte = filters.dueDateTo;
    }
  }

  return prisma.task.findMany({
    where,

    include: {
      developer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      project: {
        select: {
          id: true,
          name: true,
          createdById: true,
        },
      },
    },

    // Higher priority first, then nearest due date
    orderBy: [
      {
        priority: "desc",
      },
      {
        dueDate: "asc",
      },
    ],
  });
}

/**
 * Get one task by ID.
 *
 * Admin:
 *   Can access any task.
 *
 * Project Manager:
 *   Can access only tasks belonging to their projects.
 *
 * Developer:
 *   Can access only tasks assigned to them.
 */
export async function getTaskById(
  taskId: number,
  userId: number,
  role: Role
) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },

    include: {
      developer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      project: {
        select: {
          id: true,
          name: true,
          createdById: true,
        },
      },

      activities: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // ADMIN → unrestricted
  if (role === Role.ADMIN) {
    return task;
  }

  // PROJECT MANAGER → own projects only
  if (role === Role.PROJECT_MANAGER) {
    if (task.project.createdById === userId) {
      return task;
    }

    throw new Error(
      "You do not have permission to access this task"
    );
  }

  // DEVELOPER → assigned tasks only
  if (role === Role.DEVELOPER) {
    if (task.developerId === userId) {
      return task;
    }

    throw new Error(
      "You do not have permission to access this task"
    );
  }

  throw new Error(
    "You do not have permission to access this task"
  );
}

/**
 * Update task status.
 *
 * Admin:
 *   Can update any task.
 *
 * Project Manager:
 *   Can update tasks belonging to their projects.
 *
 * Developer:
 *   Can update only their assigned tasks.
 *
 * Every status change:
 *   1. Updates the task.
 *   2. Creates a persistent Activity record.
 *   3. Emits the activity through Socket.IO.
 */
export async function updateTaskStatus(
  taskId: number,
  userId: number,
  role: Role,
  newStatus: TaskStatus
) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },

    include: {
      project: true,

      developer: true,
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Developer can update only their own assigned task
  if (
    role === Role.DEVELOPER &&
    task.developerId !== userId
  ) {
    throw new Error(
      "You do not have permission to update this task"
    );
  }

  // Project Manager can update only tasks in their projects
  if (
    role === Role.PROJECT_MANAGER &&
    task.project.createdById !== userId
  ) {
    throw new Error(
      "You do not have permission to update this task"
    );
  }

  // Admin has access to every task
  if (
    role !== Role.ADMIN &&
    role !== Role.PROJECT_MANAGER &&
    role !== Role.DEVELOPER
  ) {
    throw new Error(
      "You do not have permission to update this task"
    );
  }

  // Don't create duplicate activity if status didn't change
  if (task.status === newStatus) {
    return task;
  }

  /*
   * Update the task and create the activity
   * inside the same database transaction.
   *
   * This guarantees that the status change and
   * activity record are persisted together.
   */
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: {
        id: taskId,
      },

      data: {
        status: newStatus,
      },

      include: {
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        project: {
          select: {
            id: true,
            name: true,
            createdById: true,
          },
        },
      },
    });

    const activity = await tx.activity.create({
      data: {
        message: `${task.developer.name} moved Task #${task.id} from ${task.status} to ${newStatus}`,

        projectId: task.projectId,

        taskId: task.id,

        userId,
      },
    });

    return {
      updated,
      activity,
    };
  });

  /*
   * Send the newly-created activity to all
   * connected viewers of this project.
   */
  emitActivity(
  task.projectId,
  task.developerId,
  result.activity
);
  if (
    newStatus === TaskStatus.IN_REVIEW &&
    task.project.createdById !== userId
  ) {
    await createNotification(
      task.project.createdById,
      `Task #${task.id} "${task.title}" has been moved to In Review`
    );
  }

  return result.updated;
}
export async function getRecentActivities(
  userId: number,
  role: Role
) {
  let activities;

  if (role === Role.ADMIN) {
    activities = await prisma.activity.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  } else if (role === Role.PROJECT_MANAGER) {
    activities = await prisma.activity.findMany({
      where: {
        project: {
          createdById: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  } else if (role === Role.DEVELOPER) {
    activities = await prisma.activity.findMany({
      where: {
        task: {
          developerId: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  } else {
    throw new Error("You do not have permission to view activities");
  }

  return activities;
}
