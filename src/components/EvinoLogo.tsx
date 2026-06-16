import React from 'react';

interface EvinoLogoProps {
  selectedAccountId?: string;
  accounts?: any[];
  className?: string;
}

export function EvinoLogo({ selectedAccountId = '', accounts = [], className = '' }: EvinoLogoProps) {
  // Encontra a conta de anúncio ativa na lista real
  const activeAccount = accounts.find((acc) => acc.id === selectedAccountId);
  const accountName = activeAccount?.name?.toLowerCase() || '';

  // Determina a marca com base no nome da conta de anúncios
  let logoSrc = '/logo-evino.png';
  let altText = 'Evino';
  let logoHeight = 'h-6'; // Altura ideal adaptada para a logo da Evino (mais discreta e elegante)

  if (accountName.includes('grand') || accountName.includes('cru')) {
    logoSrc = '/logo-grandcru.png';
    altText = 'Grand Cru';
    logoHeight = 'h-9'; // Aumentada para h-9 para compensar as linhas cursivas finas da Grand Cru
  }

  return (
    <div className={`flex items-center select-none shrink-0 ${className}`}>
      <img
        src={logoSrc}
        alt={altText}
        className={`${logoHeight} w-auto object-contain shrink-0`}
      />
    </div>
  );
}
