import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Finding Astro',
  description: 'A civic platform for animal welfare and human-animal coexistence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-astro-cream text-astro-dark antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
