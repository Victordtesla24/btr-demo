/**
 * Contact Section Component
 * 
 * Contact information and social links
 * Matches IMPLEMENTATION_COMPONENTS.md (394-412)
 * 
 * SUGGESTED ANIMATION OPTIONS (Choose 1):
 * 
 * Option 1: RADIO TELESCOPE ARRAY ANIMATION
 * - Multiple radio telescope dishes scanning sky
 * - Synchronized dish rotation movements
 * - Radio wave signal reception visualization
 * - Data stream particles flowing to central hub
 * - Perfect for: Communication, reaching out, receiving messages
 * 
 * Option 2: VOYAGER PROBE ANIMATION
 * - Voyager spacecraft with golden record
 * - Traveling through deep space with trajectory trail
 * - Communication signals beaming back to Earth
 * - Subtle rotation with antenna dishes
 * - Perfect for: Connection, sending messages, exploration
 * 
 * Option 3: WORMHOLE PORTAL ANIMATION
 * - Swirling spacetime portal visualization
 * - Event horizon with gravitational distortion
 * - Particles spiraling into the portal
 * - Einstein-Rosen bridge light effects
 * - Perfect for: Gateway, direct connection, bridging distance
 */

'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/animations/scrollTrigger';
import EmailCopyButton from '@/components/ui/EmailCopyButton';
import ParallaxStars from '@/components/animations/ParallaxStars';
import CometAnimation from '@/components/animations/CometAnimation';

const ContactSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { controls } = useScrollTrigger(sectionRef);

  const email = 'hello@jyotishshastra.com';
  const socialLinks = [
    { name: 'LinkedIn', url: 'https://linkedin.com', icon: '🔗' },
    { name: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
    { name: 'Dribbble', url: 'https://dribbble.com', icon: '🏀' },
  ];

  return (
    <section ref={sectionRef} id="contact" className="relative section-container py-20 md:py-32 min-h-screen flex items-center justify-center bg-black">
      {/* Starry Background with Parallax + 3D Comet */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ParallaxStars />
        <CometAnimation className="w-full h-full" />
      </div>

      <motion.div
        className="relative z-10 w-full"
        initial="hidden"
        animate={controls}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-12">CONTACT</h2>

        {/* Email Section */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="mb-12"
        >
          <EmailCopyButton email={email} showEmail={true} />
        </motion.div>

        {/* Social Links */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="flex justify-center gap-8"
        >
          {socialLinks.map((social, index) => (
            <motion.a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={controls}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1 }}
              className="text-3xl hover:opacity-80 transition-opacity"
            >
              {social.icon}
            </motion.a>
          ))}
        </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ContactSection;
