import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
