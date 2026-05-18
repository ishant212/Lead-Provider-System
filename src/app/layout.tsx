import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Provider",
  description: "A robust lead distribution system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F7F6F3] text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between h-14 items-center">
              <a href="/" className="text-base font-semibold tracking-tight text-gray-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Lead Provider
              </a>
              <div className="flex items-center gap-8">
                <a href="/request-service" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Request Service</a>
                <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</a>
                <a href="/test-tools" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Test Tools</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
