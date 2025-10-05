import React from 'react';
import { MayaPageHeader } from '@/components/maya-page/MayaPageHeader';
import { MayaBackground } from '@/components/maya-page/MayaBackground';
import { MayaChatArea } from '@/components/maya-page/MayaChatArea';
import { MayaInputArea } from '@/components/maya-page/MayaInputArea';
import { motion } from 'framer-motion';

export default function MayaPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      <MayaBackground />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col h-full"
      >
        <MayaPageHeader />
        
        <div className="flex-1 overflow-hidden px-4 md:px-8 pb-4">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <MayaChatArea />
            <MayaInputArea />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
