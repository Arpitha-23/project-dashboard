import { Request, Response } from "express";
import { z } from "zod";
import {
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "../services/auth.service";
import prisma from "../lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshCookieName = "refreshToken";

function setRefreshCookie(
  res: Response,
  refreshToken: string,
  expiresAt?: Date
) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
    expires: expiresAt,
    path: "/api/auth",
  });
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password format",
      });
    }

    const { email, password } = result.data;

    const authResult = await loginUser(
      email,
      password
    );

    setRefreshCookie(
      res,
      authResult.refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken: authResult.accessToken,
      user: authResult.user,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Login failed";

    if (
      message === "Invalid email or password"
    ) {
      return res.status(401).json({
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

export async function refresh(
  req: Request,
  res: Response
) {
  try {
    const refreshToken =
      req.cookies?.[refreshCookieName];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const result =
      await refreshAccessToken(refreshToken);

    setRefreshCookie(
      res,
      result.refreshToken
    );

    return res.status(200).json({
      success: true,
      accessToken: result.accessToken,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Refresh failed";

    return res.status(401).json({
      success: false,
      message,
    });
  }
}

export async function logout(
  req: Request,
  res: Response
) {
  try {
    const refreshToken =
      req.cookies?.[refreshCookieName];

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie(refreshCookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
}
export async function me(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
}