import * as React from "react";
import { Link } from "@tanstack/react-router";
import { EnvelopeOpen, EnvelopeSimple, Star } from "@phosphor-icons/react";
import type { Message } from "../../convex/schema";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {messages.map((message) => (
        <Link
          key={message.messageId}
          to={`/${message.messageId}`}
          className="px-6 py-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-l-4 border-transparent hover:border-blue-600 dark:hover:border-blue-400"
        >
          <div className="flex items-start gap-4">
            {/* Unread indicator */}
            <div className="flex-shrink-0 pt-1">
              {message.isRead ? (
                <EnvelopeOpen className="w-5 h-5 text-slate-400 dark:text-slate-600" />
              ) : (
                <EnvelopeSimple className="w-5 h-5 text-blue-600 dark:text-blue-400 font-bold" />
              )}
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <p className={`font-medium truncate ${message.isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white font-semibold"}`}>
                  {message.from}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500 flex-shrink-0">
                  {formatDate(message.date)}
                </p>
              </div>

              <h3 className={`text-sm mt-1 truncate ${message.isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white font-semibold"}`}>
                {message.subject || "(no subject)"}
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                {message.body || "(no content)"}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                {message.attachments && message.attachments.length > 0 && (
                  <span>📎 {message.attachments.length} attachment{message.attachments.length > 1 ? "s" : ""}</span>
                )}
                {message.isStarred && <Star className="w-4 h-4 text-yellow-500" weight="fill" />}
                {message.labels && message.labels.length > 0 && (
                  <div className="flex gap-1">
                    {message.labels.slice(0, 2).map((label) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Star indicator */}
            {message.isStarred && (
              <div className="flex-shrink-0">
                <Star className="w-5 h-5 text-yellow-500" weight="fill" />
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minMs = 60 * 1000;

  if (diff < minMs) {
    return "just now";
  } else if (diff < hourMs) {
    const mins = Math.floor(diff / minMs);
    return `${mins}m ago`;
  } else if (diff < dayMs) {
    const hours = Math.floor(diff / hourMs);
    return `${hours}h ago`;
  } else if (diff < 7 * dayMs) {
    const days = Math.floor(diff / dayMs);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}
