import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route";
import testRoutes from "./routes/test.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setSocketIO } from "./lib/socket";
import { startOverdueJob } from "./jobs/overdue.job";
import prisma from "./lib/prisma";
import notificationRoutes from "./routes/notification.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import userRoutes from "./routes/user.routes";
const onlineUsers = new Map<number, number>();

function broadcastOnlineUsers() {
  const uniqueOnlineUsers = onlineUsers.size;
  io.emit("online-users:count", uniqueOnlineUsers);
}

dotenv.config();

const app = express();

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Project Dashboard API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

const PORT =
  Number(process.env.PORT) || 5000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

setSocketIO(io);
startOverdueJob();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      return next(new Error("JWT secret not configured"));
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "number"
    ) {
      return next(new Error("Invalid token"));
    }

    // IMPORTANT:
    // Fetch the current role from PostgreSQL instead of trusting
    // the role stored inside the JWT.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.data.userId = user.id;
    socket.data.role = user.role;

    next();
  } catch {
    next(new Error("Invalid access token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  const role = socket.data.role;
  const currentConnections =
  onlineUsers.get(userId) || 0;

onlineUsers.set(
  userId,
  currentConnections + 1
);

broadcastOnlineUsers();

  console.log(`Socket connected: ${userId} (${role})`);

  // Every user automatically joins their personal room.
  // Notifications use this room.
  socket.join(`user:${userId}`);

  // Admin receives global activity updates.
  if (role === "ADMIN") {
    socket.join("admin:global");
  }
  socket.emit(
  "online-users:count",
  onlineUsers.size
);

  socket.on("join-project", async (projectId: number) => {
    try {
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          createdById: true,
        },
      });

      if (!project) {
        socket.emit("project:access-denied", {
          projectId,
          message: "Project not found",
        });
        return;
      }

      // ADMIN can view every project.
      if (role === "ADMIN") {
        socket.join(`project:${projectId}`);
        return;
      }

      // PROJECT_MANAGER can only view projects they created.
      if (role === "PROJECT_MANAGER") {
        if (project.createdById !== userId) {
          socket.emit("project:access-denied", {
            projectId,
            message: "You do not have access to this project",
          });
          return;
        }

        socket.join(`project:${projectId}`);
        return;
      }

      // DEVELOPER can only view projects where they have
      // at least one assigned task.
      if (role === "DEVELOPER") {
        const assignedTask = await prisma.task.findFirst({
          where: {
            projectId,
            developerId: userId,
          },
          select: {
            id: true,
          },
        });

        if (!assignedTask) {
          socket.emit("project:access-denied", {
            projectId,
            message: "You do not have access to this project",
          });
          return;
        }

        socket.join(`project:${projectId}`);
        return;
      }

      socket.emit("project:access-denied", {
        projectId,
        message: "You do not have permission to join this project",
      });
    } catch (error) {
      console.error("Project room authorization failed:", error);

      socket.emit("project:access-denied", {
        projectId,
        message: "Unable to verify project access",
      });
    }
  });

  socket.on("disconnect", () => {
  const currentConnections =
    onlineUsers.get(userId) || 0;

  if (currentConnections <= 1) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(
      userId,
      currentConnections - 1
    );
  }

  broadcastOnlineUsers();

  console.log(
    `Socket disconnected: ${userId}`
  );
});
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});