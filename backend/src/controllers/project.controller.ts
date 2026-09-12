import { Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import {
  createProject,
  getProjects,
  getProjectById,
} from "../services/project.service";

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  clientId: z.number().int().positive(),
});

export async function create(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = createProjectSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid project data",
      });
    }

    const project = await createProject(
      req.user.userId,
      req.user.role,
      result.data
    );

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create project";

    if (
      message.includes("permission") ||
      message === "Client not found"
    ) {
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

    const projects = await getProjects(
      req.user.userId,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch projects";

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

    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await getProjectById(
      projectId,
      req.user.userId,
      req.user.role
    );

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch project";

    if (message === "Project not found") {
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