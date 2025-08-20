import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId != "undefined") userSocketMap[userId] = socket.id;

  // Send the list of online users to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // WebRTC signaling for direct calls
  socket.on("offer", (offer, targetUserId, callId) => {
    console.log("Offer received:", { from: userId, to: targetUserId, callId });
    const targetSocketId = getReceiverSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("offer", offer, userId, callId);
    }
  });

  socket.on("answer", (answer, targetUserId, callId) => {
    console.log("Answer received:", { from: userId, to: targetUserId, callId });
    const targetSocketId = getReceiverSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("answer", answer, userId, callId);
    }
  });

  socket.on("ice-candidate", (candidate, targetUserId, callId) => {
    console.log("ICE candidate received:", { from: userId, to: targetUserId, callId });
    const targetSocketId = getReceiverSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", candidate, userId, callId);
    }
  });

  // Group call signaling
  socket.on("group-offer", (offer, targetUserIds, callId) => {
    console.log("Group offer received:", { from: userId, targetUserIds, callId });
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUserIds.forEach(targetUserId => {
        if (targetUserId && targetUserId !== userId) {
          const targetSocketId = getReceiverSocketId(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit("group-offer", offer, userId, callId);
          }
        }
      });
    }
  });

  socket.on("group-answer", (answer, targetUserIds, callId) => {
    console.log("Group answer received:", { from: userId, targetUserIds, callId });
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUserIds.forEach(targetUserId => {
        if (targetUserId && targetUserId !== userId) {
          const targetSocketId = getReceiverSocketId(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit("group-answer", answer, userId, callId);
          }
        }
      });
    }
  });

  socket.on("group-ice-candidate", (candidate, targetUserIds, callId) => {
    console.log("Group ICE candidate received:", { from: userId, targetUserIds, callId });
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUserIds.forEach(targetUserId => {
        if (targetUserId && targetUserId !== userId) {
          const targetSocketId = getReceiverSocketId(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit("group-ice-candidate", candidate, userId, callId);
          }
        }
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };