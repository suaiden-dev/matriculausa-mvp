import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface University {
  name: string;
  logoUrl: string | null;
  isLoading: boolean;
}

const UNIVERSITIES = [
  'Adelphi University',
  'Anderson University', 
  'Campbellsville University',
  'Cumberland University',
  'Faulkner University',
  'Golden Gate University',
  'Marshall University',
  'Baptist University of Florida',
  'Murray State University',
  'Purdue University Northwest',
  'University of Louisville',
  'University of the Cumberlands',
  'Wayland Baptist University',
  'Wittenberg University',
  'Central Michigan University'
];

export const useUniversityLogos = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUniversityLogos = () => {
      try {
        setLoading(true);
        
        // Mapeamento manual de extensões para casos que não são .png
        // De acordo com o conteúdo real do storage
        const JPG_UNIVERSITIES = [
          'golden-gate-university',
          'central-michigan-university',
          'purdue-university-northwest',
          'wittenberg-university'
        ];

        const universitiesWithLogos: University[] = UNIVERSITIES.map(name => {
          const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
          const ext = JPG_UNIVERSITIES.includes(normalizedName) ? 'jpg' : 'png';
          const filePath = `${normalizedName}.${ext}`;
          
          const { data } = supabase.storage
            .from('universities-logo')
            .getPublicUrl(filePath);
          
          return {
            name,
            logoUrl: data?.publicUrl || null,
            isLoading: false
          };
        });

        setUniversities(universitiesWithLogos);
      } catch (err) {
        console.error('Error loading university logos:', err);
        setError('Failed to load university logos');
      } finally {
        setLoading(false);
      }
    };

    loadUniversityLogos();
  }, []);

  return {
    universities,
    loading,
    error,
    totalUniversities: UNIVERSITIES.length,
    loadedLogos: universities.filter(uni => uni.logoUrl !== null).length
  };
};
