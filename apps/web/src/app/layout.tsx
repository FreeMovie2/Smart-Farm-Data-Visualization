import type { ReactNode } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import { AppHeader } from '../components/AppHeader';
import './globals.css';

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={bodyFont.variable}>
      <body className="app-body">
        <AppHeader>{children}</AppHeader>
      </body>
    </html>
  );
}
