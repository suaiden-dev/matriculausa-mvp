// Lista de parâmetros UTM padrão (Google Analytics)
export const UTM_PARAM_KEYS = [
  'utm_source',    // Origem do tráfego (ex: brant, google, facebook)
  'utm_medium',    // Meio de marketing (ex: cpc, email, social, organic)
  'utm_campaign',  // Nome da campanha (ex: summer_sale, black_friday)
  'utm_term',      // Termo de busca pago (ex: immigration services)
  'utm_content'    // Conteúdo específico (ex: logolink, textlink)
] as const;

// Tipo derivado da lista acima (type-safe)
export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];
// Resultado: 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content'

// Interface base com dados de atribuição
export interface UtmAttributionData {
  utm_source?: string;      // Origem
  utm_medium?: string;      // Meio
  utm_campaign?: string;    // Campanha
  utm_term?: string;        // Termo (opcional)
  utm_content?: string;     // Conteúdo (opcional)
  landing_page?: string;    // Primeira página visitada com UTM
  last_touch_page?: string; // Última página visitada
  referrer?: string;        // URL de referência (document.referrer)
  gs?: string;               // Parâmetro para identificar compartilhamento orgânico (opcional)
  client_name?: string;      // Nome do cliente que compartilhou o link (opcional)
  client_email?: string;     // Email do cliente que compartilhou o link (opcional)
}

// Interface estendida com timestamp de captura
export interface StoredUtmAttribution extends UtmAttributionData {
  capturedAt: string; // ISO 8601 timestamp (ex: "2025-01-15T10:30:00.000Z")
}

