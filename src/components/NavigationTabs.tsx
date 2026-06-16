'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, TableProperties, ArrowLeftRight } from 'lucide-react';
import { clsx } from 'clsx';

interface NavigationTabsProps {
  accountId: string;
}

export function NavigationTabs({ accountId }: NavigationTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const tabs = [
    {
      name: 'Overview da Conta',
      href: `/${accountId}${queryStr}`,
      activePattern: new RegExp(`^\\/${accountId}$`),
      icon: LayoutDashboard,
    },
    {
      name: 'Tabela de Criativos',
      href: `/${accountId}/creatives${queryStr}`,
      activePattern: new RegExp(`^\\/${accountId}/creatives$`),
      icon: TableProperties,
    },
    {
      name: 'Comparador',
      href: `/${accountId}/compare${queryStr}`,
      activePattern: new RegExp(`^\\/${accountId}/compare$`),
      icon: ArrowLeftRight,
    },
  ];

  const checkActive = (tab: typeof tabs[0]) => {
    return tab.activePattern.test(pathname);
  };

  return (
    <div className="flex border-b border-evino-gray-200 bg-white px-6">
      <nav className="flex gap-6 -mb-px" aria-label="Abas de Navegação">
        {tabs.map((tab) => {
          const isActive = checkActive(tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={clsx(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-display text-sm font-semibold transition-all select-none',
                isActive
                  ? 'border-evino-red text-evino-red'
                  : 'border-transparent text-evino-gray-500 hover:text-evino-gray-700 hover:border-evino-gray-300'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-evino-red' : 'text-evino-gray-400')} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
