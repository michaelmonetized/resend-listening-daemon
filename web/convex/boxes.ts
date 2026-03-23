import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Box } from "./schema";

// Get all boxes
export const getBoxes = query({
  args: {},
  async handler(ctx) {
    const db = ctx.db;

    const boxes = await db.query("boxes").collect();

    return boxes;
  },
});

// Get a specific box
export const getBox = query({
  args: {
    email: v.string(),
  },
  async handler(ctx, { email }) {
    const db = ctx.db;

    const boxes = await db
      .query("boxes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    if (boxes.length === 0) {
      return null;
    }

    return boxes[0];
  },
});

// Add a new box
export const addBox = mutation({
  args: {
    email: v.string(),
    isActive: v.optional(v.boolean()),
  },
  async handler(ctx, { email, isActive = true }) {
    const db = ctx.db;

    // Check if box already exists
    const existing = await db
      .query("boxes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    if (existing.length > 0) {
      throw new Error(`Box ${email} already exists`);
    }

    const boxId = await db.insert("boxes", {
      email,
      isActive,
      lastSync: null,
      messageCount: 0,
    });

    return boxId;
  },
});

// Update box
export const updateBox = mutation({
  args: {
    email: v.string(),
    isActive: v.optional(v.boolean()),
    lastSync: v.optional(v.string()),
    messageCount: v.optional(v.number()),
  },
  async handler(ctx, { email, isActive, lastSync, messageCount }) {
    const db = ctx.db;

    const boxes = await db
      .query("boxes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    if (boxes.length === 0) {
      throw new Error(`Box ${email} not found`);
    }

    const box = boxes[0];
    const updates: Partial<Box> = {};

    if (isActive !== undefined) updates.isActive = isActive;
    if (lastSync !== undefined) updates.lastSync = lastSync;
    if (messageCount !== undefined) updates.messageCount = messageCount;

    await db.patch(box._id, updates);

    return box._id;
  },
});

// Delete box
export const deleteBox = mutation({
  args: {
    email: v.string(),
  },
  async handler(ctx, { email }) {
    const db = ctx.db;

    const boxes = await db
      .query("boxes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    if (boxes.length === 0) {
      throw new Error(`Box ${email} not found`);
    }

    const box = boxes[0];

    // Delete all messages for this box (optional - for now just mark as archived)
    const messages = await db
      .query("messages")
      .withIndex("by_boxEmail", (q) => q.eq("boxEmail", email))
      .collect();

    // Archive messages instead of deleting
    for (const message of messages) {
      await db.patch(message._id, { isArchived: true });
    }

    // Delete the box
    await db.delete(box._id);

    return box._id;
  },
});
