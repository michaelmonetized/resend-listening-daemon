import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Attachment } from "./schema";

// Get attachments for a message
export const getAttachments = query({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const attachments = await db
      .query("attachments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    return attachments;
  },
});

// Store attachment metadata
export const storeAttachmentMetadata = mutation({
  args: {
    messageId: v.string(),
    filename: v.string(),
    filepath: v.string(),
    size: v.number(),
    mimeType: v.string(),
  },
  async handler(ctx, { messageId, filename, filepath, size, mimeType }) {
    const db = ctx.db;

    const attachmentId = await db.insert("attachments", {
      messageId,
      filename,
      filepath,
      size,
      mimeType,
    });

    return attachmentId;
  },
});

// Delete all attachments for a message
export const deleteAttachments = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const attachments = await db
      .query("attachments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    for (const attachment of attachments) {
      await db.delete(attachment._id);
    }

    return attachments.length;
  },
});
