const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { notifyDelayedVisits } = require("./src/lib/delayed-visits");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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
    if (departmentId) io.to(`department_${departmentId}`).emit("user_presence_changed", payload);
  };

  io.on("connection", (socket) => {
    socket.on("join", (data) => {
      if (!data) return;
      if (data.role === "RECEPTIONIST") {
        socket.join("reception");
      }
      if (data.role === "DEPARTMENT_LEAD" && data.departmentId) {
        socket.join(`department_${data.departmentId}`);
      }
      if (data.userId) {
        socket.join(`user_${data.userId}`);
        socket.data.userId = data.userId;
        socket.data.departmentId = data.departmentId;
        const connections = onlineUsers.get(data.userId) || new Set();
        const wasOffline = connections.size === 0;
        connections.add(socket.id);
        onlineUsers.set(data.userId, connections);
        if (wasOffline) emitPresence(data.userId, data.departmentId, true);
      }
    });

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

    socket.on("register_visitor", (visitData) => {
      if (visitData && visitData.departmentId) {
        io.to(`department_${visitData.departmentId}`).emit("new_visitor_registered", visitData);
      }
      io.to("reception").emit("visit_created", visitData);
    });

    socket.on("update_visit_status", (visitData) => {
      io.to("reception").emit("visit_status_changed", visitData);
      if (visitData && visitData.departmentId) {
        io.to(`department_${visitData.departmentId}`).emit("visit_status_changed", visitData);
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
