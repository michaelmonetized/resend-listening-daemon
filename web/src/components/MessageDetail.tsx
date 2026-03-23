import * as React from "react";
import { Paperclip } from "@phosphor-icons/react";
import type { Message } from "../../convex/schema";
import AttachmentList from "./AttachmentList";

interface MessageDetailProps {
  message: Message;
}

export default function MessageDetail({ message }: MessageDetailProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{message.subject}</h1>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-600 dark:text-slate-400">From:</span>
            <span className="text-slate-900 dark:text-white font-medium">{message.from}</span>
          </div>

          {message.to && message.to.length > 0 && (
            <div className="flex justify-between items-start">
              <span className="text-slate-600 dark:text-slate-400">To:</span>
              <div className="text-slate-900 dark:text-white font-medium text-right">
                {message.to.map((addr, i) => (
                  <div key={i}>{addr}</div>
                ))}
              </div>
            </div>
          )}

          {message.cc && message.cc.length > 0 && (
            <div className="flex justify-between items-start">
              <span className="text-slate-600 dark:text-slate-400">Cc:</span>
              <div className="text-slate-900 dark:text-white font-medium text-right">
                {message.cc.map((addr, i) => (
                  <div key={i}>{addr}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-start pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">Date:</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {new Date(message.date).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-slate-900 p-6">
        {message.bodyHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-slate-900 dark:text-slate-100"
            dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-slate-900 dark:text-slate-100 text-sm leading-relaxed font-sans break-words">
            {message.body || "(no content)"}
          </div>
        )}
      </div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Attachments ({message.attachments.length})
            </h2>
          </div>
          <AttachmentList attachments={message.attachments} messageId={message.messageId} />
        </div>
      )}

      {/* Labels */}
      {message.labels && message.labels.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 border-t border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Labels</h2>
          <div className="flex gap-2 flex-wrap">
            {message.labels.map((label) => (
              <span
                key={label}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
