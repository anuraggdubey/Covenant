import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Covenant",
  description: "The proof-carrying options agent that tries to break your mandate before it trades."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
