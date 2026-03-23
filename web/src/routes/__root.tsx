/**
 * Root Layout
 *
 * Provides:
 * - HTML shell with meta tags
 * - Global navigation sidebar
 * - Convex provider context
 */

import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Meta, Scripts } from "@tanstack/start";
import * as React from "react";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Resendld - Email Dashboard" },
    ],
    links: [
      { rel: "stylesheet", href: "/src/styles.css" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <Meta />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          {/* Navigation Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main className="flex-1 pl-64">{children}</main>
        </div>
        <ScrollRestoration />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-bold">
            📧 Resendld
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink href="/" icon="📥">
            Inbox
          </NavLink>
          <NavLink href="/starred" icon="⭐">
            Starred
          </NavLink>
          <NavLink href="/archive" icon="📦">
            Archive
          </NavLink>
          <NavLink href="/spam" icon="🚫">
            Spam
          </NavLink>
          <NavLink href="/trash" icon="🗑️">
            Trash
          </NavLink>

          <div className="my-4 border-t border-border" />

          <NavLink href="/boxes" icon="📮">
            Manage Boxes
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Resendld v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
    >
      <span>{icon}</span>
      <span>{children}</span>
    </a>
  );
}
