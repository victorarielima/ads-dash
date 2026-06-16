'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CreativePreview } from '@/components/creative/CreativePreview';
import { formatCurrency, formatNumber } from '@/lib/utils/formatters';
import { X, Search, Filter, Play, ExternalLink, Columns } from 'lucide-react';
import { clsx } from 'clsx';

interface CreativeTableRow {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
  adsetName: string;
  format: string; // 'IMAGE' | 'VIDEO' | 'CAROUSEL'
  thumbnail: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  revenue: number;
  roas: number;
  frequency: number;
  // Detalhes extras para preview
  creative: {
    id: string;
    name: string;
    title?: string;
    body?: string;
    object_type: string;
    call_to_action_type?: string;
    image_url?: string;
    thumbnail_url?: string;
    video_id?: string;
    source_url?: string;
    instagram_permalink_url?: string;
    link_url?: string;
    carousel_cards?: any[];
  };
  fatigueStatus: string;
  fatigueColor: string;
}

interface CreativesTableProps {
  accountId: string;
  data: CreativeTableRow[];
}

export function CreativesTable({ accountId, data }: CreativesTableProps) {
  const router = useRouter();

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  
  // Estado do Drawer
  const [selectedRow, setSelectedRow] = useState<CreativeTableRow | null>(null);

  // Estados de Colunas Visíveis (Configuráveis)
  const [visibleColumns, setVisibleColumns] = useState({
    delivery: true,
    engagement: true,
    conversion: true,
  });

  const [showColumnToggle, setShowColumnToggle] = useState(false);

  // Filtra os criativos de acordo com as seleções do usuário
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.id.includes(searchTerm) ||
                            item.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      
      const matchesFormat = formatFilter === 'ALL' || item.format === formatFilter;

      return matchesSearch && matchesStatus && matchesFormat;
    });
  }, [data, searchTerm, statusFilter, formatFilter]);

  // Lista de formatos únicos para preencher o select de filtros
  const formats = useMemo(() => {
    return Array.from(new Set(data.map(item => item.format)));
  }, [data]);

  return (
    <div className="relative flex flex-col min-h-screen">
      
      {/* 1. Barra de Filtros e Busca */}
      <div className="bg-white border border-evino-gray-200 rounded-evino p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          
          {/* Busca por Texto */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-evino-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por criativo, campanha ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-evino-gray-50 border border-evino-gray-200 rounded-evino pl-9 pr-4 py-1.5 text-sm text-evino-ink focus:outline-none focus:ring-1 focus:ring-evino-red focus:bg-white transition-all placeholder-evino-gray-400"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1.5 bg-evino-gray-50 border border-evino-gray-200 rounded-evino px-3 py-1.5 text-xs text-evino-gray-700 font-medium">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-bold text-evino-ink cursor-pointer"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
            </select>
          </div>

          {/* Filtro de Formato */}
          <div className="flex items-center gap-1.5 bg-evino-gray-50 border border-evino-gray-200 rounded-evino px-3 py-1.5 text-xs text-evino-gray-700 font-medium">
            <span>Formato:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-bold text-evino-ink cursor-pointer"
            >
              <option value="ALL">Todos os Formatos</option>
              {formats.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customizador de Colunas */}
        <div className="relative">
          <button
            onClick={() => setShowColumnToggle(!showColumnToggle)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-evino-gray-300 text-evino-gray-700 font-semibold text-xs rounded-evino hover:bg-evino-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Colunas</span>
          </button>
          
          {showColumnToggle && (
            <div className="absolute right-0 mt-2 bg-white border border-evino-gray-200 rounded-evino shadow-lg p-3 z-30 w-44 space-y-2.5 text-xs font-semibold text-evino-gray-700">
              <p className="border-b border-evino-gray-100 pb-1.5 uppercase tracking-wide text-evino-gray-400 text-[10px]">Exibir seções</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.delivery}
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, delivery: e.target.checked }))}
                  className="accent-evino-red rounded"
                />
                Entrega e Mídia
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.engagement}
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, engagement: e.target.checked }))}
                  className="accent-evino-red rounded"
                />
                Engajamento
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns.conversion}
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, conversion: e.target.checked }))}
                  className="accent-evino-red rounded"
                />
                Vendas e Conversão
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 2. Grid de Conteúdo Tabela + Drawer */}
      <div className="flex-1 flex gap-6 overflow-hidden items-start">
        
        {/* Tabela de Criativos */}
        <div className="flex-1 bg-white border border-evino-gray-200 rounded-evino shadow-sm overflow-hidden transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-evino-cream border-b border-evino-gray-200 text-xs font-semibold text-evino-gray-600 uppercase select-none">
                  <th className="p-3 pl-4 rounded-l-evino">Criativo</th>
                  <th className="p-3">Status</th>
                  
                  {visibleColumns.delivery && (
                    <>
                      <th className="p-3 text-right">Impressões</th>
                      <th className="p-3 text-right">Investimento</th>
                      <th className="p-3 text-right">CPM</th>
                    </>
                  )}

                  {visibleColumns.engagement && (
                    <>
                      <th className="p-3 text-right">CTR</th>
                      <th className="p-3 text-right">CPC</th>
                    </>
                  )}

                  {visibleColumns.conversion && (
                    <>
                      <th className="p-3 text-right">Compras</th>
                      <th className="p-3 text-right">Receita</th>
                      <th className="p-3 text-right font-bold text-evino-red">ROAS</th>
                    </>
                  )}

                  <th className="p-3 text-center">Fadiga</th>
                  <th className="p-3 text-center rounded-r-evino">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-evino-gray-100 text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-evino-gray-400 font-medium">
                      Nenhum criativo localizado com os filtros ativos.
                    </td>
                  </tr>
                ) : (
                  filteredData.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row)}
                      onDoubleClick={() => router.push(`/${accountId}/ad/${row.id}`)}
                      className={clsx(
                        'hover:bg-evino-gray-50 transition-colors cursor-pointer select-none',
                        selectedRow?.id === row.id ? 'bg-evino-cream/40 border-l-2 border-l-evino-red' : ''
                      )}
                    >
                      {/* Identificação */}
                      <td className="p-3 pl-4 flex items-center gap-3">
                        <img
                          src={row.thumbnail}
                          alt={row.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=64&auto=format&fit=crop&q=80';
                          }}
                          className="w-11 h-11 object-cover rounded-evino border border-evino-gray-200 shrink-0"
                        />
                        <div className="max-w-[200px]">
                          <span className="font-semibold text-evino-ink block truncate" title={row.name}>
                            {row.name}
                          </span>
                          <span className="text-[10px] text-evino-gray-400 block font-mono leading-tight">{row.id}</span>
                          <span className="text-[9px] bg-evino-gray-100 text-evino-gray-500 rounded px-1 mt-0.5 inline-block font-mono">
                            {row.format}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span className={clsx(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border leading-none',
                          row.status === 'ACTIVE'
                            ? 'bg-success/5 text-success border-success/20'
                            : 'bg-evino-gray-100 text-evino-gray-500 border-evino-gray-200'
                        )}>
                          {row.status === 'ACTIVE' ? 'ATIVO' : 'PAUSADO'}
                        </span>
                      </td>

                      {/* Entrega e Mídia */}
                      {visibleColumns.delivery && (
                        <>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                            {formatNumber(row.impressions)}
                          </td>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink font-semibold">
                            {formatCurrency(row.spend)}
                          </td>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-500">
                            {formatCurrency(row.cpm)}
                          </td>
                        </>
                      )}

                      {/* Engajamento */}
                      {visibleColumns.engagement && (
                        <>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                            {row.ctr.toFixed(2)}%
                          </td>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-gray-600">
                            {formatCurrency(row.cpc)}
                          </td>
                        </>
                      )}

                      {/* Vendas e Conversão */}
                      {visibleColumns.conversion && (
                        <>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink font-medium">
                            {formatNumber(row.purchases)}
                          </td>
                          <td className="p-3 text-right font-mono text-xs tabular-nums text-evino-ink font-semibold">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="p-3 text-right font-mono text-xs font-bold text-evino-red tabular-nums">
                            {row.roas.toFixed(2)}x
                          </td>
                        </>
                      )}

                      {/* Fadiga */}
                      <td className="p-3 text-center">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-evino text-[10px] font-bold border',
                          row.fatigueColor
                        )}>
                          {row.fatigueStatus}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${accountId}/ad/${row.id}`);
                          }}
                          className="p-1 hover:bg-evino-gray-100 text-evino-gray-400 hover:text-evino-red rounded-full transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Abrir Drill-Down"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawer Lateral Direito (Preview Rápido) */}
        {selectedRow && (
          <div className="w-[380px] shrink-0 bg-white border border-evino-gray-200 rounded-evino shadow-lg flex flex-col max-h-[700px] overflow-hidden sticky top-6 z-10 transition-all duration-300">
            {/* Header do Drawer */}
            <div className="p-3 border-b border-evino-gray-100 flex items-center justify-between bg-evino-cream">
              <span className="font-display font-semibold text-xs text-evino-gray-600 uppercase tracking-wide">
                Preview Rápido do Anúncio
              </span>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 hover:bg-evino-gray-200 text-evino-gray-500 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Corpo do Drawer (Visualização) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <CreativePreview creative={selectedRow.creative} />
              
              {/* Infos adicionais */}
              <div className="bg-evino-gray-50 border border-evino-gray-150 rounded-evino p-3 text-xs space-y-2">
                <p className="font-bold text-evino-ink uppercase tracking-wide text-[9px] text-evino-gray-400">Contexto da Entrega</p>
                <div>
                  <span className="text-evino-gray-500 block">Campanha</span>
                  <span className="font-semibold text-evino-ink block truncate">{selectedRow.campaignName}</span>
                </div>
                <div>
                  <span className="text-evino-gray-500 block">Conjunto de Anúncios (Adset)</span>
                  <span className="font-semibold text-evino-ink block truncate">{selectedRow.adsetName}</span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => router.push(`/${accountId}/ad/${selectedRow.id}`)}
                    className="w-full bg-evino-ink hover:bg-evino-gray-800 text-white font-bold py-2 rounded-evino text-center text-xs block transition-all"
                  >
                    Ver Relatório Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
