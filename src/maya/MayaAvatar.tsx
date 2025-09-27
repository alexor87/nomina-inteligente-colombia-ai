import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EmotionalState } from './types';
import { Brain, CheckCircle, AlertCircle, Loader2, Heart, Lightbulb } from 'lucide-react';

interface MayaAvatarProps {
  emotionalState: EmotionalState;
  isVisible: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MayaAvatar: React.FC<MayaAvatarProps> = ({ 
  emotionalState, 
  isVisible, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const getAvatarContent = () => {
    switch (emotionalState) {
      case 'analyzing':
        return {
          icon: Brain,
          bgColor: 'bg-blue-500',
          animation: 'pulse',
          iconColor: 'text-white'
        };
      case 'celebrating':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500',
          animation: 'bounce',
          iconColor: 'text-white'
        };
      case 'concerned':
        return {
          icon: AlertCircle,
          bgColor: 'bg-amber-500',
          animation: 'wiggle',
          iconColor: 'text-white'
        };
      case 'encouraging':
        return {
          icon: Heart,
          bgColor: 'bg-purple-500',
          animation: 'heartbeat',
          iconColor: 'text-white'
        };
      case 'thinking':
        return {
          icon: Lightbulb,
          bgColor: 'bg-yellow-500',
          animation: 'glow',
          iconColor: 'text-white'
        };
      default:
        return {
          icon: Brain,
          bgColor: 'bg-primary',
          animation: 'float',
          iconColor: 'text-white'
        };
    }
  };

  const avatarContent = getAvatarContent();
  const IconComponent = avatarContent.icon;

  const animationVariants = {
    float: {
      y: [0, -8, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    pulse: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    bounce: {
      y: [0, -12, 0],
      transition: {
        duration: 0.6,
        repeat: 3,
        ease: "easeOut"
      }
    },
    wiggle: {
      rotate: [-5, 5, -5, 5, 0],
      transition: {
        duration: 0.8,
        repeat: 2,
      }
    },
    heartbeat: {
      scale: [1, 1.2, 1, 1.1, 1],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    glow: {
      boxShadow: [
        "0 0 0 0 rgba(255, 255, 0, 0.7)",
        "0 0 0 10px rgba(255, 255, 0, 0)",
        "0 0 0 0 rgba(255, 255, 0, 0)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
      }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            ...animationVariants[avatarContent.animation] 
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`
            ${sizeClasses[size]} 
            ${avatarContent.bgColor} 
            rounded-full 
            flex 
            items-center 
            justify-center 
            shadow-lg 
            border-2 
            border-white
          `}
        >
          <IconComponent 
            className={`${size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'} ${avatarContent.iconColor}`} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};