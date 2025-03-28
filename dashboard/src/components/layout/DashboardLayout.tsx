import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-800/40 bg-background-darker px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-dune-400">
            Liquidity Oracle Analytics
          </h1>
          <div className="text-sm text-gray-400">
            Last update:{" "}
            <span className="text-dune-300 font-medium">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
