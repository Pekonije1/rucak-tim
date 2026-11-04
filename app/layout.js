import './globals.css';

export const metadata = {
  title: 'Ručak',
  description: 'Nedeljne porudžbine hrane',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
