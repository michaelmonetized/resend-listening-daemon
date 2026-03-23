import * as React from "react";
import { PaperPlaneRight, X } from "@phosphor-icons/react";

interface ReplyFormProps {
  messageId: string;
  originalFrom: string;
  onSent?: () => void;
}

export default function ReplyForm({ messageId, originalFrom, onSent }: ReplyFormProps) {
  const [to, setTo] = React.useState(originalFrom);
  const [cc, setCc] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
      alert("Please write a message");
      return;
    }

    setIsSending(true);

    try {
      // TODO: Call Convex mutation to send reply
      console.log("Sending reply to:", to, "\nCC:", cc, "\nBody:", body);

      // Simulate sending
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setBody("");
      setCc("");
      onSent?.();
    } catch (err) {
      console.error("Failed to send reply:", err);
      alert("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="space-y-3">
        {/* To field */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            To
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="recipient@example.com"
          />
        </div>

        {/* CC field */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Cc (optional)
          </label>
          <input
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cc@example.com"
          />
        </div>

        {/* Body field */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Message
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
            placeholder="Type your reply..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setBody("");
              onSent?.();
            }}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !body.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PaperPlaneRight className="w-4 h-4" />
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
