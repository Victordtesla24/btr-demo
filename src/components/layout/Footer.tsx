/**
 * Footer Component
 * 
 * Footer with copyright and credits
 * 
 * Requirements:
 * - Copyright text present (current year)
 * - Tech stack credit present
 * - Design credit/acknowledgment present
 * - No Webflow badge (removed for replica)
 * - Centered layout
 * - Monospace font for technical details
 * - Proper spacing and padding
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black border-t border-gray-500 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center text-sm font-mono text-gray-300">
          <p>© {currentYear} Jyotish Shastra. All rights reserved.</p>
          <p className="mt-2">Built with Next.js, GSAP, Framer Motion</p>
          <p className="mt-4 text-xs text-gray-400">
            Space-inspired interface for Vedic astrology, birth charts, and birth time rectification.
          </p>
        </div>
      </div>
    </footer>
  );
}
