import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

interface CreateProjectInput {
  name: string;
  description?: string;
  clientId: number;
}

export async function createProject(
  userId: number,
  role: Role,
  input: CreateProjectInput
) {
  // Only Admin and Project Manager can create projects
  if (role !== Role.ADMIN && role !== Role.PROJECT_MANAGER) {
    throw new Error("You do not have permission to create projects");
  }

  // Make sure the client exists
  const client = await prisma.client.findUnique({
    where: {
      id: input.clientId,
    },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      clientId: input.clientId,
      createdById: userId,
    },
    include: {
      client: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return project;
}

export async function getProjects(userId: number, role: Role) {
  if (role === Role.ADMIN) {
    return prisma.project.findMany({
      include: {
        client: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  if (role === Role.PROJECT_MANAGER) {
    return prisma.project.findMany({
      where: {
        createdById: userId,
      },
      include: {
        client: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // Developers don't get project access here.
  throw new Error("You do not have permission to view projects");
}

export async function getProjectById(
  projectId: number,
  userId: number,
  role: Role
) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      client: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      tasks: {
        include: {
          developer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Admin can access everything
  if (role === Role.ADMIN) {
    return project;
  }

  // PM can access only their own projects
  if (
    role === Role.PROJECT_MANAGER &&
    project.createdById === userId
  ) {
    return project;
  }

  // Developer cannot access project management endpoint
  throw new Error("You do not have permission to access this project");
}