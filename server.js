const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { notifyDelayedVisits } = require("./src/lib/delayed-visits");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const { jwtVerify } = await import("jose");
  const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET || "frontdesk-jwt-secret-key-2-day-task-2026",
  );
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  const onlineUsers = new Map();
  global.onlineUserIds = onlineUsers;

  const emitPresence = (userId, departmentId, online) => {
    const payload = { userId, departmentId, online };
    io.to("reception").emit("user_presence_changed", payload);
  };

  io.use(async (socket, next) => {
    const token = socket.handshake.headers.cookie
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith("auth_token="))
      ?.slice("auth_token=".length);
    if (!token) return next(new Error("Unauthorized"));

    try {
      const { payload } = await jwtVerify(token, secretKey);
      if (!payload.userId || !payload.role) throw new Error("Invalid session");
      socket.data.auth = {
        userId: payload.userId,
        role: payload.role,
        departmentId: payload.departmentId || null,
      };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role, departmentId } = socket.data.auth;
    if (role === "RECEPTIONIST") socket.join("reception");
    socket.join(`user_${userId}`);
    socket.data.userId = userId;
    socket.data.departmentId = departmentId;
    const connections = onlineUsers.get(userId) || new Set();
    const wasOffline = connections.size === 0;
    connections.add(socket.id);
    onlineUsers.set(userId, connections);
    if (wasOffline) emitPresence(userId, departmentId, true);

    socket.on("disconnect", () => {
      const { userId, departmentId } = socket.data;
      if (!userId) return;
      const connections = onlineUsers.get(userId);
      if (!connections) return;
      connections.delete(socket.id);
      if (connections.size === 0) {
        onlineUsers.delete(userId);
        emitPresence(userId, departmentId, false);
      }
    });
  });

  global.io = io;

  // This is a server-side scheduled check, not browser polling. The shared
  // service atomically claims each alert before emitting it.
  setInterval(() => {
    notifyDelayedVisits(io).catch((error) => console.error("Delayed-visit check failed", error));
  }, 60 * 1000);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> arriVo server running on http://localhost:${PORT}`);
  });
});
