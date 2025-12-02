/**
 * Home Page Component
 * 
 * Main page structure following App Router pattern
 * Matches original site structure from hellochriscole.webflow.io
 */

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import WorkSection from '@/components/sections/WorkSection';
import BTRSection from '@/components/sections/BTRSection';
import ComprehensiveAnalysisSection from '@/components/sections/ComprehensiveAnalysisSection';
import SketchesSection from '@/components/sections/SketchesSection';
import SaturnCanvasAnimation from '@/components/animations/SaturnCanvasAnimation';

export default function Home() {
  return (
    <main className="relative min-h-screen">
      
      <Navbar />
      
      {/* Saturn Animation with hero headline + CTAs */}
      <section
        id="home"
        className="relative flex items-center justify-end overflow-hidden"
        style={{ height: '100vh' }}
      >
        <SaturnCanvasAnimation />
        <div className="relative z-10 max-w-xl w-full px-6 md:px-12 lg:px-16 flex flex-col items-end gap-6 text-right">
          <h1 className="text-4xl md:text-5xl font-semibold text-white">
            Jyotish Shastra
          </h1>
          <div className="flex flex-col items-end gap-3">
            <Link
              href="/birth-chart"
              className="px-5 py-2.5 rounded-full border border-white/30 bg-black/40 text-xs md:text-sm tracking-[0.18em] uppercase text-white hover:bg-white/10 transition-colors"
            >
              Birth Chart
            </Link>
            <Link
              href="/birth-time-rectification"
              className="px-5 py-2.5 rounded-full border border-white/30 bg-black/40 text-xs md:text-sm tracking-[0.18em] uppercase text-white hover:bg-white/10 transition-colors"
            >
              BTR
            </Link>
            <Link
              href="/comprehensive-analysis"
              className="px-5 py-2.5 rounded-full border border-white/30 bg-black/40 text-xs md:text-sm tracking-[0.18em] uppercase text-white hover:bg-white/10 transition-colors"
            >
              Comprehensive Analysis
            </Link>
          </div>
        </div>
      </section>
      
      <div className="relative z-10">
        <WorkSection />
        <BTRSection />
        <ComprehensiveAnalysisSection />

        {/* Quick access band replacing the original About section with real links */}
        <section
          id="about"
          className="relative py-16 md:py-20 bg-black"
        >
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-wider text-white mb-4">
              Explore Jyotish Shastra
            </h2>
            <p className="text-sm md:text-base text-gray-400 mb-10 max-w-2xl mx-auto">
              Jump directly to the core experiences: calculate your birth chart, refine your birth
              time, or dive into comprehensive astrological analysis.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              <Link
                href="/birth-chart"
                className="px-5 py-2.5 rounded-full border border-white/20 bg-white/5 text-xs md:text-sm tracking-[0.16em] uppercase text-white hover:bg-white/10 transition-colors"
              >
                Birth Chart
              </Link>
              <Link
                href="/birth-time-rectification"
                className="px-5 py-2.5 rounded-full border border-white/20 bg-white/5 text-xs md:text-sm tracking-[0.16em] uppercase text-white hover:bg-white/10 transition-colors"
              >
                Birth Time Rectification
              </Link>
              <Link
                href="/comprehensive-analysis"
                className="px-5 py-2.5 rounded-full border border-white/20 bg-white/5 text-xs md:text-sm tracking-[0.16em] uppercase text-white hover:bg-white/10 transition-colors"
              >
                Comprehensive Analysis
              </Link>
            </div>
          </div>
        </section>

        <SketchesSection />
      </div>
      
      <Footer />
    </main>
  );
}
