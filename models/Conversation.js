// models/Conversation.js
const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
    },
    type: {
      type: String,
      enum: ["direct", "gig_related", "group"],
      default: "direct",
    },
    title: String,
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active",
    },
    unreadCount: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ gigId: 1 });
ConversationSchema.index({ lastActivity: -1 });
ConversationSchema.index({ status: 1 });

const Conversation = mongoose.model("Conversation", ConversationSchema);
