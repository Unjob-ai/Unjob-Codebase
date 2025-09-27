import { Server } from "socket.io"

let io

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Join user to their personal room
    const userId = socket.handshake.query.userId
    if (userId) {
      socket.join(`user_${userId}`)
      console.log(`User ${userId} joined their room`)
    }

    // Join conversation room
    socket.on("joinConversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`)
      console.log(`User joined conversation: ${conversationId}`)
    })

    // Leave conversation room
    socket.on("leaveConversation", (conversationId) => {
      socket.leave(`conversation_${conversationId}`)
      console.log(`User left conversation: ${conversationId}`)
    })

    // Handle new message
    socket.on("sendMessage", (message) => {
      // Broadcast to all users in the conversation except sender
      socket.to(`conversation_${message.conversationId}`).emit("newMessage", message)

      // Also send to the other participant's personal room for notifications
      const otherParticipants = message.conversation?.participants?.filter((p) => p._id !== message.sender._id)

      otherParticipants?.forEach((participant) => {
        socket.to(`user_${participant._id}`).emit("newMessage", message)
      })
    })

    // Handle typing indicators
    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation_${conversationId}`).emit("userTyping", {
        userId,
        conversationId,
        isTyping,
      })
    })

    // Handle user status updates
    socket.on("updateStatus", (status) => {
      socket.broadcast.emit("userStatusUpdate", {
        userId,
        status,
        timestamp: new Date(),
      })
    })

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)

      // Broadcast user offline status
      if (userId) {
        socket.broadcast.emit("userStatusUpdate", {
          userId,
          status: "offline",
          timestamp: new Date(),
        })
      }
    })
  })

  return io
}

export const getSocket = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}
