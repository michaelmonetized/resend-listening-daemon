import { defineSchema, defineTable, s } from "convex/server";

// Message attachment metadata
const attachmentSchema = s.object({
  filename: s.string(),
  filepath: s.string(),
  size: s.number(),
  mimeType: s.string(),
});

// Message document
const messageSchema = {
  messageId: s.string(),
  from: s.string(),
  to: s.array(s.string()),
  cc: s.optional(s.array(s.string())),
  bcc: s.optional(s.array(s.string())),
  subject: s.string(),
  body: s.string(),
  bodyHtml: s.optional(s.string()),
  date: s.string(),
  boxEmail: s.string(),
  isRead: s.boolean(),
  isStarred: s.boolean(),
  isArchived: s.boolean(),
  isSpam: s.boolean(),
  labels: s.array(s.string()),
  attachments: s.array(attachmentSchema),
};

// Box document
const boxSchema = {
  email: s.string(),
  isActive: s.boolean(),
  lastSync: s.optional(s.string()),
  messageCount: s.number(),
};

export default defineSchema({
  messages: defineTable(messageSchema)
    .index("by_messageId", ["messageId"])
    .index("by_from", ["from"])
    .index("by_boxEmail", ["boxEmail"])
    .index("by_date", ["date"])
    .index("by_boxEmail_date", ["boxEmail", "date"])
    .index("by_boxEmail_isArchived", ["boxEmail", "isArchived"]),

  attachments: defineTable({
    messageId: s.string(),
    filename: s.string(),
    filepath: s.string(),
    size: s.number(),
    mimeType: s.string(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_filename", ["filename"]),

  boxes: defineTable(boxSchema)
    .index("by_email", ["email"]),
});

// TypeScript types for use throughout the app
export type Message = {
  _id?: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: string;
  boxEmail: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isSpam: boolean;
  labels: string[];
  attachments: Attachment[];
};

export type Attachment = {
  _id?: string;
  messageId: string;
  filename: string;
  filepath: string;
  size: number;
  mimeType: string;
};

export type Box = {
  _id?: string;
  email: string;
  isActive: boolean;
  lastSync?: string;
  messageCount: number;
};
