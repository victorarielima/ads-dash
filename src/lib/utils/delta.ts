export function calculateDelta(current: number | string, previous: number | string): number {
  const cur = typeof current === 'string' ? parseFloat(current) : current;
  const prev = typeof previous === 'string' ? parseFloat(previous) : previous;
  
  if (isNaN(cur) || isNaN(prev)) return 0;
  if (prev === 0) {
    return cur > 0 ? 100 : 0;
  }
  
  return ((cur - prev) / prev) * 100;
}
