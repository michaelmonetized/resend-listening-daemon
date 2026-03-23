import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Message, Attachment, Box } from "./schema";

// Get all messages for a box, paginated
export const getMessages = query({
  args: {
    boxEmail: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  async handler(ctx, { boxEmail, limit = 20, offset = 0, searchTerm, includeArchived = false }) {
    const db = ctx.db;

    let query_: any = db.query("messages");

    // Filter by box if provided
    if (boxEmail) {
      query_ = query_.withIndex("by_boxEmail", (q) => q.eq("boxEmail", boxEmail));
    }

    // Get all matching messages
    let messages = await query_.collect();

    // Filter by archived status
    if (!includeArchived) {
      messages = messages.filter((m) => !m.isArchived);
    }

    // Filter by search term if provided
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      messages = messages.filter(
        (m) =>
          m.subject.toLowerCase().includes(term) ||
          m.body.toLowerCase().includes(term) ||
          m.from.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply pagination
    const total = messages.length;
    const paginated = messages.slice(offset, offset + limit);

    return {
      messages: paginated,
      total,
      hasMore: offset + limit < total,
    };
  },
});

// Get a single message with attachments
export const getMessage = query({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    // Get message by messageId
    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      return null;
    }

    const message = messages[0];

    // Get attachments
    const attachments = await db
      .query("attachments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    return {
      ...message,
      attachments: attachments.map((a) => ({
        _id: a._id,
        messageId: a.messageId,
        filename: a.filename,
        filepath: a.filepath,
        size: a.size,
        mimeType: a.mimeType,
      })),
    };
  },
});

// Store a new message (called from daemon C1)
export const storeMessage = mutation({
  args: {
    messageId: v.string(),
    from: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    date: v.string(),
    boxEmail: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          filepath: v.string(),
          size: v.number(),
          mimeType: v.string(),
        })
      )
    ),
  },
  async handler(
    ctx,
    {
      messageId,
      from,
      to,
      cc,
      bcc,
      subject,
      body,
      bodyHtml,
      date,
      boxEmail,
      attachments = [],
    }
  ) {
    const db = ctx.db;

    // Check if message already exists
    const existing = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (existing.length > 0) {
      console.log(`Message ${messageId} already stored`);
      return existing[0]._id;
    }

    // Create message document
    const messageId_db = await db.insert("messages", {
      messageId,
      from,
      to,
      cc,
      bcc,
      subject,
      body,
      bodyHtml,
      date,
      boxEmail,
      isRead: false,
      isStarred: false,
      isArchived: false,
      isSpam: false,
      labels: [],
      attachments: attachments.map((a) => ({
        filename: a.filename,
        filepath: a.filepath,
        size: a.size,
        mimeType: a.mimeType,
      })),
    });

    // Store attachment metadata separately
    for (const attachment of attachments) {
      await db.insert("attachments", {
        messageId,
        filename: attachment.filename,
        filepath: attachment.filepath,
        size: attachment.size,
        mimeType: attachment.mimeType,
      });
    }

    // Update box message count
    const boxes = await db
      .query("boxes")
      .withIndex("by_email", (q) => q.eq("email", boxEmail))
      .collect();

    if (boxes.length > 0) {
      await db.patch(boxes[0]._id, {
        messageCount: (boxes[0].messageCount || 0) + 1,
        lastSync: new Date().toISOString(),
      });
    }

    return messageId_db;
  },
});

// Mark message as read
export const markAsRead = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    await db.patch(messages[0]._id, {
      isRead: true,
    });

    return messages[0]._id;
  },
});

// Toggle star status
export const toggleStar = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    const message = messages[0];
    await db.patch(message._id, {
      isStarred: !message.isStarred,
    });

    return message._id;
  },
});

// Add label to message
export const addLabel = mutation({
  args: {
    messageId: v.string(),
    label: v.string(),
  },
  async handler(ctx, { messageId, label }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    const message = messages[0];
    const labels = Array.isArray(message.labels) ? message.labels : [];

    if (!labels.includes(label)) {
      labels.push(label);
    }

    await db.patch(message._id, {
      labels,
    });

    return message._id;
  },
});

// Delete message
export const deleteMessage = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    const message = messages[0];

    // Delete attachments
    const attachments = await db
      .query("attachments")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    for (const attachment of attachments) {
      await db.delete(attachment._id);
    }

    // Delete message
    await db.delete(message._id);

    return message._id;
  },
});

// Archive message
export const archiveMessage = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    await db.patch(messages[0]._id, {
      isArchived: true,
    });

    return messages[0]._id;
  },
});

// Mark as spam
export const markAsSpam = mutation({
  args: {
    messageId: v.string(),
  },
  async handler(ctx, { messageId }) {
    const db = ctx.db;

    const messages = await db
      .query("messages")
      .withIndex("by_messageId", (q) => q.eq("messageId", messageId))
      .collect();

    if (messages.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    await db.patch(messages[0]._id, {
      isSpam: true,
    });

    return messages[0]._id;
  },
});
