
import React from 'react';
import ModernHeader from '@/components/home/ModernHeader';
import HeroSection from '@/components/home/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FAQSection from '@/components/home/FAQSection';
import CTASection from '@/components/home/CTASection';
import ModernFooter from '@/components/home/ModernFooter';

const Index = () => {
  return (
    <div className="min-h-screen">
      <ModernHeader />
      
      <main>
        <HeroSection />
        
        <section id="features">
          <FeaturesSection />
        </section>
        
        <section id="testimonials">
          <TestimonialsSection />
        </section>
        
        <section id="faq">
          <FAQSection />
        </section>
        
        <CTASection />
      </main>
      
      <ModernFooter />
    </div>
  );
};

export default Index;
