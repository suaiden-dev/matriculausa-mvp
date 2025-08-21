import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Carregar favoritos do usuário
  const loadFavorites = useCallback(async () => {
    if (!user) {
      console.log('❌ [useFavorites] loadFavorites: Usuário não autenticado');
      return;
    }

    console.log('🎯 [useFavorites] loadFavorites: Carregando favoritos para user_id:', user.id);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scholarship_favorites')
        .select('scholarship_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [useFavorites] loadFavorites: Erro do Supabase:', error);
        return;
      }

      console.log('✅ [useFavorites] loadFavorites: Dados retornados:', data);
      const favoriteIds = new Set(data?.map(fav => fav.scholarship_id) || []);
      console.log('✅ [useFavorites] loadFavorites: Favoritos processados:', Array.from(favoriteIds));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('❌ [useFavorites] loadFavorites: Erro geral:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Adicionar aos favoritos
  const addToFavorites = useCallback(async (scholarshipId: string) => {
    if (!user) {
      console.log('❌ [useFavorites] addToFavorites: Usuário não autenticado');
      return false;
    }

    console.log('🎯 [useFavorites] addToFavorites: Inserindo na tabela scholarship_favorites');
    console.log('🎯 [useFavorites] addToFavorites: user_id:', user.id, 'scholarship_id:', scholarshipId);

    try {
      const { data, error } = await supabase
        .from('scholarship_favorites')
        .insert({
          user_id: user.id,
          scholarship_id: scholarshipId
        });

      if (error) {
        console.error('❌ [useFavorites] addToFavorites: Erro do Supabase:', error);
        return false;
      }

      console.log('✅ [useFavorites] addToFavorites: Sucesso! Data retornada:', data);
      setFavorites(prev => new Set([...prev, scholarshipId]));
      return true;
    } catch (error) {
      console.error('❌ [useFavorites] addToFavorites: Erro geral:', error);
      return false;
    }
  }, [user]);

  // Remover dos favoritos
  const removeFromFavorites = useCallback(async (scholarshipId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('scholarship_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('scholarship_id', scholarshipId);

      if (error) {
        console.error('Error removing from favorites:', error);
        return false;
      }

      setFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(scholarshipId);
        return newSet;
      });
      return true;
    } catch (error) {
      console.error('Error in removeFromFavorites:', error);
      return false;
    }
  }, [user]);

  // Alternar favorito
  const toggleFavorite = useCallback(async (scholarshipId: string) => {
    console.log('🎯 [useFavorites] toggleFavorite chamado para scholarshipId:', scholarshipId);
    console.log('🎯 [useFavorites] favorites atual:', Array.from(favorites));
    console.log('🎯 [useFavorites] user:', user?.id);
    
    if (favorites.has(scholarshipId)) {
      console.log('🎯 [useFavorites] Removendo dos favoritos...');
      return await removeFromFavorites(scholarshipId);
    } else {
      console.log('🎯 [useFavorites] Adicionando aos favoritos...');
      return await addToFavorites(scholarshipId);
    }
  }, [favorites, addToFavorites, removeFromFavorites]);

  // Verificar se uma bolsa está nos favoritos
  const isFavorite = useCallback((scholarshipId: string) => {
    return favorites.has(scholarshipId);
  }, [favorites]);

  // Carregar favoritos quando o usuário mudar
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    loadFavorites
  };
};
