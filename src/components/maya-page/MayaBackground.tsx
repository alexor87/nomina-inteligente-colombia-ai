import React from 'react';
import { motion } from 'framer-motion';

export const MayaBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient with vignette */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Radial glow overlays - deterministic positions */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-[5%] right-[10%] w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />
      
      {/* Vignette mask */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(15, 23, 42, 0.4) 100%)'
        }}
      />

      {/* Floating particles - deterministic */}
      {Array.from({ length: 12 }).map((_, i) => {
        const startX = (i * 83) % 100; // Pseudo-random but deterministic
        const startY = (i * 67) % 100;
        const endX = ((i * 83) + 30) % 100;
        const endY = ((i * 67) + 40) % 100;
        
        return (
          <motion.div
            key={i}
            initial={{
              left: `${startX}%`,
              top: `${startY}%`,
            }}
            animate={{
              left: [`${startX}%`, `${endX}%`],
              top: [`${startY}%`, `${endY}%`],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15 + (i * 2),
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
              delay: i * 0.5
            }}
            className="absolute w-1 h-1 rounded-full bg-purple-400/40"
            style={{ filter: 'blur(0.5px)' }}
          />
        );
      })}
    </div>
  );
};
