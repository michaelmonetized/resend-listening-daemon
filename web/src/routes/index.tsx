/**
 * Inbox View (Index Route)
 *
 * Displays list of emails from all active boxes
 * Features:
 * - Message list with sender, subject, date
 * - Unread indicator
 * - Click to view details
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/")({
  component: InboxPage,
});

function InboxPage() {
  // Query messages from Convex (will fail gracefully if not yet connected)
  const data = useQuery(api.messages.getMessages, { limit: 50 });
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-lg font-semibold">Inbox</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {total} messages
          </span>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-auto">
        {!data ? (
          <LoadingState />
        ) : messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((message) => (
              <MessageRow key={message._id} message={message} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: any }) {
  const isUnread = !message.isRead;

  return (
    <li>
      <Link
        to={`/message/${message.messageId}`}
        className={`flex items-center gap-4 px-6 py-4 hover:bg-accent/50 transition-colors ${
          isUnread ? "bg-accent/20" : ""
        }`}
      >
        {/* Unread indicator */}
        <div className="w-2">
          {isUnread && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>

        {/* Sender */}
        <div className="w-48 truncate">
          <span className={isUnread ? "font-semibold" : "text-muted-foreground"}>
            {formatSender(message.from)}
          </span>
        </div>

        {/* Subject + Preview */}
        <div className="flex-1 truncate">
          <span className={isUnread ? "font-semibold" : ""}>
            {message.subject}
          </span>
          {message.body && (
            <span className="ml-2 text-muted-foreground">
              — {message.body.slice(0, 100)}
            </span>
          )}
        </div>

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="text-muted-foreground">
            📎 {message.attachments.length}
          </div>
        )}

        {/* Date */}
        <div className="w-24 text-right text-sm text-muted-foreground">
          {formatDate(message.date)}
        </div>
      </Link>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">📬</div>
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">📭</div>
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Emails will appear here when they arrive
        </p>
      </div>
    </div>
  );
}

// Helper functions
function formatSender(from: string): string {
  // Extract name from "Name <email@domain.com>" format
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  if (match) {
    return match[1].trim();
  }
  // If no name, use email local part
  const emailMatch = from.match(/^([^@]+)@/);
  if (emailMatch) {
    return emailMatch[1];
  }
  return from;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}
