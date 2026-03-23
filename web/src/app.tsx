import * as React from "react";
import { RootRoute } from "@tanstack/react-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL || "http://localhost:3210");

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <div className="w-full h-screen bg-slate-50 dark:bg-slate-950">
        {/* App content rendered by router */}
      </div>
    </ConvexProvider>
  );
}
