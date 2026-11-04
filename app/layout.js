import './globals.css';
import { THEME_BOOT } from '@/lib/theme';

export const metadata = {
  title: 'Ručak',
  description: 'Nedeljne porudžbine hrane',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
