
import { useState, useCallback } from 'react';

export const useEmployeeFormState = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDraft, setIsDraft] = useState(false);

  const scrollToSection = useCallback((sectionId: string) => {
    console.log('🧭 Scrolling to section:', sectionId);
    setActiveSection(sectionId);
    
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      // Calculate offset for fixed header (adjust this value based on your header height)
      const headerOffset = 80; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      // Find the scrollable container (the main content area)
      const scrollContainer = element.closest('.overflow-y-auto');
      
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: element.offsetTop - headerOffset,
          behavior: 'smooth'
        });
      } else {
        // Fallback to window scroll
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
      
      console.log('✅ Successfully scrolled to section:', sectionId);
    } else {
      console.warn('⚠️ Section element not found:', `section-${sectionId}`);
    }
  }, []);

  return {
    companyId,
    setCompanyId,
    activeSection,
    setActiveSection,
    completionPercentage,
    setCompletionPercentage,
    isDraft,
    setIsDraft,
    scrollToSection
  };
};
