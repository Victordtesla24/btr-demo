'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import StarLetterAnimation from '@/components/animations/StarLetterAnimation';

/**
 * Navbar Component
 * 
 * Fixed top navigation with brand and menu items
 * Matches original site structure with unusual heading hierarchy:
 * - Brand/Logo: h6 heading
 * - Navigation items: h1 headings (unusual but matches original)
 * 
 * Requirements:
 * - Brand/Logo: "CHRIS COLE" (h6 heading)
 * - Navigation items: WORK, ABOUT, SKETCHES (h1 headings)
 * - Fixed position on scroll
 * - Background changes on scroll (transparent → semi-transparent with blur)
 * - Active section highlighting works
 * - Smooth scroll to sections on click
 * - Hover effects (underline/glow)
 * - Mobile hamburger menu (responsive)
 * - Mobile menu opens/closes with animation
 * - Heading hierarchy maintained (h6 brand, h1 nav items, h2 sections)
 */
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { name: 'Home', href: '/', letter: 'H' },
      { name: 'Birth Chart', href: '/birth-chart', letter: 'B' },
      { name: 'Birth Time Rectification', href: '/birth-time-rectification', letter: 'B2' },
      { name: 'Comprehensive Analysis', href: '/comprehensive-analysis', letter: 'C' },
    ],
    []
  );

  const isActivePath = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        {/* Brand/Logo - h6 heading (matches original structure) */}
        <h6 className="text-xl font-bold tracking-tight">
          <Link href="/" className="hover:text-gray-200 transition-colors">
            JYOTISH SHASTRA
          </Link>
        </h6>
        
        {/* Desktop Navigation - h1 headings (matches original structure) */}
        <ul className="hidden md:flex space-x-8 text-sm font-mono uppercase">
          {navItems.map((item) => (
            <li 
              key={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <StarLetterAnimation
                letter={item.letter}
                label={item.name.toUpperCase()}
                isHovered={hoveredItem === item.href}
                isActive={isActivePath(item.href)}
                onClick={() => router.push(item.href)}
              />
              {isActivePath(item.href) && (
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-white"></span>
              )}
            </li>
          ))}
        </ul>
        
        {/* Mobile menu button */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800">
          <ul className="px-6 py-4 space-y-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <h1>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-left w-full block hover:text-gray-200 transition-colors ${
                      isActivePath(item.href) ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    {item.name}
                  </Link>
                </h1>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
