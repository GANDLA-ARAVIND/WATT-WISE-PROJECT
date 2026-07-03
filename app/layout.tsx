import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "WattWise - AI-Powered Household Energy Intelligence Platform",
  description: "Modern energy insights dashboard for smart households."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
