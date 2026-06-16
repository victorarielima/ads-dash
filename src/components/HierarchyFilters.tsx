'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, X, Layers, Target } from 'lucide-react';
import { clsx } from 'clsx';

interface CampaignItem {
  id: string;
  name: string;
  status: string;
}

interface AdSetItem {
  id: string;
  name: string;
  status: string;
  campaign_id?: string;
}

interface HierarchyFiltersProps {
  campaigns: CampaignItem[];
  adSets: AdSetItem[];
  selectedCampaignId?: string;
  selectedAdSetId?: string;
}

export function HierarchyFilters({
  campaigns = [],
  adSets = [],
  selectedCampaignId = '',
  selectedAdSetId = '',
}: HierarchyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleCampaignChange = (campaignId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (!campaignId) {
      params.delete('campaign_id');
      params.delete('adset_id');
    } else {
      params.set('campaign_id', campaignId);
      params.delete('adset_id'); // limpa o adset anterior já que mudou a campanha
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleAdSetChange = (adsetId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (!adsetId) {
      params.delete('adset_id');
    } else {
      params.set('adset_id', adsetId);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('campaign_id');
    params.delete('adset_id');
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = !!selectedCampaignId || !!selectedAdSetId;

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
        <div className="flex items-center gap-1.5 text-evino-ink font-semibold text-sm shrink-0">
          <Filter className="w-4 h-4 text-evino-red" />
          <span>Filtros de Fluxo:</span>
        </div>

        {/* Dropdown de Campanha */}
        <div className="flex items-center gap-1.5 bg-evino-gray-50 border border-evino-gray-200 rounded-evino px-3 py-1.5 text-xs text-evino-gray-700 font-medium min-w-[200px] max-w-xs flex-1">
          <Layers className="w-3.5 h-3.5 text-evino-gray-400 shrink-0" />
          <select
            value={selectedCampaignId}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className="bg-transparent focus:outline-none font-bold text-evino-ink cursor-pointer w-full"
          >
            <option value="">Todas as Campanhas</option>
            {campaigns.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.status === 'ACTIVE' ? '🟢' : '⚫'} {camp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown de Ad Set (Conjunto de Anúncios) */}
        <div className={clsx(
          "flex items-center gap-1.5 border rounded-evino px-3 py-1.5 text-xs font-medium min-w-[200px] max-w-xs flex-1 transition-all",
          selectedCampaignId 
            ? "bg-evino-gray-50 border-evino-gray-200 text-evino-gray-700" 
            : "bg-evino-gray-100 border-evino-gray-200 text-evino-gray-400 opacity-60 cursor-not-allowed"
        )}>
          <Target className="w-3.5 h-3.5 text-evino-gray-400 shrink-0" />
          <select
            value={selectedAdSetId}
            onChange={(e) => handleAdSetChange(e.target.value)}
            disabled={!selectedCampaignId}
            className={clsx(
              "bg-transparent focus:outline-none font-bold w-full",
              selectedCampaignId ? "text-evino-ink cursor-pointer" : "text-evino-gray-400 cursor-not-allowed"
            )}
          >
            <option value="">Todos os Conjuntos de Anúncios</option>
            {adSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.status === 'ACTIVE' ? '🟢' : '⚫'} {set.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botão de Limpar Filtros */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-evino-red/30 text-evino-red hover:bg-evino-red/5 font-bold text-xs rounded-evino transition-all shadow-sm cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Limpar Filtros</span>
        </button>
      )}
    </div>
  );
}
