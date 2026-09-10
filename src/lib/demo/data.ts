import type { Campaign, NumberStatus, PaymentMethod, PurchaseStatus, RaffleNumber } from '@/lib/types';

/**
 * Tudo neste arquivo é fictício — nenhuma credencial, chave Pix, nome ou
 * telefone real. A demo não faz nenhuma chamada ao Supabase: todo estado
 * vive em memória no navegador (useState) e volta ao ponto de partida se a
 * página for recarregada.
 */

export const DEMO_TOTAL_NUMBERS = 200;
export const DEMO_TICKET_PRICE = 10;
export const DEMO_RESERVATION_HOLD_HOURS = 6;

export const DEMO_RESERVED_NUMBERS = [3, 13, 55, 87, 147];
export const DEMO_CONFIRMED_NUMBERS = [21, 35, 62, 96, 128, 175];

// Pré-computados uma única vez (script Node local) com o MESMO formato/fórmula
// do sorteio real (campaign_id|total_numbers|end_date|ordem|nonce -> SHA-256).
// A verificação de integridade da demo usa o componente real da produção —
// não é um "sempre válido" fingido, o hash bate de verdade com esses valores.
export const DEMO_CAMPAIGN_ID = 'demo-0000-0000-0000-000000000000';
export const DEMO_END_DATE = '2026-11-30';
export const DEMO_DRAW_COMMITMENT =
  'd49126ea038ea694ddef0a134a99d085c087a06b73fdd406898299ff4119f6f1';
export const DEMO_DRAW_NONCE =
  '9cbec1311213cdf3a3d08d0d99ddd129baf7d4ccf05992aa621b4afb83c64bc6';
export const DEMO_DRAW_ORDER: number[] = [
  96, 109, 19, 24, 18, 133, 89, 188, 134, 137, 90, 74, 130, 91, 170, 184, 196, 67, 4, 60, 197, 139,
  86, 94, 53, 199, 1, 144, 57, 165, 50, 73, 41, 193, 78, 28, 171, 114, 155, 103, 54, 22, 70, 20, 87,
  58, 148, 129, 159, 92, 98, 118, 83, 66, 82, 123, 135, 17, 172, 37, 174, 40, 29, 2, 81, 160, 104,
  191, 27, 161, 106, 162, 13, 38, 15, 124, 26, 97, 36, 62, 44, 131, 115, 43, 121, 68, 153, 71, 100,
  101, 113, 181, 195, 143, 45, 110, 116, 158, 194, 49, 84, 9, 108, 14, 179, 51, 32, 16, 7, 99, 93,
  52, 128, 122, 33, 145, 55, 169, 147, 69, 189, 127, 39, 175, 182, 35, 156, 59, 6, 3, 65, 183, 76,
  186, 42, 85, 63, 198, 107, 142, 112, 168, 77, 47, 177, 138, 23, 72, 164, 173, 176, 64, 10, 12,
  102, 48, 149, 105, 167, 157, 5, 46, 125, 187, 31, 146, 180, 80, 154, 21, 126, 75, 132, 95, 8, 119,
  88, 56, 79, 30, 151, 120, 25, 34, 166, 185, 200, 140, 61, 192, 150, 136, 11, 117, 141, 111, 152,
  190, 163, 178,
];
/** Primeiro número CONFIRMED da ordem acima — a mesma regra da produção. */
export const DEMO_WINNING_NUMBER = 96;

export function buildDemoCampaign(locked: boolean, revealed: boolean): Campaign {
  return {
    id: DEMO_CAMPAIGN_ID,
    title: 'Rifa Premiada',
    description: 'Concorra a uma cesta de prêmios escolhendo um ou mais números da sorte.',
    image_url:
      'https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80&w=1200&auto=format&fit=crop',
    start_date: '2026-09-01',
    end_date: DEMO_END_DATE,
    total_numbers: DEMO_TOTAL_NUMBERS,
    ticket_price: DEMO_TICKET_PRICE,
    status: 'active',
    regulation_text:
      'Este é um ambiente de demonstração. O regulamento completo da promoção real aparecerá aqui.',
    authorization_number: null,
    draw_commitment: locked ? DEMO_DRAW_COMMITMENT : null,
    draw_locked_at: locked ? '2026-09-01T12:00:00.000Z' : null,
    draw_revealed_at: revealed ? new Date().toISOString() : null,
    winning_number: revealed ? DEMO_WINNING_NUMBER : null,
    draw_nonce: revealed ? DEMO_DRAW_NONCE : null,
    draw_order: revealed ? DEMO_DRAW_ORDER : null,
    created_at: '2026-09-01T12:00:00.000Z',
    updated_at: '2026-09-01T12:00:00.000Z',
  };
}

export function buildDemoNumbers(): RaffleNumber[] {
  const reserved = new Set(DEMO_RESERVED_NUMBERS);
  const confirmed = new Set(DEMO_CONFIRMED_NUMBERS);

  return Array.from({ length: DEMO_TOTAL_NUMBERS }, (_, i) => {
    const number = i + 1;
    let status: NumberStatus = 'available';
    if (confirmed.has(number)) status = 'confirmed';
    else if (reserved.has(number)) status = 'reserved';

    return {
      id: `demo-number-${number}`,
      campaign_id: DEMO_CAMPAIGN_ID,
      number,
      status,
      purchase_id: status === 'available' ? null : `demo-purchase-${number}`,
      updated_at: '2026-09-01T12:00:00.000Z',
    };
  });
}

export interface DemoPurchase {
  purchase_id: string;
  name: string;
  whatsapp: string;
  numbers: number[];
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  total_amount: number;
  created_at: string;
  expires_at: string | null;
}

/**
 * ~5 compradores fictícios cobrindo os números reservados/confirmados acima,
 * para o resumo do painel bater exatamente com a grade pública.
 */
export function buildDemoPurchases(): DemoPurchase[] {
  const now = Date.now();
  const hours = (h: number) => new Date(now + h * 60 * 60 * 1000).toISOString();

  return [
    {
      purchase_id: 'demo-purchase-joao',
      name: 'João Silva',
      whatsapp: '(11) 90000-0001',
      numbers: [3, 13, 147],
      payment_method: 'pix',
      status: 'reserved',
      total_amount: 30,
      created_at: new Date(now - 60 * 60 * 1000).toISOString(),
      expires_at: hours(5),
    },
    {
      purchase_id: 'demo-purchase-maria',
      name: 'Maria Oliveira',
      whatsapp: '(11) 90000-0002',
      numbers: [21, 35],
      payment_method: 'dinheiro',
      status: 'confirmed',
      total_amount: 20,
      created_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      expires_at: null,
    },
    {
      purchase_id: 'demo-purchase-carlos',
      name: 'Carlos Pereira',
      whatsapp: '(11) 90000-0003',
      numbers: [55, 87],
      payment_method: 'pix',
      status: 'reserved',
      total_amount: 20,
      created_at: new Date(now - 30 * 60 * 1000).toISOString(),
      expires_at: hours(5.5),
    },
    {
      purchase_id: 'demo-purchase-ana',
      name: 'Ana Costa',
      whatsapp: '(11) 90000-0004',
      numbers: [62, 96],
      payment_method: 'pix',
      status: 'confirmed',
      total_amount: 20,
      created_at: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      expires_at: null,
    },
    {
      purchase_id: 'demo-purchase-pedro',
      name: 'Pedro Santos',
      whatsapp: '(11) 90000-0005',
      numbers: [128, 175],
      payment_method: 'dinheiro',
      status: 'confirmed',
      total_amount: 20,
      created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      expires_at: null,
    },
  ];
}
