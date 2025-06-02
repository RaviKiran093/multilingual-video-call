const express = require("express");
const http = require("http");
const cors = require("cors");
const { translate } = require('@vitalets/google-translate-api');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = 4000;

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const roomUsers = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    if (!roomUsers[roomId]) roomUsers[roomId] = new Map();
    roomUsers[roomId].set(socket.id, username);

    socket.to(roomId).emit("user-joined", { userId: socket.id, username });

    const otherUsers = Array.from(roomUsers[roomId].entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, name]) => ({ userId: id, username: name }));
    socket.emit("all-users", otherUsers);

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", socket.id);
      if (roomUsers[roomId]) {
        roomUsers[roomId].delete(socket.id);
        if (roomUsers[roomId].size === 0) delete roomUsers[roomId];
      }
    });

    socket.on("signal", (data) => {
      io.to(data.to).emit("signal", { signal: data.signal, from: socket.id });
    });

    socket.on('subtitle', ({ text, roomId, userId, lang }) => {
      socket.to(roomId).emit('subtitle', { text, userId, lang });
    });

    socket.on("chat-message", ({ roomId, message, userId }) => {
      socket.to(roomId).emit("chat-message", { message, userId });
    });

    socket.on("media-state-changed", ({ roomId, userId, video, audio }) => {
      socket.to(roomId).emit("media-state-changed", { userId, video, audio });
    });

    socket.on("translate-message", async ({ text, to, targetLang }) => {
      try {
        const result = await translate(text, { to: targetLang || "en" });
        io.to(to).emit("translated-message", {
          from: socket.id,
          original: text,
          translated: result.text,
          targetLang: targetLang || "en",
        });
      } catch (err) {
        socket.emit("translated-message", {
          from: "server",
          original: text,
          translated: "Translation failed.",
          targetLang: targetLang || "en",
        });
      }
    });
  });
});

app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  try {
    const result = await translate(text, { to: targetLanguage || "en" });
    res.json({ translated: result.text });
  } catch (err) {
    res.status(500).json({
      translated: "Translation failed.",
      error: err.message || String(err)
    });
  }
});

app.get("/", (req, res) => res.send("Welcome to the WebSocket and HTTP server!"));
app.use((req, res) => res.status(404).send("404 - Not Found"));

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));