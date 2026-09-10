import { clsx, type ClassValue } from 'clsx';
import type { NumberStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number, totalDigits = 3) {
  return n.toString().padStart(totalDigits, '0');
}

export function formatCurrencyBR(value: number | string) {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDateBR(iso: string) {
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const STATUS_LABEL: Record<NumberStatus, string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  confirmed: 'Confirmado',
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

/** Monta um link wa.me a partir de um número de telefone brasileiro. */
export function whatsappLink(rawPhone: string, message: string) {
  const digits = onlyDigits(rawPhone);
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function daysUntil(dateIso: string) {
  const target = new Date(`${dateIso}T23:59:59-03:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isCampaignOpen(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(`${startDate}T00:00:00-03:00`);
  const end = new Date(`${endDate}T23:59:59-03:00`);
  return now >= start && now <= end;
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
