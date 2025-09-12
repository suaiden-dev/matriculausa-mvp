import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ScholarshipPackage, UserPackageFees } from '../types';

export const useScholarshipPackages = () => {
  const [packages, setPackages] = useState<ScholarshipPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scholarship_packages')
        .select('*')
        .eq('is_active', true)
        .order('package_number');

      if (fetchError) {
        throw fetchError;
      }

      setPackages(data || []);
    } catch (err: any) {
      console.error('❌ [useScholarshipPackages] Erro ao carregar pacotes:', err);
      setError('Erro ao carregar pacotes de bolsas');
    } finally {
      setLoading(false);
    }
  };

  const getPackageByNumber = (packageNumber: number): ScholarshipPackage | null => {
    return packages.find(pkg => pkg.package_number === packageNumber) || null;
  };

  const getUserPackageFees = async (userId: string): Promise<UserPackageFees | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_package_fees', {
          user_id_param: userId
        });

      if (error) {
        console.error('❌ [useScholarshipPackages] Erro ao buscar taxas do usuário:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err: any) {
      console.error('❌ [useScholarshipPackages] Erro inesperado ao buscar taxas:', err);
      return null;
    }
  };

  const assignPackageToUser = async (userId: string, packageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ scholarship_package_id: packageId })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ [useScholarshipPackages] Erro ao atribuir pacote ao usuário:', error);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('❌ [useScholarshipPackages] Erro inesperado ao atribuir pacote:', err);
      return false;
    }
  };

  return {
    packages,
    loading,
    error,
    loadPackages,
    getPackageByNumber,
    getUserPackageFees,
    assignPackageToUser
  };
};
