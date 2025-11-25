import { StoredUtmAttribution, UTM_PARAM_KEYS, UtmParamKey } from '../types/utm';

// Chave única no localStorage (prefixo do projeto)
const STORAGE_KEY = 'matriculausa:utm-attribution';

// TTL (Time To Live) em milissegundos: 60 dias
const TTL_MS = 1000 * 60 * 60 * 24 * 60;
// Breakdown:
// 1000 = 1 segundo (em ms)
// * 60 = 1 minuto
// * 60 = 1 hora
// * 24 = 1 dia
// * 60 = 60 dias

// Verifica se está rodando no browser (SSR safety)
const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Obtém o caminho atual completo (pathname + query string)
const getCurrentPath = () => {
  if (!isBrowser()) return '';
  return `${window.location.pathname}${window.location.search}`;
  // Exemplo: "/register?ref=ABC123" ou "/dashboard"
};

/**
 * Decide se deve sobrescrever dados UTM existentes
 * 
 * Regras:
 * - Se não existe → sobrescrever (true)
 * - Se existe mas expirou (>60 dias) → sobrescrever (true)
 * - Se existe e ainda é válido → manter (false)
 * 
 * @param existing - Dados UTM existentes no localStorage
 * @returns true se deve sobrescrever, false se deve manter
 */
const shouldOverrideExisting = (existing: StoredUtmAttribution | null): boolean => {
  // Se não existe, criar novo
  if (!existing) return true;
  
  // Converte capturedAt para timestamp (milissegundos desde 1970)
  const capturedAt = new Date(existing.capturedAt).getTime();
  
  // Se a data é inválida (NaN) ou expirou, sobrescrever
  return Number.isNaN(capturedAt) || Date.now() - capturedAt > TTL_MS;
};

/**
 * Remove espaços em branco e normaliza valores
 * 
 * @param value - Valor a ser sanitizado
 * @returns string sem espaços ou undefined se vazio/null
 */
const sanitizeValue = (value: string | undefined | null): string | undefined => {
  // Se não existe, retorna undefined
  if (!value) return undefined;
  
  // Remove espaços no início e fim
  const trimmed = value.trim();
  
  // Se ficou vazio após trim, retorna undefined
  return trimmed || undefined;
};

/**
 * Normaliza todos os campos do payload UTM
 * Remove espaços, converte null/empty para undefined
 * 
 * @param payload - Payload UTM a ser normalizado
 * @returns Payload normalizado
 */
const normalizePayload = (payload: StoredUtmAttribution): StoredUtmAttribution => ({
  ...payload, // Mantém todos os campos originais
  // Sanitiza cada campo UTM
  utm_source: sanitizeValue(payload.utm_source),
  utm_medium: sanitizeValue(payload.utm_medium),
  utm_campaign: sanitizeValue(payload.utm_campaign),
  utm_term: sanitizeValue(payload.utm_term),
  utm_content: sanitizeValue(payload.utm_content),
  // Sanitiza campos de navegação
  landing_page: sanitizeValue(payload.landing_page),
  last_touch_page: sanitizeValue(payload.last_touch_page),
  referrer: sanitizeValue(payload.referrer),
  // capturedAt não precisa sanitizar (já é ISO string)
});

/**
 * Extrai parâmetros UTM da URL
 * 
 * @param params - URLSearchParams da URL atual
 * @returns Objeto com UTMs encontrados e flag indicando se há valores
 */
const buildUtmRecord = (params: URLSearchParams): {
  utmRecord: Partial<Record<UtmParamKey, string>>;
  hasValue: boolean;
} => {
  const utmRecord: Partial<Record<UtmParamKey, string>> = {};
  let hasValue = false;

  // Itera sobre cada parâmetro UTM válido
  UTM_PARAM_KEYS.forEach((key) => {
    const value = params.get(key); // Obtém valor da URL
    
    if (value) {
      utmRecord[key] = value; // Armazena no objeto
      hasValue = true; // Marca que encontrou pelo menos um UTM
    }
  });

  return { utmRecord, hasValue };
};

/**
 * Lê dados UTM armazenados no localStorage
 * Valida TTL e remove se expirado
 * 
 * @returns Dados UTM ou null se não existir/expirado
 */
export const getStoredUtmParams = (): StoredUtmAttribution | null => {
  // Verifica se está no browser
  if (!isBrowser()) return null;
  
  try {
    // Tenta ler do localStorage
    const stored = window.localStorage.getItem(STORAGE_KEY);
    
    // Se não existe, retorna null
    if (!stored) return null;
    
    // Parse do JSON
    const parsed = JSON.parse(stored) as StoredUtmAttribution;
    
    // Valida se tem capturedAt (obrigatório)
    if (!parsed?.capturedAt) return null;
    
    // Converte para timestamp
    const capturedAt = new Date(parsed.capturedAt).getTime();
    
    // Se inválido ou expirado, remove e retorna null
    if (Number.isNaN(capturedAt) || Date.now() - capturedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Retorna dados normalizados
    return normalizePayload(parsed);
    
  } catch (error) {
    // Se houver erro (JSON inválido, etc), loga e retorna null
    console.warn('[utmTracker] Falha ao ler UTM armazenado', error);
    return null;
  }
};

/**
 * Salva dados UTM no localStorage
 * 
 * @param payload - Dados UTM a serem salvos
 */
export const persistUtmParams = (payload: StoredUtmAttribution): void => {
  // Verifica se está no browser
  if (!isBrowser()) return;
  
  try {
    // Normaliza antes de salvar
    const normalized = normalizePayload(payload);
    
    // Converte para JSON e salva
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    
  } catch (error) {
    // Erro comum: localStorage cheio (quota exceeded)
    console.warn('[utmTracker] Não foi possível persistir UTM', error);
  }
};

/**
 * Remove dados UTM do localStorage
 * Usado após persistir no banco de dados
 */
export const clearUtmParams = (): void => {
  if (!isBrowser()) return;
  
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[utmTracker] Não foi possível limpar UTM', error);
  }
};

/**
 * FUNÇÃO PRINCIPAL: Captura UTMs da URL e gerencia armazenamento
 * 
 * REGRA ESPECIAL: Só captura se utm_source=brant (Brant Immigration)
 * 
 * Lógica:
 * 1. Verifica se utm_source=brant na URL
 * 2. Se sim, captura e decide se sobrescreve
 * 3. Se não há UTMs na URL mas existem dados salvos, atualiza last_touch_page
 * 4. Sempre persiste no localStorage
 * 
 * @returns Dados UTM capturados ou null
 */
export const captureUtmFromUrl = (): StoredUtmAttribution | null => {
  if (!isBrowser()) return null;

  // 1. Extrai parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  const { utmRecord, hasValue } = buildUtmRecord(params);
  
  // ✅ VERIFICAÇÃO ESPECIAL: Só captura se utm_source=brant
  const utmSource = params.get('utm_source');
  const isBrantSource = utmSource?.toLowerCase() === 'brant';
  
  // 2. Lê dados existentes (se houver)
  const existing = getStoredUtmParams();
  
  // 3. Obtém caminho atual
  const currentPath = getCurrentPath();

  // CASO A: Não há UTMs na URL atual OU não é da Brant
  if (!hasValue || !isBrantSource) {
    // Se existe dados anteriores, apenas atualiza last_touch_page
    if (existing) {
      const refreshed = {
        ...existing,
        last_touch_page: currentPath || existing.last_touch_page,
      };
      persistUtmParams(refreshed);
      return refreshed;
    }
    // Se não existe, retorna null
    return null;
  }

  // CASO B: Há UTMs na URL atual E é da Brant Immigration
  console.log('[utmTracker] ✅ UTMs da Brant Immigration detectados:', utmRecord);
  
  // Decide se deve sobrescrever dados existentes
  const override = shouldOverrideExisting(existing);
  
  // Base para merge: se sobrescrever ou não existe, usa objeto vazio
  // Senão, usa dados existentes
  const base = override || !existing ? {} : existing;
  
  // Timestamp: novo se sobrescrever, senão mantém o original
  const capturedAt = override || !existing 
    ? new Date().toISOString() 
    : existing!.capturedAt;
  
  // Referrer: novo se sobrescrever, senão mantém o original
  const referrer = override 
    ? document?.referrer || undefined 
    : existing?.referrer || document?.referrer || undefined;
  
  // Landing page: novo se sobrescrever, senão mantém o original
  const landingPage = override 
    ? currentPath 
    : existing?.landing_page || currentPath;

  // 4. Constrói payload final (merge de novos UTMs com base)
  const payload: StoredUtmAttribution = {
    // Merge: novos UTMs têm prioridade, senão usa base
    utm_source: utmRecord.utm_source ?? base.utm_source,
    utm_medium: utmRecord.utm_medium ?? base.utm_medium,
    utm_campaign: utmRecord.utm_campaign ?? base.utm_campaign,
    utm_term: utmRecord.utm_term ?? base.utm_term,
    utm_content: utmRecord.utm_content ?? base.utm_content,
    // Campos de navegação
    landing_page: landingPage,
    last_touch_page: currentPath, // Sempre atualiza para página atual
    referrer,
    capturedAt,
  };

  // 5. Persiste no localStorage
  persistUtmParams(payload);
  
  console.log('[utmTracker] ✅ UTMs salvos no localStorage:', payload);
  
  // 6. Retorna dados capturados
  return payload;
};

