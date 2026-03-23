/**
 * CC5: Attachment List Component
 *
 * Displays attachments for a message:
 * - Filename, size, MIME type
 * - Download button
 * - Image preview (inline for image/*)
 */

import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import {
  File,
  FileImage,
  FilePdf,
  FileText,
  FileArchive,
  FileAudio,
  FileVideo,
  Download,
} from "@phosphor-icons/react";

interface AttachmentListProps {
  messageId: string;
  attachments?: Array<{
    filename: string;
    filepath: string;
    size: number;
    mimeType: string;
  }>;
}

export function AttachmentList({ messageId, attachments }: AttachmentListProps) {
  // Query attachments from Convex if not provided inline
  const queryResult = useQuery(
    api.attachments.getAttachments,
    attachments ? "skip" : { messageId }
  );

  const attachmentList = attachments ?? queryResult ?? [];

  if (attachmentList.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span>📎</span>
        <span>Attachments ({attachmentList.length})</span>
      </h4>

      <div className="space-y-2">
        {attachmentList.map((attachment, index) => (
          <AttachmentItem key={`${attachment.filename}-${index}`} attachment={attachment} />
        ))}
      </div>
    </div>
  );
}

function AttachmentItem({
  attachment,
}: {
  attachment: {
    filename: string;
    filepath: string;
    size: number;
    mimeType: string;
  };
}) {
  const isImage = attachment.mimeType.startsWith("image/");
  const Icon = getFileIcon(attachment.mimeType);

  return (
    <div className="flex items-center gap-3 rounded-md border border-border/50 p-3 hover:bg-accent/50 transition-colors">
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" weight="duotone" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(attachment.size)} • {attachment.mimeType}
        </p>
      </div>

      {/* Preview for images */}
      {isImage && (
        <ImagePreview filepath={attachment.filepath} alt={attachment.filename} />
      )}

      {/* Download button */}
      <DownloadButton filepath={attachment.filepath} filename={attachment.filename} />
    </div>
  );
}

function ImagePreview({ filepath, alt }: { filepath: string; alt: string }) {
  // In a real implementation, this would serve the file through an API endpoint
  // For now, we show a preview icon that could be expanded
  return (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-accent"
      title="Preview image"
    >
      <FileImage className="h-5 w-5 text-muted-foreground" weight="duotone" />
    </button>
  );
}

function DownloadButton({
  filepath,
  filename,
}: {
  filepath: string;
  filename: string;
}) {
  const handleDownload = () => {
    // Create a download link
    // In production, this would go through an API endpoint that serves the file
    // For local development, we can use a file:// URL (won't work in browser)
    // Best approach: serve files through the web server
    const downloadUrl = `/api/attachments/download?path=${encodeURIComponent(filepath)}`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.click();
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
      title={`Download ${filename}`}
    >
      <Download className="h-5 w-5 text-muted-foreground" weight="duotone" />
    </button>
  );
}

// Get appropriate icon based on MIME type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf") return FilePdf;
  if (mimeType.startsWith("text/")) return FileText;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return FileArchive;
  }
  return File;
}

// Format bytes to human-readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
