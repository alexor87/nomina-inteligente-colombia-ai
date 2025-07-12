
import { useState } from 'react';

export const useEmployeeFormState = () => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isDraft, setIsDraft] = useState(false);

  const scrollToSection = (sectionId: string) => {
    console.log('🔍 Scrolling to section:', sectionId);
    setActiveSection(sectionId);
    
    const element = document.getElementById(`section-${sectionId}`);
    console.log('📍 Found element:', element);
    
    if (element) {
      // Buscar el contenedor de scroll más cercano
      const scrollContainer = element.closest('.overflow-y-auto');
      console.log('📦 Found scroll container:', scrollContainer);
      
      if (scrollContainer) {
        // Usar scrollIntoView directamente en el elemento
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        
        // Ajuste adicional para compensar cualquier header
        setTimeout(() => {
          const elementRect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const currentScrollTop = scrollContainer.scrollTop;
          const elementTop = elementRect.top - containerRect.top + currentScrollTop;
          const offset = 20; // Pequeño offset para mejor visualización
          
          scrollContainer.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        }, 100);
      } else {
        // Fallback a scroll normal de la ventana
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      console.error('❌ Element not found:', `section-${sectionId}`);
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
