// Indicador de status acessível: cor + ícone + texto.
// Evita depender só de cor (WCAG AA — daltonismo).

import React from 'react';

export type StatusBadgeKind = 'concluido' | 'em_andamento' | 'pendente' | 'apto' | 'alerta';

interface Props {
  status: StatusBadgeKind;
  text?: string;          // Texto opcional ao lado do ícone (default: label do status)
  size?: 'sm' | 'md';
  iconOnly?: boolean;     // Se true, só ícone (mantém aria-label)
}

const CONFIG: Record<StatusBadgeKind, { icon: string; label: string; bg: string; fg: string; border: string }> = {
  concluido:    { icon: '✓', label: 'Concluído',     bg: 'bg-green-100',  fg: 'text-green-800',  border: 'border-green-300' },
  em_andamento: { icon: '⏳', label: 'Em andamento',  bg: 'bg-blue-100',   fg: 'text-blue-800',   border: 'border-blue-300' },
  pendente:     { icon: '○', label: 'Pendente',      bg: 'bg-gray-100',   fg: 'text-gray-700',   border: 'border-gray-300' },
  apto:         { icon: '🏆', label: 'Apto',          bg: 'bg-yellow-100', fg: 'text-yellow-900', border: 'border-yellow-400' },
  alerta:       { icon: '⚠️', label: 'Alerta',        bg: 'bg-amber-100',  fg: 'text-amber-900',  border: 'border-amber-400' },
};

export const StatusBadge: React.FC<Props> = ({ status, text, size = 'sm', iconOnly = false }) => {
  const c = CONFIG[status];
  const cls = `inline-flex items-center gap-1 rounded border ${c.bg} ${c.fg} ${c.border} ${size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`;
  const display = text ?? c.label;

  if (iconOnly) {
    return <span className={cls} aria-label={display} title={display}>{c.icon}</span>;
  }
  return (
    <span className={cls} title={display}>
      <span aria-hidden="true">{c.icon}</span>
      <span>{display}</span>
    </span>
  );
};
