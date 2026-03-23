/**
 * CC6: Convex Hooks
 *
 * Custom hooks for Convex operations:
 * - useBoxes() - Get all boxes
 * - useAddBox() - Add a new box
 * - useRemoveBox() - Remove a box
 * - useMessages() - Get messages
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";

// ==================== BOX HOOKS ====================

/**
 * Get all configured email boxes
 */
export function useBoxes() {
  const boxes = useQuery(api.boxes.getBoxes);

  return {
    boxes: boxes ?? [],
    isLoading: boxes === undefined,
  };
}

/**
 * Get a single box by email
 */
export function useBox(email: string) {
  const box = useQuery(api.boxes.getBox, { email });

  return {
    box,
    isLoading: box === undefined,
  };
}

/**
 * Add a new email box
 */
export function useAddBox() {
  const mutation = useMutation(api.boxes.addBox);

  return {
    addBox: async (email: string) => {
      return mutation({ email, isActive: true });
    },
  };
}

/**
 * Remove an email box
 */
export function useRemoveBox() {
  const mutation = useMutation(api.boxes.removeBox);

  return {
    removeBox: async (email: string, deleteMessages = false) => {
      return mutation({ email, deleteMessages });
    },
  };
}

/**
 * Toggle box active status
 */
export function useToggleBoxActive() {
  const mutation = useMutation(api.boxes.toggleBoxActive);

  return {
    toggleBoxActive: async (email: string) => {
      return mutation({ email });
    },
  };
}

// ==================== MESSAGE HOOKS ====================

/**
 * Get messages with optional filters
 */
export function useMessages(options?: {
  boxEmail?: string;
  limit?: number;
  offset?: number;
  searchTerm?: string;
  includeArchived?: boolean;
}) {
  const result = useQuery(api.messages.getMessages, {
    boxEmail: options?.boxEmail,
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    searchTerm: options?.searchTerm,
    includeArchived: options?.includeArchived ?? false,
  });

  return {
    messages: result?.messages ?? [],
    total: result?.total ?? 0,
    hasMore: result?.hasMore ?? false,
    isLoading: result === undefined,
  };
}

/**
 * Get a single message by ID
 */
export function useMessage(messageId: string) {
  const message = useQuery(api.messages.getMessage, { messageId });

  return {
    message,
    isLoading: message === undefined,
  };
}

/**
 * Mark message as read
 */
export function useMarkAsRead() {
  const mutation = useMutation(api.messages.markAsRead);

  return {
    markAsRead: async (messageId: string) => {
      return mutation({ messageId });
    },
  };
}

/**
 * Toggle star status
 */
export function useToggleStar() {
  const mutation = useMutation(api.messages.toggleStar);

  return {
    toggleStar: async (messageId: string) => {
      return mutation({ messageId });
    },
  };
}

/**
 * Archive message
 */
export function useArchiveMessage() {
  const mutation = useMutation(api.messages.archiveMessage);

  return {
    archiveMessage: async (messageId: string) => {
      return mutation({ messageId });
    },
  };
}

/**
 * Delete message
 */
export function useDeleteMessage() {
  const mutation = useMutation(api.messages.deleteMessage);

  return {
    deleteMessage: async (messageId: string) => {
      return mutation({ messageId });
    },
  };
}

/**
 * Mark as spam
 */
export function useMarkAsSpam() {
  const mutation = useMutation(api.messages.markAsSpam);

  return {
    markAsSpam: async (messageId: string) => {
      return mutation({ messageId });
    },
  };
}

// ==================== ATTACHMENT HOOKS ====================

/**
 * Get attachments for a message
 */
export function useAttachments(messageId: string) {
  const attachments = useQuery(api.attachments.getAttachments, { messageId });

  return {
    attachments: attachments ?? [],
    isLoading: attachments === undefined,
  };
}
