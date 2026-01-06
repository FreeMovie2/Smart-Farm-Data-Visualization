import type { ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <AppHeader />
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
