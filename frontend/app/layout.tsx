import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Release Notes Generator',
  description: 'AI-powered release notes generation from git diffs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
