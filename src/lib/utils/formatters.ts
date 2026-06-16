export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00%';
  // Se o valor já for em escala 0-100 (ex: 2.5 para 2.5%), dividimos ou mantemos conforme o uso.
  // Na Meta API, o CTR vem como 2.5 para 2.5%, não 0.025. Portanto, formatamos diretamente.
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100);
}

export function formatPercentRaw(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,0%';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(num) + '%';
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('pt-BR').format(num);
}

export function formatCompactNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

export function formatVideoDuration(seconds: number | string): string {
  const sec = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  if (isNaN(sec)) return '0:00';
  const mins = Math.floor(sec / 60);
  const remainingSecs = Math.floor(sec % 60);
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
}

export function formatDateRange(startDateStr: string, endDateStr: string): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
}
