import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    template: '%s | Survivalecke',
    default: 'Survivalecke – Client-Mod-Datenbank',
  },
  description:
    'Prüfe, ob dein Client-Mod auf Survivalecke erlaubt, eingeschränkt oder verboten ist. Offizielle Prüfliste für Minecraft Client-Modifikationen.',
  metadataBase: new URL('https://survivalecke-modlist.vercel.app'),
  keywords: ['Survivalecke', 'Minecraft', 'Client Mods', 'Modlist', 'Erlaubte Mods', 'Minecraft Server'],
  authors: [{ name: 'Survivalecke Team' }],
  icons: {
    icon: '/logo.webp',
    shortcut: '/logo.webp',
    apple: '/logo.webp',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0d0e11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0d0e11] text-zinc-200 selection:bg-emerald-500/20 selection:text-emerald-300">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
