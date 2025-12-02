import type { Metadata } from 'next';
import { spaceGrotesk } from './fonts';
import './globals.css';
import SmoothScroll from '@/components/layout/SmoothScroll';
import CursorTrail from '@/components/animations/CursorTrail';
import LoadingOverlay from '@/components/animations/LoadingOverlay';
import ParallaxStars from '@/components/animations/ParallaxStars';
import Constellation from '@/components/animations/Constellation';

export const metadata: Metadata = {
  title: 'Jyotish Shastra – Vedic Astrology & Birth Time Rectification',
  description:
    'Jyotish Shastra: Vedic astrology, birth chart analysis, and birth time rectification with immersive space-inspired visualizations.',
  keywords: [
    'jyotish',
    'vedic astrology',
    'birth chart',
    'birth time rectification',
    'black hole visualization',
  ],
  authors: [{ name: 'Jyotish Shastra' }],
  openGraph: {
    title: 'Jyotish Shastra – Vedic Astrology',
    description:
      'Explore birth charts, birth time rectification, and comprehensive Jyotish analysis in a cinematic space environment.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jyotish Shastra – Vedic Astrology',
    description: 'Birth chart analysis, BTR, and comprehensive Jyotish insights.',
  },
  metadataBase: new URL(process.env.SITE_URL || 'https://localhost:3001'),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-sans antialiased">
        <SmoothScroll>
          <LoadingOverlay />
          <ParallaxStars />
          <Constellation />
          <CursorTrail />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
