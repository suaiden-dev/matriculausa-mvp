import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Building, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface University {
  id: string;
  name: string;
  location: string;
  logo_url: string;
  is_approved: boolean;
  is_featured: boolean;
  featured_order: number | null;
}

const FeaturedUniversitiesManagement: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar universidades
  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, location, logo_url, is_approved, is_featured, featured_order')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Erro ao carregar universidades:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar universidades' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar universidades
  const filteredUniversities = universities.filter(university => {
    const matchesSearch = university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         university.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'featured' && university.is_featured) ||
      (statusFilter === 'not-featured' && !university.is_featured);
    
    return matchesSearch && matchesStatus;
  });

  // Marcar/desmarcar como destaque
  const toggleFeatured = async (universityId: string, currentFeatured: boolean) => {
    try {
      if (currentFeatured) {
        // Desmarcar como destaque
        const { error } = await supabase
          .from('universities')
          .update({ 
            is_featured: false, 
            featured_order: null 
          })
          .eq('id', universityId);

        if (error) throw error;
      } else {
        // Verificar se já temos 6 universidades em destaque
        const featuredCount = universities.filter(u => u.is_featured).length;
        if (featuredCount >= 6) {
          setMessage({ 
            type: 'error', 
            text: 'Máximo de 6 universidades em destaque atingido. Desmarque uma antes de adicionar outra.' 
          });
          return;
        }

        // Marcar como destaque e definir ordem
        const nextOrder = featuredCount + 1;
        const { error } = await supabase
          .from('universities')
          .update({ 
            is_featured: true, 
            featured_order: nextOrder 
          })
          .eq('id', universityId);

        if (error) throw error;
      }

      // Recarregar dados
      await fetchUniversities();
      setMessage({ 
        type: 'success', 
        text: currentFeatured ? 'Universidade removida dos destaques' : 'Universidade adicionada aos destaques' 
      });
    } catch (error) {
      console.error('Erro ao alterar destaque:', error);
      setMessage({ type: 'error', text: 'Erro ao alterar destaque' });
    }
  };

  // Alterar ordem de destaque
  const changeFeaturedOrder = async (universityId: string, newOrder: number) => {
    try {
      setSaving(true);
      
      // Validar nova ordem
      if (newOrder < 1 || newOrder > 6) return;

      // Atualizar ordem
      const { error } = await supabase
        .from('universities')
        .update({ featured_order: newOrder })
        .eq('id', universityId);

      if (error) throw error;

      // Recarregar dados
      await fetchUniversities();
      setMessage({ type: 'success', text: 'Ordem atualizada com sucesso' });
    } catch (error) {
      console.error('Erro ao alterar ordem:', error);
      setMessage({ type: 'error', text: 'Erro ao alterar ordem' });
    } finally {
      setSaving(false);
    }
  };

  // Obter universidades em destaque ordenadas
  const featuredUniversities = universities
    .filter(u => u.is_featured)
    .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));

  // Obter universidades não destacadas
  const nonFeaturedUniversities = universities.filter(u => !u.is_featured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Universidades em Destaque</h1>
          <p className="text-slate-600 mt-2">
            Gerencie quais universidades aparecem em destaque na landing page e outras páginas
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
            <span className="font-semibold">{featuredUniversities.length}/6</span> em destaque
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar universidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Filtrar por status"
          title="Filtrar por status"
        >
          <option value="all">Todas as universidades</option>
          <option value="featured">Em destaque</option>
          <option value="not-featured">Não destacadas</option>
        </select>
      </div>

      {/* Universidades em Destaque */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
          <Star className="h-5 w-5 text-yellow-500 mr-2" />
          Universidades em Destaque ({featuredUniversities.length}/6)
        </h2>
        
        {featuredUniversities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Star className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma universidade em destaque</p>
            <p className="text-sm">Marque universidades como destaque para que apareçam na landing page</p>
          </div>
        ) : (
          <div className="space-y-3">
            {featuredUniversities.map((university) => (
              <div key={university.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                    {university.logo_url ? (
                      <img src={university.logo_url} alt={university.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <Building className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{university.name}</h3>
                    <p className="text-sm text-slate-600">{university.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Controles de ordem */}
                  <div className="flex items-center space-x-1">
                                         <button
                       onClick={() => changeFeaturedOrder(university.id, (university.featured_order || 1) - 1)}
                       disabled={university.featured_order === 1 || saving}
                       className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                       title="Mover para cima"
                       aria-label="Mover para cima"
                     >
                       <ArrowUp className="h-4 w-4" />
                     </button>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium min-w-[2rem] text-center">
                      {university.featured_order}
                    </span>
                                         <button
                       onClick={() => changeFeaturedOrder(university.id, (university.featured_order || 1) + 1)}
                       disabled={university.featured_order === 6 || saving}
                       className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                       title="Mover para baixo"
                       aria-label="Mover para baixo"
                     >
                       <ArrowDown className="h-4 w-4" />
                     </button>
                  </div>
                  
                  {/* Botão para remover destaque */}
                  <button
                    onClick={() => toggleFeatured(university.id, true)}
                    disabled={saving}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover dos destaques"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Universidades Disponíveis */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Universidades Disponíveis para Destaque
        </h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-500">Carregando universidades...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nonFeaturedUniversities.map((university) => (
              <div key={university.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                    {university.logo_url ? (
                      <img src={university.logo_url} alt={university.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <Building className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{university.name}</h3>
                    <p className="text-sm text-slate-600 truncate">{university.location}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFeatured(university.id, false)}
                  disabled={saving || featuredUniversities.length >= 6}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar ao Destaque</span>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {nonFeaturedUniversities.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">
            <p>Todas as universidades já estão em destaque ou não há universidades disponíveis</p>
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Informações Importantes
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Apenas universidades aprovadas podem ser marcadas como destaque</li>
          <li>• Máximo de 6 universidades podem estar em destaque simultaneamente</li>
          <li>• As universidades em destaque aparecem na landing page e outras páginas</li>
          <li>• A ordem de destaque (1-6) determina a posição de exibição</li>
        </ul>
      </div>
    </div>
  );
};

export default FeaturedUniversitiesManagement;
