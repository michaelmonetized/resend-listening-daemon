/**
 * CC6: Box Management Page
 *
 * Features:
 * - List all configured email boxes
 * - Add new box
 * - Remove box
 * - Show active status + message count
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import {
  Envelope,
  Plus,
  Trash,
  Power,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/boxes")({
  component: BoxesPage,
});

function BoxesPage() {
  const boxes = useQuery(api.boxes.getBoxes);
  const addBox = useMutation(api.boxes.addBox);
  const removeBox = useMutation(api.boxes.removeBox);
  const toggleBoxActive = useMutation(api.boxes.toggleBoxActive);

  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newEmail.trim()) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError("Invalid email format");
      return;
    }

    setIsAdding(true);
    try {
      await addBox({ email: newEmail.trim() });
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add box");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveBox = async (email: string) => {
    if (!confirm(`Remove box ${email}? Messages will not be deleted.`)) {
      return;
    }

    try {
      await removeBox({ email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove box");
    }
  };

  const handleToggleActive = async (email: string) => {
    try {
      await toggleBoxActive({ email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle box");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <h2 className="text-lg font-semibold">📮 Manage Boxes</h2>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Add Box Form */}
        <div className="mb-8 rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium">Add Email Box</h3>

          <form onSubmit={handleAddBox} className="flex gap-4">
            <div className="flex-1">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@yourdomain.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" weight="bold" />
              {isAdding ? "Adding..." : "Add Box"}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Add an email address that Resend is configured to receive mail for.
            The daemon will listen for incoming emails on this box.
          </p>
        </div>

        {/* Boxes List */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-medium">Configured Boxes</h3>
          </div>

          {!boxes ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading boxes...</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Envelope className="h-12 w-12 text-muted-foreground" weight="duotone" />
              <p className="mt-4 text-muted-foreground">No boxes configured</p>
              <p className="text-sm text-muted-foreground">Add an email box above to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {boxes.map((box) => (
                <BoxRow
                  key={box._id}
                  box={box}
                  onRemove={handleRemoveBox}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

interface BoxRowProps {
  box: {
    _id: string;
    email: string;
    isActive: boolean;
    lastSync?: string;
    messageCount: number;
  };
  onRemove: (email: string) => void;
  onToggleActive: (email: string) => void;
}

function BoxRow({ box, onRemove, onToggleActive }: BoxRowProps) {
  return (
    <li className="flex items-center gap-4 px-6 py-4">
      {/* Status indicator */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {box.isActive ? (
          <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" weight="fill" />
        )}
      </div>

      {/* Email */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{box.email}</p>
        <p className="text-sm text-muted-foreground">
          {box.messageCount} messages
          {box.lastSync && (
            <span className="ml-2">
              • Last sync: {new Date(box.lastSync).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Active */}
        <button
          type="button"
          onClick={() => onToggleActive(box.email)}
          className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
            box.isActive
              ? "border-green-500/50 bg-green-500/10 text-green-500 hover:bg-green-500/20"
              : "border-border hover:bg-accent"
          }`}
          title={box.isActive ? "Deactivate box" : "Activate box"}
        >
          <Power className="h-4 w-4" weight="bold" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(box.email)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove box"
        >
          <Trash className="h-4 w-4" weight="bold" />
        </button>
      </div>
    </li>
  );
}
