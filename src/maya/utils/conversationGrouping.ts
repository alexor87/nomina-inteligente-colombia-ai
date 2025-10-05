import { startOfDay, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { ConversationSummary } from '../types';

export interface GroupedConversations {
  today: ConversationSummary[];
  yesterday: ConversationSummary[];
  last7days: ConversationSummary[];
  last30days: ConversationSummary[];
  older: ConversationSummary[];
}

/**
 * Agrupa conversaciones por períodos temporales
 */
export function groupConversationsByDate(conversations: ConversationSummary[]): GroupedConversations {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const last7Days = subDays(today, 7);
  const last30Days = subDays(today, 30);

  return {
    today: conversations.filter(c => {
      const date = parseISO(c.updated_at);
      return isAfter(date, today);
    }),
    yesterday: conversations.filter(c => {
      const date = parseISO(c.updated_at);
      return isAfter(date, yesterday) && isBefore(date, today);
    }),
    last7days: conversations.filter(c => {
      const date = parseISO(c.updated_at);
      return isAfter(date, last7Days) && isBefore(date, yesterday);
    }),
    last30days: conversations.filter(c => {
      const date = parseISO(c.updated_at);
      return isAfter(date, last30Days) && isBefore(date, last7Days);
    }),
    older: conversations.filter(c => {
      const date = parseISO(c.updated_at);
      return isBefore(date, last30Days);
    })
  };
}

/**
 * Obtiene el label traducido para cada grupo
 */
export function getGroupLabel(groupKey: keyof GroupedConversations): string {
  const labels: Record<keyof GroupedConversations, string> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    last7days: 'Últimos 7 días',
    last30days: 'Últimos 30 días',
    older: 'Más antiguas'
  };
  return labels[groupKey];
}
