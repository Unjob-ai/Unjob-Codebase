import { onlineUsers, userSockets } from "./index.js";
 
  const broadcastOnlineUsers = (socket,io) => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    (socket || io).emit("onlineUsersList", onlineUserIds);
  };

  // Socket.IO connection handling
   const handleUserConnection = (socket, userId,io) => {
    onlineUsers.set(userId, {
      socketId: socket.id,
      status: "online",
      connectedAt: new Date(),
      lastActivity: new Date(),
    });
    userSockets.set(socket.id, userId);
    log(
      "INFO",
      "Socket",
      `User ${userId} connected. Total online: ${onlineUsers.size}`
    );
    socket.broadcast.emit("userOnline", userId);
    broadcastOnlineUsers();
  };

   const handleUserDisconnection = (socket,io) => {
    // Leave all rooms except the socket's own room
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("user-left-room", {
          userId: userSockets.get(socket.id),
          room,
        });
      }
    }

    const disconnectedUserId = userSockets.get(socket.id);
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      userSockets.delete(socket.id);

      log(
        "INFO",
        "Socket",
        `User ${disconnectedUserId} disconnected. Total online: ${onlineUsers.size}`
      );
      socket.broadcast.emit("userOffline", disconnectedUserId);
      broadcastOnlineUsers();
    }
  };

  export {handleUserDisconnection, handleUserConnection,broadcastOnlineUsers};