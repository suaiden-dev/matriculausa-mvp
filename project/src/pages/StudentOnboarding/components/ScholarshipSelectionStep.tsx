import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award, Loader2, Building, DollarSign, X, AlertCircle, CheckCircle2, ArrowRight, Info, Search, GraduationCap, BookOpen, Monitor, Briefcase, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useCartStore } from '../../../stores/applicationStore';
import { useScholarships } from '../../../hooks/useScholarships';
import { usePackageScholarshipFilter } from '../../../hooks/usePackageScholarshipFilter';
import { StepProps } from '../types';
import { ScholarshipCardFull } from './ScholarshipCardFull';

export const ScholarshipSelectionStep: React.FC<StepProps> = ({ onNext }) => {
  const { user, userProfile } = useAuth();
  const { cart, addToCart, removeFromCart, fetchCart } = useCartStore();
  const { scholarships: allScholarships, loading: scholarshipsLoading, error: scholarshipsError } = useScholarships();
  const { minScholarshipValue, loading: packageFilterLoading } = usePackageScholarshipFilter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>('all');
  const [selectedWorkPermission, setSelectedWorkPermission] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [deadlineDays, setDeadlineDays] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);

  const ITEMS_PER_PAGE = 12;

  // Obter faixa de bolsa desejada do perfil do usuário
  const desiredScholarshipRange = (userProfile as any)?.desired_scholarship_range ?? null;

  useEffect(() => {
    if (user?.id) {
      fetchCart(user.id);
    }
  }, [user?.id, fetchCart]);

  useEffect(() => {
    // Sincronizar selectedIds com cart
    const cartIds = new Set(cart.map(item => item.scholarships.id));
    setSelectedIds(cartIds);
  }, [cart]);

  // Extrair opções únicas das bolsas para os filtros
  const {
    uniqueLevels,
    uniqueFields,
    uniqueDeliveryModes,
    uniqueWorkPermissions,
    uniqueUniversities
  } = useMemo(() => {
    const levelSet = new Set<string>();
    const fieldSet = new Set<string>();
    const deliverySet = new Set<string>();
    const workPermSet = new Set<string>();
    const universitiesMap = new Map();

    allScholarships?.forEach((scholarship: any) => {
      // Levels
      if (scholarship.level && typeof scholarship.level === 'string') {
        levelSet.add(scholarship.level);
      }
      // Fields
      if (scholarship.field_of_study && typeof scholarship.field_of_study === 'string') {
        fieldSet.add(scholarship.field_of_study);
      }
      // Delivery Modes
      if (scholarship.delivery_mode && typeof scholarship.delivery_mode === 'string') {
        deliverySet.add(scholarship.delivery_mode);
      }
      // Work Permissions (excluir F1)
      if (Array.isArray(scholarship.work_permissions)) {
        scholarship.work_permissions.forEach((wp: any) => {
          if (typeof wp === 'string' && wp.trim() !== '' && wp.trim().toUpperCase() !== 'F1') {
            workPermSet.add(wp);
          }
        });
      }
      // Universities
      if (scholarship.universities?.id && scholarship.universities?.is_approved) {
        universitiesMap.set(scholarship.universities.id, {
          id: scholarship.universities.id,
          name: scholarship.universities.name
        });
      }
    });

    return {
      uniqueLevels: Array.from(levelSet).sort(),
      uniqueFields: Array.from(fieldSet).sort(),
      uniqueDeliveryModes: Array.from(deliverySet).sort(),
      uniqueWorkPermissions: Array.from(workPermSet).sort(),
      uniqueUniversities: Array.from(universitiesMap.values()).sort((a, b) => 
        String(a.name).localeCompare(String(b.name))
      )
    };
  }, [allScholarships]);

  // Função para calcular dias até o deadline
  const getDaysUntilDeadline = useCallback((deadline: string) => {
    if (!deadline) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    deadlineDate.setHours(23, 59, 59, 999);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Função para obter label do delivery mode
  const getDeliveryModeLabel = useCallback((mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In Person';
      case 'hybrid':
        return 'Hybrid';
      default:
        return mode || 'Mixed';
    }
  }, []);

  // Filtrar bolsas com todos os filtros
  const filteredScholarships = useMemo(() => {
    if (!allScholarships || allScholarships.length === 0) {
      return [];
    }

    // Busca por múltiplas palavras-chave
    const searchWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return allScholarships.filter((scholarship: any) => {
      // 1. Filtrar apenas universidades aprovadas
      if (!scholarship.universities?.is_approved) {
        return false;
      }

      // 2. Filtro de busca
      if (searchWords.length > 0) {
        const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
        const matchesSearch = searchWords.every(word => text.includes(word));
        if (!matchesSearch) return false;
      }

      // 3. Filtro de nível acadêmico
      if (selectedLevel !== 'all') {
        if (!scholarship.level || scholarship.level.toLowerCase() !== selectedLevel.toLowerCase()) {
          return false;
        }
      }

      // 4. Filtro de área de estudo
      if (selectedField !== 'all') {
        if (!scholarship.field_of_study || 
            scholarship.field_of_study.toLowerCase() !== selectedField.toLowerCase()) {
          return false;
        }
      }

      // 5. Filtro de modalidade de estudo
      if (selectedDeliveryMode !== 'all') {
        if (!scholarship.delivery_mode || 
            scholarship.delivery_mode.toLowerCase() !== selectedDeliveryMode.toLowerCase()) {
          return false;
        }
      }

      // 6. Filtro de autorização de trabalho
      if (selectedWorkPermission !== 'all') {
        if (!scholarship.work_permissions || 
            !Array.isArray(scholarship.work_permissions) ||
            !scholarship.work_permissions.some((perm: any) => 
              perm && typeof perm === 'string' && perm.toLowerCase() === selectedWorkPermission.toLowerCase()
            )) {
          return false;
        }
      }

      // 7. Filtro por universidade selecionada
      if (selectedUniversity !== 'all') {
        const universityId = scholarship.universities?.id ?? scholarship.university_id ?? null;
        if (String(universityId) !== String(selectedUniversity)) {
          return false;
        }
      }

      // 8. Filtro automático baseado na faixa de bolsa desejada ou pacote do usuário
      const scholarshipValue = scholarship.annual_value_with_scholarship ?? scholarship.amount ?? 0;
      
      if (desiredScholarshipRange !== null && desiredScholarshipRange !== undefined) {
        if (scholarshipValue < desiredScholarshipRange) {
          return false;
        }
      } else if (minScholarshipValue !== null && minScholarshipValue !== undefined) {
        if (scholarshipValue < minScholarshipValue) {
          return false;
        }
      }

      // 9. Filtro por valor mínimo
      if (minValue && minValue !== '') {
        const minValueNum = Number(minValue);
        if (!isNaN(minValueNum) && scholarshipValue < minValueNum) {
          return false;
        }
      }

      // 10. Filtro por valor máximo
      if (maxValue && maxValue !== '') {
        const maxValueNum = Number(maxValue);
        if (!isNaN(maxValueNum) && scholarshipValue > maxValueNum) {
          return false;
        }
      }

      // 11. Filtro de deadline
      if (deadlineDays && deadlineDays !== '') {
        const deadlineDaysNum = Number(deadlineDays);
        if (!isNaN(deadlineDaysNum) && scholarship.deadline) {
          const daysLeft = getDaysUntilDeadline(scholarship.deadline);
          if (daysLeft < deadlineDaysNum) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    allScholarships, 
    searchTerm,
    selectedLevel,
    selectedField,
    selectedDeliveryMode,
    selectedWorkPermission,
    selectedUniversity,
    minValue,
    maxValue,
    deadlineDays,
    desiredScholarshipRange,
    minScholarshipValue,
    getDaysUntilDeadline
  ]);

  // Separar bolsas em destaque e ordenar
  const sortedScholarships = useMemo(() => {
    if (!filteredScholarships || filteredScholarships.length === 0) {
      return [];
    }

    // Separar bolsas em destaque das demais (usando is_highlighted, igual ao ScholarshipBrowser)
    const featured: any[] = [];
    const regular: any[] = [];

    filteredScholarships.forEach((scholarship: any) => {
      if (scholarship.is_highlighted) {
        featured.push(scholarship);
      } else {
        regular.push(scholarship);
      }
    });

    // Ordenar bolsas em destaque por featured_order
    featured.sort((a, b) => {
      const orderA = a.featured_order ?? 999;
      const orderB = b.featured_order ?? 999;
      return orderA - orderB;
    });

    // Combinar: featured primeiro (máximo 6, igual ao ScholarshipBrowser), depois as regulares
    return [...featured.slice(0, 6), ...regular];
  }, [filteredScholarships]);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUniversity, minValue, maxValue, searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, deadlineDays]);

  // Paginação
  const totalPages = Math.ceil(sortedScholarships.length / ITEMS_PER_PAGE);
  const paginatedScholarships = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedScholarships.slice(startIndex, endIndex);
  }, [sortedScholarships, currentPage]);

  const hasActiveFilters = 
    searchTerm !== '' ||
    selectedLevel !== 'all' ||
    selectedField !== 'all' ||
    selectedDeliveryMode !== 'all' ||
    selectedWorkPermission !== 'all' ||
    selectedUniversity !== 'all' ||
    minValue !== '' ||
    maxValue !== '' ||
    deadlineDays !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLevel('all');
    setSelectedField('all');
    setSelectedDeliveryMode('all');
    setSelectedWorkPermission('all');
    setSelectedUniversity('all');
    setMinValue('');
    setMaxValue('');
    setDeadlineDays('');
  };

  const loading = scholarshipsLoading || packageFilterLoading;
  const displayError = error || (scholarshipsError ? 'Erro ao carregar bolsas. Tente novamente.' : null);

  const toggleSelection = useCallback(async (scholarship: any) => {
    if (!user?.id) return;

    const isSelected = selectedIds.has(scholarship.id);

    try {
      if (isSelected) {
        await removeFromCart(scholarship.id, user.id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(scholarship.id);
          return next;
        });
      } else {
        await addToCart(scholarship, user.id);
        setSelectedIds(prev => new Set(prev).add(scholarship.id));
      }
    } catch (err) {
      console.error('Error toggling scholarship:', err);
      setError('Erro ao atualizar seleção. Tente novamente.');
    }
  }, [user?.id, selectedIds, addToCart, removeFromCart]);

  const handleContinue = () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one scholarship to continue. Click on the scholarship cards above to add them to your selection.');
      return;
    }
    setError(null);
    onNext();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 sm:p-6 border border-blue-100">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose Your Scholarships</h2>
            <p className="text-base sm:text-lg text-gray-700 font-medium">Click on the scholarship cards below to select them. You need at least one to proceed.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      {/* Header Section with Clear Instructions */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 sm:p-6 border border-blue-100">
        <div className="text-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Choose Your Scholarships
          </h2>
          <p className="text-base sm:text-lg text-gray-700 font-medium mb-4">
            Click on the scholarship cards below to select them. You need at least one to proceed.
          </p>
        </div>

        {/* Instructions Box */}
        <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                Quick guide:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Click any scholarship card</strong> to add it to your selection</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Select as many as you want</strong> - you can choose multiple options</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Use filters</strong> to search by university or scholarship value</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Click "Continue"</strong> once you've selected at least one scholarship</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {displayError && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">{displayError}</p>
        </div>
      )}

      {/* Advanced Filters - Collapsible */}
      <div className="bg-white rounded-lg border-2 border-slate-300 shadow-sm">
        {/* Filter Header - Always Visible */}
        <div 
          className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Filter Scholarships
            </h3>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear all filters"
              >
                <X className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
            {filtersExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </div>

        {/* Filter Content - Collapsible */}
        {filtersExpanded && (
          <div className="px-4 pb-4 border-t border-slate-200">
            {/* Search */}
            <div className="mb-4 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, description, or university..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
                />
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Level Filter */}
          <div>
            <label htmlFor="level-filter" className="block text-xs font-medium text-slate-700 mb-1.5">
              <GraduationCap className="h-3 w-3 inline mr-1" />
              Academic Level
            </label>
            <select
              id="level-filter"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">All Levels</option>
              {uniqueLevels.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          {/* Field Filter */}
          <div>
            <label htmlFor="field-filter" className="block text-xs font-medium text-slate-700 mb-1.5">
              <BookOpen className="h-3 w-3 inline mr-1" />
              Field of Study
            </label>
            <select
              id="field-filter"
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">All Fields</option>
              {uniqueFields.map((fld) => (
                <option key={fld} value={fld}>{fld}</option>
              ))}
            </select>
          </div>

          {/* Delivery Mode Filter */}
          <div>
            <label htmlFor="delivery-mode-filter" className="block text-xs font-medium text-slate-700 mb-1.5">
              <Monitor className="h-3 w-3 inline mr-1" />
              Study Mode
            </label>
            <select
              id="delivery-mode-filter"
              value={selectedDeliveryMode}
              onChange={(e) => setSelectedDeliveryMode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">All Modes</option>
              {uniqueDeliveryModes.map((dm) => (
                <option key={dm} value={dm}>{getDeliveryModeLabel(dm)}</option>
              ))}
            </select>
          </div>

          {/* Work Permission Filter */}
          <div>
            <label htmlFor="work-permission-filter" className="block text-xs font-medium text-slate-700 mb-1.5">
              <Briefcase className="h-3 w-3 inline mr-1" />
              Work Authorization
            </label>
            <select
              id="work-permission-filter"
              value={selectedWorkPermission}
              onChange={(e) => setSelectedWorkPermission(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">All Permissions</option>
              {uniqueWorkPermissions.map((wp) => (
                <option key={wp} value={wp}>{wp}</option>
              ))}
            </select>
          </div>

          {/* University Filter */}
          <div>
            <label htmlFor="university-filter" className="block text-xs font-medium text-slate-700 mb-1.5">
              <Building className="h-3 w-3 inline mr-1" />
              University
            </label>
            <select
              id="university-filter"
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            >
              <option value="all">All Universities</option>
              {uniqueUniversities.map((u) => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Min Value Filter */}
          <div>
            <label htmlFor="min-value" className="block text-xs font-medium text-slate-700 mb-1.5">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Min Value
            </label>
            <input
              id="min-value"
              type="number"
              placeholder="Min"
              value={minValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (Number(value) >= 0)) {
                  setMinValue(value);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            />
          </div>

          {/* Max Value Filter */}
          <div>
            <label htmlFor="max-value" className="block text-xs font-medium text-slate-700 mb-1.5">
              <DollarSign className="h-3 w-3 inline mr-1" />
              Max Value
            </label>
            <input
              id="max-value"
              type="number"
              placeholder="Max"
              value={maxValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (Number(value) >= 0)) {
                  setMaxValue(value);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            />
          </div>

          {/* Deadline Filter */}
          <div>
            <label htmlFor="deadline-days" className="block text-xs font-medium text-slate-700 mb-1.5">
              <Calendar className="h-3 w-3 inline mr-1" />
              Deadline (days)
            </label>
            <input
              id="deadline-days"
              type="number"
              placeholder="Min days left"
              value={deadlineDays}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (Number(value) >= 0)) {
                  setDeadlineDays(value);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm"
            />
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Scholarships Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Scholarships
            {sortedScholarships.length > 0 && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({sortedScholarships.length} {sortedScholarships.length === 1 ? 'option' : 'options'})
              </span>
            )}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedScholarships.map((scholarship) => (
          <ScholarshipCardFull
            key={scholarship.id}
            scholarship={scholarship}
            isSelected={selectedIds.has(scholarship.id)}
            onToggle={() => toggleSelection(scholarship)}
            userProfile={userProfile}
          />
        ))}
        </div>
      </div>

      {sortedScholarships.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No scholarships found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters to see more options.</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg font-medium transition-all bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg font-medium transition-all bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Fixed Continue Button - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-300 shadow-xl z-50 p-4 sm:hidden">
        <button
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2 disabled:bg-gray-400"
        >
          <span>Continue ({selectedIds.size} selected)</span>
          {selectedIds.size > 0 && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Continue Button - Desktop */}
      <div className="hidden sm:block pt-4 border-t-2 border-slate-300">
        <button
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-lg hover:bg-blue-700 transition-all font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center space-x-2 disabled:bg-gray-400"
        >
          <span>Continue ({selectedIds.size} selected)</span>
          {selectedIds.size > 0 && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

