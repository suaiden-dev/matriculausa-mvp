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
    const loadUniversityLogos = async () => {
      try {
        setLoading(true);
        
        // Inicializar o array com os nomes das universidades
        const universitiesWithLogos: University[] = UNIVERSITIES.map(name => ({
          name,
          logoUrl: null,
          isLoading: true
        }));

        setUniversities(universitiesWithLogos);

        // Carregar logos para cada universidade
        const logoPromises = UNIVERSITIES.map(async (universityName, index) => {
          try {
            // Converter nome para formato de arquivo (substituir espaços por hífens e converter para lowercase)
            const fileName = universityName.toLowerCase().replace(/\s+/g, '-');
            
            // Tentar diferentes extensões de arquivo
            const extensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
            let logoUrl = null;

            for (const ext of extensions) {
              const filePath = `${fileName}.${ext}`;
              
              // Obter URL pública do arquivo
              const { data } = supabase.storage
                .from('universities-logo')
                .getPublicUrl(filePath);

              if (data?.publicUrl) {
                // Verificar se a URL é realmente acessível
                try {
                  const response = await fetch(data.publicUrl, { method: 'HEAD' });
                  if (response.ok) {
                    logoUrl = data.publicUrl;
                    break;
                  }
                } catch {
                  // Continue para próxima extensão
                  continue;
                }
              }
            }

            // Atualizar o estado para esta universidade específica
            setUniversities(prev => 
              prev.map((uni, idx) => 
                idx === index 
                  ? { ...uni, logoUrl, isLoading: false }
                  : uni
              )
            );

            return { universityName, logoUrl };
          } catch (err) {
            console.error(`Error loading logo for ${universityName}:`, err);
            
            // Atualizar o estado mesmo em caso de erro
            setUniversities(prev => 
              prev.map((uni, idx) => 
                idx === index 
                  ? { ...uni, logoUrl: null, isLoading: false }
                  : uni
              )
            );
            
            return { universityName, logoUrl: null };
          }
        });

        // Aguardar todas as promessas
        await Promise.all(logoPromises);
        
      } catch (err) {
        console.error('Error loading university logos:', err);
        setError('Failed to load university logos');
        
        // Em caso de erro geral, marcar todas como não carregando
        setUniversities(prev => 
          prev.map(uni => ({ ...uni, isLoading: false }))
        );
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
