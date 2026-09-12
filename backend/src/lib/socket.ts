import { Server } from "socket.io";

let io: Server | null = null;

export function setSocketIO(server: Server) {
  io = server;
}

export function getSocketIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}

export function emitActivity(
  projectId: number,
  developerId: number,
  activity: unknown
) {
  if (!io) return;

  // Project Managers and Admins watching the project
  io.to(`project:${projectId}`).emit("activity:new", activity);

  // Admins receive all activity globally
  io.to("admin:global").emit("activity:new", activity);

  // Assigned developer receives the activity
  io.to(`user:${developerId}`).emit("activity:new", activity);
}