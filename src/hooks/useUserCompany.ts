import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Singleton cache for company_id to avoid multiple DB queries
let cachedCompanyId: string | null = null;
let cachePromise: Promise<string | null> | null = null;

export const useUserCompany = () => {
  const [companyId, setCompanyId] = useState<string | null>(cachedCompanyId);
  const [loading, setLoading] = useState(!cachedCompanyId);

  useEffect(() => {
    const getUserCompany = async () => {
      // Return cached value if available
      if (cachedCompanyId) {
        setCompanyId(cachedCompanyId);
        setLoading(false);
        return;
      }

      // Avoid multiple concurrent requests
      if (cachePromise) {
        const result = await cachePromise;
        setCompanyId(result);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Create promise to prevent duplicate requests
        cachePromise = (async () => {
          const { data, error } = await supabase.rpc('get_current_user_company_id');
          
          if (error) {
            console.error('Error getting current user company:', error);
            return null;
          }
          
          // Cache the result
          cachedCompanyId = data;
          return data;
        })();

        const result = await cachePromise;
        setCompanyId(result);
      } catch (error) {
        console.error('Error in getUserCompany:', error);
      } finally {
        setLoading(false);
        cachePromise = null; // Reset promise after completion
      }
    };

    getUserCompany();
  }, []);

  // Method to invalidate cache (useful for auth changes)
  const invalidateCache = () => {
    cachedCompanyId = null;
    cachePromise = null;
  };

  return { companyId, loading, invalidateCache };
};