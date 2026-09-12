import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(accessToken: string) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL, {
    auth: {
      token: accessToken,
    },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}