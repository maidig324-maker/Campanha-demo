export type NumberStatus = 'available' | 'reserved' | 'confirmed';
export type PaymentMethod = 'pix' | 'dinheiro';
export type PurchaseStatus = 'reserved' | 'confirmed' | 'canceled' | 'expired';
export type CampaignStatus = 'draft' | 'active' | 'finished' | 'canceled';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  total_numbers: number;
  ticket_price: number;
  status: CampaignStatus;
  regulation_text: string;
  authorization_number: string | null;
  draw_commitment: string | null;
  draw_locked_at: string | null;
  draw_revealed_at: string | null;
  winning_number: number | null;
  draw_nonce: string | null;
  draw_order: number[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dados públicos disponíveis ANTES de qualquer reserva (vêm da view
 * `public_settings`). Nunca inclui chave Pix, QR code ou instruções — esses
 * só chegam ao cliente na resposta de uma reserva bem-sucedida (ver
 * PixInfo/CreatePurchaseResult).
 */
export interface PublicSettings {
  campaign_id: string;
  whatsapp_number: string | null;
  reservation_hold_hours: number;
}

/** Dados de Pix — só existem no cliente depois de uma reserva confirmada pelo servidor. */
export interface PixInfo {
  pix_receiver_name: string | null;
  pix_key: string | null;
  pix_qr_code_url: string | null;
  payment_instructions: string | null;
}

/** Registro completo da tabela `settings`, usado apenas no painel administrativo. */
export interface Settings extends PublicSettings, PixInfo {
  id: string;
  updated_at: string;
}

export interface RaffleNumber {
  id: string;
  campaign_id: string;
  number: number;
  status: NumberStatus;
  purchase_id: string | null;
  updated_at: string;
}

export interface Participant {
  id: string;
  name: string;
  whatsapp: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  campaign_id: string;
  participant_id: string;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  total_amount: number;
  notes: string;
  expires_at: string | null;
  expired_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

export interface PurchaseRow {
  purchase_id: string;
  participant_id: string;
  name: string;
  whatsapp: string;
  numbers: number[];
  number_ids: string[];
  quantity: number;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  total_amount: number;
  notes: string;
  expires_at: string | null;
  created_at: string;
  confirmed_at: string | null;
}
