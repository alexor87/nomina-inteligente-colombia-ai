import React from 'react';
import { motion } from 'framer-motion';

export const MayaBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      {/* Subtle dot pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(0,0,0) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      {/* Very subtle radial gradient from center */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.02) 0%, transparent 60%)'
        }}
      />
    </div>
  );
};
