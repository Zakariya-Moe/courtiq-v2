import './globals.css';
import BottomNav from './components/BottomNav';
import IOSInstallHint from './components/IOSInstallHint';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'CourtIQ',
  description: 'Live NBA performance engine',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CourtIQ',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="app-shell">
          {children}
        </div>
        <BottomNav />
        <IOSInstallHint />
      </body>
    </html>
  );
}
