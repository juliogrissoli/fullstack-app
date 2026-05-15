import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Anjoimob API',
    version: '1.0.0',
    description: 'API pública da plataforma Anjoimob — CRM, Fintech, Marketplace e IA',
    contact: { email: 'api@anjoimob.com' },
  },
  servers: [
    { url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://anjoimob.com', description: 'Produção' },
    { url: 'http://localhost:3000', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      Lead: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          client_name: { type: 'string' },
          client_phone: { type: 'string' },
          client_email: { type: 'string' },
          source: { type: 'string' },
          status: { type: 'string', enum: ['novo', 'qualificado', 'convertido', 'perdido'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Prestador: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          categoria: { type: 'string' },
          descricao: { type: 'string' },
          avaliacao: { type: 'number' },
          total_avaliacoes: { type: 'integer' },
          status: { type: 'string', enum: ['pendente', 'ativo', 'inativo'] },
        },
      },
      WalletTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tipo: { type: 'string', enum: ['saque_acelerado', 'saque_normal', 'credito', 'debito'] },
          valor_bruto: { type: 'number' },
          taxa: { type: 'number' },
          valor_liquido: { type: 'number' },
          status: { type: 'string', enum: ['pendente', 'liberado', 'cancelado'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check de todas as integrações',
        tags: ['Sistema'],
        security: [],
        responses: {
          200: { description: 'Sistema saudável' },
          207: { description: 'Sistema degradado — alguns serviços com falha' },
        },
      },
    },
    '/api/leads/capturar': {
      post: {
        summary: 'Capturar lead de campanha',
        tags: ['CRM'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'telefone'],
                properties: {
                  nome: { type: 'string' },
                  telefone: { type: 'string' },
                  email: { type: 'string' },
                  utm_source: { type: 'string' },
                  utm_medium: { type: 'string' },
                  utm_campaign: { type: 'string' },
                  corretor_ref: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Lead registrado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, lead_id: { type: 'string' } } } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/prestadores': {
      get: {
        summary: 'Listar prestadores ativos',
        tags: ['Marketplace'],
        security: [],
        parameters: [{ name: 'categoria', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Lista de prestadores', content: { 'application/json': { schema: { type: 'object', properties: { prestadores: { type: 'array', items: { $ref: '#/components/schemas/Prestador' } } } } } } } },
      },
      post: {
        summary: 'Cadastrar prestador',
        tags: ['Marketplace'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'categoria'],
                properties: { nome: { type: 'string' }, categoria: { type: 'string' }, descricao: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Prestador criado' }, 401: { description: 'Não autorizado' } },
      },
    },
    '/api/permutas': {
      get: { summary: 'Listar permutas abertas', tags: ['Marketplace'], security: [], responses: { 200: { description: 'Lista de permutas' } } },
      post: {
        summary: 'Criar permuta',
        tags: ['Marketplace'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['tipo', 'descricao'], properties: { tipo: { type: 'string' }, descricao: { type: 'string' }, valor_estimado: { type: 'number' } } } } } },
        responses: { 201: { description: 'Permuta criada' }, 401: { description: 'Não autorizado' } },
      },
    },
    '/api/wallet/extrato': {
      get: {
        summary: 'Extrato paginado da carteira',
        tags: ['Fintech'],
        parameters: [
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['credito', 'saque_acelerado', 'saque_normal', 'debito'] } },
          { name: 'de', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'ate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Extrato com saldo', content: { 'application/json': { schema: { type: 'object', properties: { saldo: { type: 'number' }, transacoes: { type: 'array', items: { $ref: '#/components/schemas/WalletTransaction' } }, total: { type: 'integer' }, page: { type: 'integer' }, pages: { type: 'integer' } } } } } }, 401: { description: 'Não autorizado' } },
      },
    },
    '/api/wallet/acelerar-saque': {
      post: {
        summary: 'Solicitar saque acelerado com taxa',
        tags: ['Fintech'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['valor'], properties: { valor: { type: 'number' } } } } } },
        responses: { 200: { description: 'Saque aprovado com taxa calculada' }, 403: { description: 'Score insuficiente' } },
      },
    },
    '/api/yara/search': {
      post: {
        summary: 'Busca semântica de imóveis via embeddings',
        tags: ['IA Yara'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } } } },
        responses: { 200: { description: 'Imóveis encontrados por similaridade' }, 503: { description: 'OPENAI_API_KEY não configurada' } },
      },
    },
    '/api/yara/avm': {
      get: {
        summary: 'Avaliação Automática de Mercado por bairro',
        tags: ['IA Yara'],
        parameters: [
          { name: 'bairro', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'area_m2', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'Preço médio/m² e valor estimado' } },
      },
    },
    '/api/yara/index': {
      post: {
        summary: 'Job de indexação de embeddings (cron)',
        tags: ['IA Yara'],
        security: [{ bearerAuth: [] }],
        description: 'Autorização: Bearer {CRON_SECRET}. Indexa até 20 propriedades pendentes.',
        responses: { 200: { description: 'Quantidade indexada' }, 401: { description: 'CRON_SECRET inválido' } },
      },
    },
    '/api/mercado/indice-bairro': {
      get: {
        summary: 'Índice de valorização por bairro',
        tags: ['Mercado'],
        security: [],
        parameters: [
          { name: 'bairro', in: 'query', schema: { type: 'string' } },
          { name: 'cidade', in: 'query', schema: { type: 'string', default: 'Ribeirão Preto' } },
        ],
        responses: { 200: { description: 'Dados de valorização e preço médio/m²' } },
      },
    },
    '/api/stripe/connect': {
      post: { summary: 'Criar conta Stripe Express para corretor', tags: ['Fintech'], responses: { 200: { description: 'URL de onboarding Stripe' } } },
      get: { summary: 'Status da conta Stripe Connect', tags: ['Fintech'], responses: { 200: { description: 'Status de habilitação da conta' } } },
    },
    '/api/brokers/upgrade-pro': {
      post: { summary: 'Solicitar upgrade para plano PRO', tags: ['Corretores'], responses: { 200: { description: 'Upgrade aprovado' }, 403: { description: 'Score ou vendas insuficientes' } } },
    },
    '/api/brokers/dominio': {
      patch: {
        summary: 'Configurar domínio personalizado (Associado PRO)',
        tags: ['Corretores'],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['dominio_personalizado'], properties: { dominio_personalizado: { type: 'string' } } } } } },
        responses: { 200: { description: 'Domínio salvo' }, 403: { description: 'Requer plano PRO' } },
      },
    },
    '/api/documentos/upload': {
      post: {
        summary: 'Upload de documento para o Doc Vault',
        tags: ['CRM'],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { documento: { type: 'string', format: 'binary' }, tipo: { type: 'string', enum: ['matricula', 'iptu', 'rg', 'cpf', 'contrato', 'outros'] } } } } } },
        responses: { 200: { description: 'Documento registrado no cofre' } },
      },
    },
    '/api/ocr': {
      post: {
        summary: 'OCR de documento (Google Vision ou regex)',
        tags: ['CRM'],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { arquivo: { type: 'string', format: 'binary' }, doc_vault_id: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Texto extraído e dados estruturados' } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
