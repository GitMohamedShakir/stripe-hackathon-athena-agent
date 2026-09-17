import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: 'Weatherwise — Your Forecast Agent',
  description:
    'Ask practical weather questions and plan your day with your personal Athena-powered forecast agent.',
  openGraph: {
    title: 'Weatherwise — Your Forecast Agent',
    description: 'A clearer forecast for every plan.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Weatherwise forecast agent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weatherwise — Your Forecast Agent',
    description: 'A clearer forecast for every plan.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
