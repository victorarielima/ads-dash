// Helpers de data no fuso de São Paulo (America/Sao_Paulo).
//
// O servidor (Vercel/Node) normalmente roda em UTC, então `new Date().toISOString()`
// devolve a data em UTC — o que, à noite no Brasil, já aponta para o dia seguinte.
// Como o Redshift agora filtra/agrupa por data local (ver ORDER_DATE_LOCAL em
// lib/redshift/queries.ts), as strings de data enviadas nas queries também
// precisam representar o dia local para que "hoje" signifique o dia local inteiro.

const SP_TZ = 'America/Sao_Paulo';

// Formata uma Date como 'YYYY-MM-DD' no fuso de São Paulo.
// (en-CA usa o formato ISO de data.)
export function spDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Data local de São Paulo com `daysAgo` dias subtraídos, como 'YYYY-MM-DD'.
export function spOffsetDateStr(daysAgo: number): string {
  // Parte do "hoje" local e subtrai dias inteiros (Brasil não tem horário de
  // verão desde 2019, então a aritmética de dias é estável).
  const todayStr = spDateStr();
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() - daysAgo);
  return spDateStr(d);
}
