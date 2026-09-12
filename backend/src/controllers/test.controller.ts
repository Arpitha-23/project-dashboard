import { Request, Response } from "express";

export function getProtectedTest(req: Request, res: Response) {
  return res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    user: req.user,
  });
}