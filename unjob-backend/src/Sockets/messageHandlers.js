// Sockets/messageHandlers.js
import { Message } from "../models/MessageModel.js";
import { Conversation } from "../models/ConversationModel.js";
import { User } from "../models/UserModel.js";
import { onlineUsers, userSockets } from "./index.js";

const messageHandlers = (socket, io) => {
  // Join conversation room
  socket.on("joinConversation", async (data) => {
    try {
      const { conversationId, userId } = data;

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (conversation) {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);

        // Notify others in conversation
        socket
          .to(`conversation_${conversationId}`)
          .emit("userJoinedConversation", {
            userId,
            conversationId,
            joinedAt: new Date(),
          });

        socket.emit("conversationJoined", {
          conversationId,
          success: true,
        });
      } else {
        socket.emit("error", {
          message: "Access denied to conversation",
          code: "CONVERSATION_ACCESS_DENIED",
        });
      }
    } catch (error) {
      console.error("Join conversation error:", error);
      socket.emit("error", {
        message: "Failed to join conversation",
        code: "JOIN_CONVERSATION_ERROR",
      });
    }
  });

  // Leave conversation room
  socket.on("leaveConversation", (data) => {
    try {
      const { conversationId, userId } = data;
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);

      // Notify others in conversation
      socket.to(`conversation_${conversationId}`).emit("userLeftConversation", {
        userId,
        conversationId,
        leftAt: new Date(),
      });

      socket.emit("conversationLeft", {
        conversationId,
        success: true,
      });
    } catch (error) {
      console.error("Leave conversation error:", error);
    }
  });

  // Send message via socket (real-time)
  socket.on("sendMessage", async (data) => {
    try {
      const { conversationId, content, type = "text", userId, replyTo } = data;

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).populate("participants", "name image role");

      if (!conversation) {
        socket.emit("messageError", {
          message: "Access denied to conversation",
          code: "CONVERSATION_ACCESS_DENIED",
        });
        return;
      }

      // Check if conversation is read-only
      if (conversation.settings?.isReadOnly) {
        socket.emit("messageError", {
          message: "This conversation is read-only",
          code: "CONVERSATION_READ_ONLY",
        });
        return;
      }

      // Create message
      const messageData = {
        conversationId,
        sender: userId,
        content: content?.trim(),
        type,
        readBy: [{ user: userId, readAt: new Date() }],
      };

      if (replyTo) {
        const replyMessage = await Message.findById(replyTo);
        if (
          replyMessage &&
          replyMessage.conversationId.toString() === conversationId
        ) {
          messageData.replyTo = replyTo;
        }
      }

      const message = await Message.create(messageData);

      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastActivity: new Date(),
      });

      // Populate message
      await message.populate("sender", "name image role");
      await message.populate("replyTo", "content sender");

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("newMessage", {
        message: message.toObject(),
        conversationId,
      });

      // Send delivery confirmation to sender
      socket.emit("messageDelivered", {
        tempId: data.tempId,
        messageId: message._id,
        sentAt: message.createdAt,
      });

      console.log(
        `Message sent in conversation ${conversationId} by user ${userId}`
      );
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("messageError", {
        message: "Failed to send message",
        error: error.message,
        tempId: data.tempId,
      });
    }
  });

  // Mark messages as read
  socket.on("markAsRead", async (data) => {
    try {
      const { conversationId, messageIds, userId } = data;

      // Verify access
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      let result;
      if (messageIds && messageIds.length > 0) {
        // Mark specific messages as read
        result = await Message.updateMany(
          {
            _id: { $in: messageIds },
            conversationId,
            sender: { $ne: userId },
          },
          {
            $addToSet: {
              readBy: { user: userId, readAt: new Date() },
            },
            $set: { status: "read" },
          }
        );
      } else {
        // Mark all unread messages as read
        result = await Message.markAllAsRead(conversationId, userId);
      }

      // Emit to conversation room
      socket.to(`conversation_${conversationId}`).emit("messagesRead", {
        conversationId,
        readBy: userId,
        messageIds: messageIds || "all",
        readAt: new Date(),
      });

      socket.emit("messagesMarkedRead", {
        conversationId,
        messagesMarked: result.modifiedCount,
      });

      console.log(
        `Messages marked as read in conversation ${conversationId} by user ${userId}`
      );
    } catch (error) {
      console.error("Mark as read error:", error);
      socket.emit("error", { message: "Failed to mark messages as read" });
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    try {
      const { conversationId, userId, isTyping } = data;

      socket.to(`conversation_${conversationId}`).emit("userTyping", {
        conversationId,
        userId,
        isTyping,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Typing indicator error:", error);
    }
  });

  // Message reaction
  socket.on("reactToMessage", async (data) => {
    try {
      const { messageId, emoji, userId, conversationId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      await message.addReaction(userId, emoji);

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("messageReaction", {
        messageId,
        conversationId,
        reaction: {
          user: userId,
          emoji,
          reactedAt: new Date(),
        },
      });

      console.log(
        `Reaction ${emoji} added to message ${messageId} by user ${userId}`
      );
    } catch (error) {
      console.error("Message reaction error:", error);
      socket.emit("error", { message: "Failed to add reaction" });
    }
  });

  // Remove message reaction
  socket.on("removeReaction", async (data) => {
    try {
      const { messageId, userId, conversationId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      await message.removeReaction(userId);

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("reactionRemoved", {
        messageId,
        conversationId,
        user: userId,
      });

      console.log(
        `Reaction removed from message ${messageId} by user ${userId}`
      );
    } catch (error) {
      console.error("Remove reaction error:", error);
      socket.emit("error", { message: "Failed to remove reaction" });
    }
  });

  // Delete message
  socket.on("deleteMessage", async (data) => {
    try {
      const { messageId, userId, conversationId } = data;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      // Check ownership
      if (message.sender.toString() !== userId) {
        socket.emit("error", {
          message: "Not authorized to delete this message",
        });
        return;
      }

      // Check if it's a system message
      if (message.type === "system" || message.isSystemMessage) {
        socket.emit("error", { message: "System messages cannot be deleted" });
        return;
      }

      await message.softDelete(userId);

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("messageDeleted", {
        messageId,
        conversationId,
        deletedBy: userId,
        deletedAt: new Date(),
      });

      console.log(`Message ${messageId} deleted by user ${userId}`);
    } catch (error) {
      console.error("Delete message error:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // Get conversation status
  socket.on("getConversationStatus", async (data) => {
    try {
      const { conversationId, userId } = data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).populate("participants", "name image role");

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      const unreadCount = await Message.getUnreadCount(conversationId, userId);
      const otherParticipant = conversation.participants.find(
        (p) => p._id.toString() !== userId
      );

      socket.emit("conversationStatus", {
        conversationId,
        status: conversation.status,
        unreadCount,
        lastActivity: conversation.lastActivity,
        settings: conversation.settings,
        metadata: conversation.metadata,
        otherParticipant: otherParticipant
          ? {
              _id: otherParticipant._id,
              name: otherParticipant.name,
              image: otherParticipant.image,
              role: otherParticipant.role,
              isOnline: onlineUsers.has(otherParticipant._id.toString()),
            }
          : null,
      });
    } catch (error) {
      console.error("Get conversation status error:", error);
      socket.emit("error", { message: "Failed to get conversation status" });
    }
  });
};

// Sockets/conversationHandlers.js
const conversationHandlers = (socket, io) => {
  // Join user's conversation list room
  socket.on("joinConversationsList", (data) => {
    try {
      const { userId } = data;
      socket.join(`user_conversations_${userId}`);
      console.log(`User ${userId} joined their conversations list`);

      socket.emit("conversationsListJoined", { success: true });
    } catch (error) {
      console.error("Join conversations list error:", error);
    }
  });

  // Leave user's conversation list room
  socket.on("leaveConversationsList", (data) => {
    try {
      const { userId } = data;
      socket.leave(`user_conversations_${userId}`);
      console.log(`User ${userId} left their conversations list`);
    } catch (error) {
      console.error("Leave conversations list error:", error);
    }
  });

  // Get user's conversations
  socket.on("getUserConversations", async (data) => {
    try {
      const { userId, page = 1, limit = 20, status } = data;

      const conversations = await Conversation.getUserConversations(userId, {
        page,
        limit,
        status,
      });

      // Add unread counts
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await Message.getUnreadCount(conv._id, userId);
          return {
            ...conv.toObject(),
            unreadCount,
          };
        })
      );

      socket.emit("userConversations", {
        conversations: conversationsWithUnread,
        page,
        hasMore: conversations.length === limit,
      });
    } catch (error) {
      console.error("Get user conversations error:", error);
      socket.emit("error", { message: "Failed to get conversations" });
    }
  });

  // Start negotiation
  socket.on("startNegotiation", async (data) => {
    try {
      const {
        conversationId,
        proposedPrice,
        timeline,
        additionalTerms,
        userId,
      } = data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).populate("participants", "name email role");

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      if (!conversation.canNegotiate) {
        socket.emit("error", { message: "Negotiation not allowed" });
        return;
      }

      // Create negotiation (same logic as controller)
      const proposedBy =
        data.userRole === "freelancer" ? "freelancer" : "client";
      const negotiationData = {
        _id: new mongoose.Types.ObjectId(),
        proposedPrice: parseInt(proposedPrice),
        timeline,
        additionalTerms,
        proposedBy,
        proposedAt: new Date(),
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await conversation.startNegotiation(negotiationData);

      // Create negotiation message
      const negotiationMessage = await Message.createNegotiationMessage(
        conversationId,
        userId,
        negotiationData
      );

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("negotiationStarted", {
        conversationId,
        negotiation: negotiationData,
        message: negotiationMessage,
      });

      console.log(
        `Negotiation started in conversation ${conversationId} by user ${userId}`
      );
    } catch (error) {
      console.error("Start negotiation error:", error);
      socket.emit("error", { message: "Failed to start negotiation" });
    }
  });

  // Respond to negotiation
  socket.on("respondToNegotiation", async (data) => {
    try {
      const { conversationId, action, counterOffer, rejectionReason, userId } =
        data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).populate("participants", "name email role");

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      const currentNegotiation = conversation.metadata?.currentNegotiation;
      if (!currentNegotiation) {
        socket.emit("error", { message: "No active negotiation" });
        return;
      }

      const respondedBy =
        data.userRole === "freelancer" ? "freelancer" : "client";
      let responseMessage;

      // Handle different actions (similar to controller logic)
      switch (action) {
        case "accept":
          await conversation.acceptNegotiation(respondedBy);
          responseMessage = await Message.create({
            conversationId,
            sender: userId,
            content: `✅ **OFFER ACCEPTED**\n\nOffer of ₹${currentNegotiation.proposedPrice.toLocaleString()} has been accepted.`,
            type: "negotiation",
            negotiationData: { ...currentNegotiation, status: "accepted" },
          });
          break;

        case "reject":
          await conversation.rejectNegotiation(respondedBy, rejectionReason);
          responseMessage = await Message.create({
            conversationId,
            sender: userId,
            content: `❌ **OFFER REJECTED**\n\nOffer of ₹${currentNegotiation.proposedPrice.toLocaleString()} has been rejected.`,
            type: "negotiation",
            negotiationData: { ...currentNegotiation, status: "rejected" },
          });
          break;

        case "counter":
          // Implementation similar to controller
          break;
      }

      // Update conversation
      if (responseMessage) {
        conversation.lastMessage = responseMessage._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        await responseMessage.populate("sender", "name image role");
      }

      // Emit to conversation room
      io.to(`conversation_${conversationId}`).emit("negotiationResponse", {
        conversationId,
        action,
        message: responseMessage,
        negotiation: conversation.metadata?.currentNegotiation,
      });

      console.log(
        `Negotiation response (${action}) in conversation ${conversationId} by user ${userId}`
      );
    } catch (error) {
      console.error("Negotiation response error:", error);
      socket.emit("error", { message: "Failed to respond to negotiation" });
    }
  });

  // Archive/unarchive conversation
  socket.on("archiveConversation", async (data) => {
    try {
      const { conversationId, userId, archive = true } = data;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      if (archive) {
        await conversation.archiveForUser(userId);
      } else {
        await conversation.unarchiveForUser(userId);
      }

      // Emit to user's conversation list
      io.to(`user_conversations_${userId}`).emit("conversationArchived", {
        conversationId,
        archived: archive,
        userId,
      });

      socket.emit("conversationArchiveSuccess", {
        conversationId,
        archived: archive,
      });

      console.log(
        `Conversation ${conversationId} ${
          archive ? "archived" : "unarchived"
        } by user ${userId}`
      );
    } catch (error) {
      console.error("Archive conversation error:", error);
      socket.emit("error", { message: "Failed to archive conversation" });
    }
  });
};

// Export functions to emit events from controllers
const emitNewMessage = (message) => {
  try {
    if (global.io) {
      global.io
        .to(`conversation_${message.conversationId}`)
        .emit("newMessage", {
          message: message.toObject ? message.toObject() : message,
          conversationId: message.conversationId,
        });
    }
  } catch (error) {
    console.error("Emit new message error:", error);
  }
};

const emitConversationUpdate = (conversation) => {
  try {
    if (global.io && conversation.participants) {
      conversation.participants.forEach((participantId) => {
        global.io
          .to(`user_conversations_${participantId}`)
          .emit("conversationUpdated", {
            conversation: conversation.toObject
              ? conversation.toObject()
              : conversation,
          });
      });
    }
  } catch (error) {
    console.error("Emit conversation update error:", error);
  }
};

const emitPaymentCompleted = (conversationId, participants, paymentData) => {
  try {
    if (global.io) {
      global.io
        .to(`conversation_${conversationId}`)
        .emit("paymentCompleted", paymentData);

      participants.forEach((participantId) => {
        global.io
          .to(`user_conversations_${participantId}`)
          .emit("conversationPaymentCompleted", {
            conversationId,
            ...paymentData,
          });
      });
    }
  } catch (error) {
    console.error("Emit payment completed error:", error);
  }
};

export default {
  messageHandlers,
  conversationHandlers,
  emitNewMessage,
  emitConversationUpdate,
  emitPaymentCompleted,
};
