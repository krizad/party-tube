import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/lib/i18n';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PartyTube - Collaborative YouTube Music & Karaoke Queue',
  description: 'Party hosts open the player on a big screen, guests scan a QR code on their phones to search and add YouTube songs to a live real-time queue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`dark ${prompt.variable}`}>
      <body className="font-sans min-h-screen bg-party-dark text-slate-100 antialiased selection:bg-party-neonPurple selection:text-white">
        <LanguageProvider>
          {children}
          <Toaster position="bottom-center" richColors theme="dark" />
        </LanguageProvider>
      </body>
    </html>
  );
}
