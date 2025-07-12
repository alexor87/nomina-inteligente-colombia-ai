
import { useState } from 'react';

export const useEmployeeFormState = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDraft, setIsDraft] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      // Find the scrollable container (the form content area)
      const scrollContainer = element.closest('.overflow-y-auto') || window;
      
      if (scrollContainer === window) {
        // Default window scroll behavior
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Custom scroll for container with offset for better positioning
        const containerRect = (scrollContainer as Element).getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const offset = 80; // Offset for better visual positioning
        
        const scrollTop = elementRect.top - containerRect.top + (scrollContainer as Element).scrollTop - offset;
        
        (scrollContainer as Element).scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    }
  };

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
