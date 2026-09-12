import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return secret;
}

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function loginUser(
  email: string,
  password: string
) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    getAccessSecret(),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );

  const refreshToken = crypto.randomBytes(64).toString("hex");

  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      expiresAt,
      userId: user.id,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    throw new Error("Invalid refresh token");
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({
      where: { id: storedToken.id },
    });

    throw new Error("Refresh token expired");
  }

  const newRefreshToken = crypto.randomBytes(64).toString("hex");
  const newRefreshTokenHash = hashToken(newRefreshToken);

  const newExpiresAt = new Date();
  newExpiresAt.setDate(
    newExpiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS
  );

  const accessToken = jwt.sign(
    {
      userId: storedToken.user.id,
      role: storedToken.user.role,
    },
    getAccessSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: { id: storedToken.id },
      });

      await tx.refreshToken.create({
        data: {
          tokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
          userId: storedToken.user.id,
        },
      });
    });
  } catch {
    throw new Error("Refresh token already used");
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}
export async function logoutUser(
  refreshToken: string
) {
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.deleteMany({
    where: {
      tokenHash,
    },
  });
}