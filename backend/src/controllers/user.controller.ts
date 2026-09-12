import { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function getDevelopers(
  req: Request,
  res: Response
) {
  try {
    const developers = await prisma.user.findMany({
      where: {
        role: "DEVELOPER",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      users: developers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch developers",
    });
  }
}