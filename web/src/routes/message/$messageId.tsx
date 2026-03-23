/**
 * Message Detail Route
 *
 * Displays full email with:
 * - Header (from, to, cc, bcc, subject, date)
 * - Body (plain text or HTML)
 * - Attachments (CC5)
 * - Actions (archive, delete, spam, reply)
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import { AttachmentList } from "@/components/AttachmentList";
import {
  ArrowLeft,
  Archive,
  Trash,
  Warning,
  Star,
  Reply,
} from "@phosphor-icons/react";
import { useState } from "react";

export const Route = createFileRoute("/message/$messageId")({
  component: MessageDetailPage,
});

function MessageDetailPage() {
  const { messageId } = Route.useParams();
  const message = useQuery(api.messages.getMessage, { messageId });

  // Mutations
  const markAsRead = useMutation(api.messages.markAsRead);
  const toggleStar = useMutation(api.messages.toggleStar);
  const archiveMessage = useMutation(api.messages.archiveMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const markAsSpam = useMutation(api.messages.markAsSpam);

  const [showReply, setShowReply] = useState(false);

  // Mark as read on view
  if (message && !message.isRead) {
    markAsRead({ messageId });
  }

  if (!message) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📭</div>
          <p className="text-muted-foreground">Loading message...</p>
        </div>
      </div>
    );
  }

  const handleArchive = async () => {
    await archiveMessage({ messageId });
    window.history.back();
  };

  const handleDelete = async () => {
    if (confirm("Delete this message?")) {
      await deleteMessage({ messageId });
      window.history.back();
    }
  };

  const handleSpam = async () => {
    await markAsSpam({ messageId });
    window.history.back();
  };

  const handleToggleStar = async () => {
    await toggleStar({ messageId });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" weight="bold" />
            <span>Back</span>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleStar}
            className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
              message.isStarred
                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                : "border-border hover:bg-accent"
            }`}
            title={message.isStarred ? "Unstar" : "Star"}
          >
            <Star className="h-4 w-4" weight={message.isStarred ? "fill" : "bold"} />
          </button>

          <button
            type="button"
            onClick={handleArchive}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            title="Archive"
          >
            <Archive className="h-4 w-4" weight="bold" />
          </button>

          <button
            type="button"
            onClick={handleSpam}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            title="Mark as spam"
          >
            <Warning className="h-4 w-4" weight="bold" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash className="h-4 w-4" weight="bold" />
          </button>

          <button
            type="button"
            onClick={() => setShowReply(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Reply className="h-4 w-4" weight="bold" />
            Reply
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Subject */}
          <h1 className="text-2xl font-bold">{message.subject}</h1>

          {/* Metadata */}
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              {/* Avatar placeholder */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-bold">
                {getInitials(message.from)}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatSender(message.from)}</span>
                  <span className="text-sm text-muted-foreground">
                    {extractEmail(message.from)}
                  </span>
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  <span>To: {message.to.join(", ")}</span>
                  {message.cc && message.cc.length > 0 && (
                    <span className="ml-4">Cc: {message.cc.join(", ")}</span>
                  )}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(message.date).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="mt-6 prose prose-invert max-w-none">
            {message.bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
            ) : (
              <pre className="whitespace-pre-wrap font-sans">{message.body}</pre>
            )}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentList messageId={messageId} attachments={message.attachments} />
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReply && (
        <ReplyModal
          message={message}
          onClose={() => setShowReply(false)}
        />
      )}
    </div>
  );
}

function ReplyModal({
  message,
  onClose,
}: {
  message: { from: string; subject: string; messageId: string };
  onClose: () => void;
}) {
  const [to, setTo] = useState(extractEmail(message.from));
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    // TODO: Implement actual sending via Resend API
    alert(`Reply to ${to}:\n\n${body}\n\n(Not yet implemented)`);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Reply to: {message.subject}</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Write your reply..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function formatSender(from: string): string {
  const match = from.match(/^(.+?)\s*<[^>]+>$/);
  return match ? match[1].trim() : from.split("@")[0];
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function getInitials(from: string): string {
  const name = formatSender(from);
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
