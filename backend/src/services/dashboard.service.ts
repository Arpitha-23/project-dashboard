import prisma from "../lib/prisma";
import { Role, TaskStatus, Priority } from "@prisma/client";

export async function getDashboardSummary(
  userId: number,
  role: Role
) {
  if (role === Role.ADMIN) {
    const [
      totalProjects,
      statusGroups,
      overdueCount,
      totalTasks,
    ] = await Promise.all([
      prisma.project.count(),

      prisma.task.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      prisma.task.count({
        where: {
          isOverdue: true,
        },
      }),

      prisma.task.count(),
    ]);

    const taskStatusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    for (const group of statusGroups) {
      taskStatusCounts[group.status] = group._count._all;
    }

    return {
      role,
      totalProjects,
      totalTasks,
      overdueCount,
      taskStatusCounts,
    };
  }

  if (role === Role.PROJECT_MANAGER) {
    const projects = await prisma.project.findMany({
      where: {
        createdById: userId,
      },
      select: {
        id: true,
        name: true,
        tasks: {
          select: {
            priority: true,
            dueDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const priorityCounts = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    let totalTasks = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const project of projects) {
      for (const task of project.tasks) {
        totalTasks++;
        priorityCounts[task.priority]++;

        if (
          task.dueDate < now &&
          task.status !== TaskStatus.DONE
        ) {
          overdueCount++;
        }
      }
    }

    return {
      role,
      totalProjects: projects.length,
      totalTasks,
      overdueCount,
      priorityCounts,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        taskCount: project.tasks.length,
      })),
    };
  }

  if (role === Role.DEVELOPER) {
    const tasks = await prisma.task.findMany({
      where: {
        developerId: userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          dueDate: "asc",
        },
      ],
    });

    const statusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    let overdueCount = 0;

    for (const task of tasks) {
      statusCounts[task.status]++;

      if (task.isOverdue) {
        overdueCount++;
      }
    }

    return {
      role,
      totalTasks: tasks.length,
      overdueCount,
      statusCounts,
      tasks,
    };
  }

  throw new Error("Unsupported role");
}