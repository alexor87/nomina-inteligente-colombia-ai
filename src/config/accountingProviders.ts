import { 
  Building2, 
  Globe, 
  FileSpreadsheet, 
  Webhook,
  Calculator
} from 'lucide-react';

// ============================================================================
// Accounting Provider Registry
// Centralised metadata for all supported accounting integrations
// ============================================================================

export type AccountingProvider = 
  | 'siigo' 
  | 'alegra' 
  | 'world_office' 
  | 'helisa' 
  | 'contai' 
  | 'monica' 
  | 'tns' 
  | 'webhook' 
  | 'csv_export'
  | 'custom';

export type AuthType = 'basic' | 'bearer' | 'custom' | 'none';

export interface ProviderFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
}

export interface ProviderConfig {
  id: AccountingProvider;
  name: string;
  description: string;
  authType: AuthType;
  fields: ProviderFieldConfig[];
  baseUrl: string | null; // null = user must provide
  testEndpoint: string | null;
  helpText: string;
  icon: typeof Building2;
  category: 'popular' | 'other' | 'generic';
  journalEndpoint?: string;
}

export const ACCOUNTING_PROVIDERS: Record<AccountingProvider, ProviderConfig> = {
  siigo: {
    id: 'siigo',
    name: 'Siigo',
    description: 'Software contable líder en Colombia. Conecta tu cuenta empresarial para enviar asientos de nómina.',
    authType: 'basic',
    fields: [
      { key: 'username', label: 'Usuario Siigo', placeholder: 'usuario@empresa.com', type: 'text', required: true },
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    baseUrl: 'https://api.siigo.com/v1',
    testEndpoint: '/users',
    journalEndpoint: '/journals',
    helpText: 'Siigo → Configuración → Integraciones → API → Generar Token',
    icon: Building2,
    category: 'popular',
  },
  alegra: {
    id: 'alegra',
    name: 'Alegra',
    description: 'Sistema de facturación y contabilidad en la nube. Sincroniza tus comprobantes de nómina.',
    authType: 'basic',
    fields: [
      { key: 'username', label: 'Email de Alegra', placeholder: 'email@empresa.com', type: 'text', required: true },
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    baseUrl: 'https://api.alegra.com/api/v1',
    testEndpoint: '/company',
    journalEndpoint: '/journal-entries',
    helpText: 'Alegra → Configuración → Integraciones → Tokens de API → Crear Token',
    icon: Building2,
    category: 'popular',
  },
  world_office: {
    id: 'world_office',
    name: 'World Office',
    description: 'ERP contable y administrativo colombiano con módulos integrados.',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
      { key: 'base_url', label: 'URL de API', placeholder: 'https://api.worldoffice.com.co/v1', type: 'url', required: true },
    ],
    baseUrl: null,
    testEndpoint: '/status',
    journalEndpoint: '/journal-entries',
    helpText: 'World Office → Administración → API → Generar Token de acceso',
    icon: Building2,
    category: 'other',
  },
  helisa: {
    id: 'helisa',
    name: 'Helisa',
    description: 'Software contable y financiero con amplia trayectoria en Colombia.',
    authType: 'basic',
    fields: [
      { key: 'username', label: 'Usuario Helisa', placeholder: 'usuario', type: 'text', required: true },
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    baseUrl: 'https://api.helisa.com',
    testEndpoint: '/status',
    journalEndpoint: '/accounting/journal-entries',
    helpText: 'Helisa → Configuración → Módulo API → Generar credenciales',
    icon: Building2,
    category: 'other',
  },
  contai: {
    id: 'contai',
    name: 'Contai',
    description: 'Plataforma contable en la nube para contadores y empresas.',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
    ],
    baseUrl: 'https://api.contai.co',
    testEndpoint: '/v1/account',
    journalEndpoint: '/v1/journal-entries',
    helpText: 'Contai → Configuración → Integraciones → API Keys',
    icon: Calculator,
    category: 'other',
  },
  monica: {
    id: 'monica',
    name: 'Mónica',
    description: 'Software contable y de facturación popular en Colombia para PYMEs.',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
      { key: 'base_url', label: 'URL de API', placeholder: 'https://api.monica.com.co', type: 'url', required: true },
    ],
    baseUrl: null,
    testEndpoint: '/status',
    journalEndpoint: '/journal-entries',
    helpText: 'Mónica → Herramientas → Configuración API → Generar Token',
    icon: Building2,
    category: 'other',
  },
  tns: {
    id: 'tns',
    name: 'TNS',
    description: 'Sistema de gestión contable y tributaria empresarial.',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'Token API', placeholder: '••••••••••••••••', type: 'password', required: true },
      { key: 'base_url', label: 'URL de API', placeholder: 'https://api.tns.com.co', type: 'url', required: true },
    ],
    baseUrl: null,
    testEndpoint: '/health',
    journalEndpoint: '/api/journal-entries',
    helpText: 'TNS → Configuración → Conexiones API → Crear credencial',
    icon: Building2,
    category: 'other',
  },
  webhook: {
    id: 'webhook',
    name: 'Webhook Personalizado',
    description: 'Envía los asientos contables en formato JSON a cualquier endpoint REST que configures.',
    authType: 'custom',
    fields: [
      { key: 'base_url', label: 'URL del Webhook', placeholder: 'https://tu-api.com/accounting/entries', type: 'url', required: true },
      { key: 'api_key', label: 'Token / API Key (opcional)', placeholder: '••••••••••••••••', type: 'password', required: false },
      { key: 'header_name', label: 'Nombre del Header de Auth', placeholder: 'Authorization, X-API-Key, etc.', type: 'text', required: false },
    ],
    baseUrl: null,
    testEndpoint: null,
    journalEndpoint: null,
    helpText: 'Configura la URL de tu servicio y opcionalmente un header de autenticación',
    icon: Webhook,
    category: 'generic',
  },
  csv_export: {
    id: 'csv_export',
    name: 'Exportar CSV / Excel',
    description: 'Genera un archivo descargable con los asientos contables para importar manualmente en tu software.',
    authType: 'none',
    fields: [],
    baseUrl: null,
    testEndpoint: null,
    journalEndpoint: null,
    helpText: 'No requiere configuración. Los archivos se generan al liquidar cada período.',
    icon: FileSpreadsheet,
    category: 'generic',
  },
};

export const getProviderName = (providerId: string): string => {
  return ACCOUNTING_PROVIDERS[providerId as AccountingProvider]?.name || providerId;
};

export const getProvidersByCategory = () => {
  const providers = Object.values(ACCOUNTING_PROVIDERS);
  return {
    popular: providers.filter(p => p.category === 'popular'),
    other: providers.filter(p => p.category === 'other'),
    generic: providers.filter(p => p.category === 'generic'),
  };
};
