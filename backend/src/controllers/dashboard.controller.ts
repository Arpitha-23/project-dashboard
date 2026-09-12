import { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboard.service";

export async function summary(req: Request, res: Response) {
  try {
    const user = req.user!;

    const dashboard = await getDashboardSummary(
      user.userId,
      user.role
    );

    return res.status(200).json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
}