import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maestro - AI Agent Orchestration",
  description: "Command center for autonomous AI agents building applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50 antialiased">
        <ToastProvider />
        <div className="flex h-screen flex-col">
          {/* Header */}
          <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="text-xl font-bold text-blue-400">⚡ Maestro</div>
                <span className="text-sm text-slate-400">AI Agent Command Center</span>
              </Link>
              <nav className="flex items-center gap-4">
                <Link href="/projects" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Projects
                </Link>
                <Link href="/improvements" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Improvements
                </Link>
                <Link href="/monitor" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Monitor
                </Link>
                <Link href="/agents" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Agents
                </Link>
                <Link href="/analytics" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Analytics
                </Link>
                <Link href="/settings" className="text-sm text-slate-300 hover:text-blue-400 transition">
                  Settings
                </Link>
                <div className="border-l border-slate-700 h-4 mx-2"></div>
                <LogoutButton />
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-slate-950 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
