'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { ReactQueryProvider } from "@/lib/react-query";
import { useState } from "react";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Don't show layout on login page
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <html lang="vi">
        <body className={inter.className}>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="vi">
      <body className={inter.className}>
        <ReactQueryProvider>
          <AuthGuard>
          <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar toggle button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="fixed left-0 top-20 z-20 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50 shadow-sm"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isSidebarCollapsed ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              
              <Sidebar isCollapsed={isSidebarCollapsed} />
              <main className="flex-1 overflow-hidden bg-gray-50">
                {children}
              </main>
            </div>
          </div>
        </AuthGuard>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
