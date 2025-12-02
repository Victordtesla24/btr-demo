/**
 * Work Section Component
 * 
 * Birth Chart Generator with Earth-Moon-Sun animation background
 * Layout: Left side - Animation, Right side - Form
 */

'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useScrollTrigger } from '@/animations/scrollTrigger';
import EarthMoonSunAnimation from '@/components/animations/EarthMoonSunAnimation';
import BirthChartForm, { BirthChartData } from '@/components/ui/BirthChartForm';
import ParallaxStars from '@/components/animations/ParallaxStars';

const WorkSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { controls } = useScrollTrigger(sectionRef);

  const handleGenerate = (data: BirthChartData) => {
    console.log('Birth Chart Data:', data);
    // TODO: Implement birth chart generation logic
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  return (
    <section ref={sectionRef} id="birth-chart" className="section-container py-20 md:py-32 relative min-h-screen flex items-center bg-black">
      {/* Starry Background with Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <ParallaxStars />
      </div>

      {/* Earth-Moon-Sun Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <EarthMoonSunAnimation />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">BIRTH CHART</h2>
          <p className="text-base md:text-lg text-gray-300 font-mono">
            Generate a precise chart with your birth details.
          </p>
        </motion.div>

        {/* Two Column Layout - Animation Left, Form Right */}
        <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
          {/* Left Side: Animation Space */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex-1 flex items-center justify-center w-full lg:w-auto min-h-[400px]"
          >
            <div className="text-center text-gray-600 text-sm font-mono opacity-50">
              {/* Animation visible in background */}
            </div>
          </motion.div>

          {/* Right Side: Birth Chart Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex-1 flex items-center justify-center w-full lg:w-auto"
          >
            <BirthChartForm 
              onGenerate={handleGenerate}
              onClear={handleClear}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WorkSection;
