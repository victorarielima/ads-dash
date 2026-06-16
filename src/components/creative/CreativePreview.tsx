'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MessageCircle, Heart, Send, Bookmark, Play, Loader2 } from 'lucide-react';
import { CreativeAsset } from '@/lib/meta/types';

interface CreativePreviewProps {
  creative: CreativeAsset;
}

export function CreativePreview({ creative }: CreativePreviewProps) {
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const params = useParams();
  const adAccountId = params?.adAccountId as string;
  const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
  const [resolvedThumbnail, setResolvedThumbnail] = useState<string | null>(null);
  const [resolvedPermalink, setResolvedPermalink] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  const {
    id = '',
    title = '',
    body = '',
    object_type = 'IMAGE',
    image_url = '',
    thumbnail_url = '',
    source_url = '',
    carousel_cards = [],
    call_to_action_type = 'SHOP_NOW',
    link_url = '',
    instagram_permalink_url = '',
    video_id = '',
  } = creative;

  console.log('[CreativePreview Debug] Carregado:', {
    creativeId: id || creative.id,
    object_type,
    video_id,
    adAccountId
  });

  useEffect(() => {
    if (object_type === 'VIDEO' && video_id) {
      console.log('[CreativePreview Fetching] Buscando vídeo real para video_id:', video_id);
      setIsLoadingVideo(true);
      fetch(`/api/video-source?video_id=${video_id}`)
        .then((res) => {
          console.log('[CreativePreview Response] Status do Fetch:', res.status);
          return res.json();
        })
        .then((data) => {
          console.log('[CreativePreview Data] Recebido:', data);
          
          if (data.source_url) {
            setVideoSourceUrl(data.source_url);
          } else {
            setVideoSourceUrl(null);
          }

          // Resolve a miniatura de alta definição usando a propriedade uri de thumbnails ou picture conforme solicitado pelo usuário
          let thumb = image_url;
          if (data.thumbnails && data.thumbnails.data && data.thumbnails.data.length > 0) {
            const preferred = data.thumbnails.data.find((t: any) => t.is_preferred === true);
            if (preferred && preferred.uri) {
              thumb = preferred.uri;
            } else if (data.thumbnails.data[0].uri) {
              thumb = data.thumbnails.data[0].uri;
            }
          } else if (data.picture) {
            thumb = data.picture;
          }
          setResolvedThumbnail(thumb);

          // Resolve o link exato do post de vídeo no Facebook
          let permalink = instagram_permalink_url || link_url || '#';
          if (data.permalink_url) {
            if (data.permalink_url.startsWith('http')) {
              permalink = data.permalink_url;
            } else {
              permalink = `https://www.facebook.com${data.permalink_url}`;
            }
          }
          setResolvedPermalink(permalink);
        })
        .catch((err) => {
          console.error('Erro ao obter informações do vídeo:', err);
          setVideoSourceUrl(null);
          setResolvedThumbnail(image_url);
          setResolvedPermalink(instagram_permalink_url || link_url || '#');
        })
        .finally(() => {
          setIsLoadingVideo(false);
        });
    } else {
      if (object_type === 'VIDEO') {
        console.warn('[CreativePreview Skip] Ignorando fetch de vídeo. video_id ausente:', { video_id });
      }
      setVideoSourceUrl(null);
      setResolvedThumbnail(null);
      setResolvedPermalink(null);
    }
  }, [video_id, object_type, image_url, instagram_permalink_url, link_url]);

  const getCtaLabel = (cta: string) => {
    switch (cta) {
      case 'SHOP_NOW': return 'Comprar agora';
      case 'LEARN_MORE': return 'Saiba mais';
      case 'WATCH_MORE': return 'Assistir mais';
      case 'SIGN_UP': return 'Cadastre-se';
      case 'BOOK_TRAVEL': return 'Reservar';
      default: return 'Acessar site';
    }
  };

  const handleNextCard = () => {
    if (carousel_cards.length > 0) {
      setActiveCardIdx((prev) => (prev + 1) % carousel_cards.length);
    }
  };

  const handlePrevCard = () => {
    if (carousel_cards.length > 0) {
      setActiveCardIdx((prev) => (prev - 1 + carousel_cards.length) % carousel_cards.length);
    }
  };

  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino shadow-sm w-full max-w-[360px] mx-auto overflow-hidden shrink-0">
      {/* Header do Mock Post */}
      <div className="p-3.5 flex items-center gap-2.5 border-b border-evino-gray-100">
        <div className="w-8 h-8 rounded-full bg-evino-red flex items-center justify-center font-display font-bold text-white text-xs lowercase">
          ev
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-xs text-evino-ink hover:underline cursor-pointer">evino</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Verificado" />
          </div>
          <span className="text-[10px] text-evino-gray-500 block leading-none mt-0.5">Patrocinado</span>
        </div>
      </div>

      {/* Renderizador de Mídia */}
      <div className="relative aspect-square w-full bg-evino-gray-100 flex items-center justify-center overflow-hidden">
        {object_type === 'VIDEO' ? (
          videoSourceUrl ? (
            <video
              src={videoSourceUrl}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : isLoadingVideo ? (
            /* Efeito de carregador premium com a miniatura no fundo */
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={resolvedThumbnail || image_url || thumbnail_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80'}
                alt={title || 'Carregando vídeo...'}
                className="w-full h-full object-cover blur-[3px] opacity-70"
              />
              <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-evino-red animate-spin" />
                <span className="text-[11px] font-semibold text-white bg-evino-ink/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                  Carregando preview...
                </span>
              </div>
            </div>
          ) : (
            /* Fallback de Vídeo sem link de reprodução público: exibe a capa com o botão Play premium direcionando para o permalink */
            <a
              href={resolvedPermalink || instagram_permalink_url || link_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-full h-full group flex items-center justify-center cursor-pointer"
            >
              <img
                src={resolvedThumbnail || image_url || thumbnail_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80'}
                alt={title || 'Video Thumbnail'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/95 hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center transition-all cursor-pointer">
                  <Play className="w-6 h-6 text-evino-red ml-0.5 fill-current" />
                </div>
              </div>
            </a>
          )
        ) : object_type === 'CAROUSEL' && carousel_cards.length > 0 ? (
          <div className="relative w-full h-full">
            {/* Imagem do Card do Carrossel */}
            <img
              src={carousel_cards[activeCardIdx].image_url}
              alt={carousel_cards[activeCardIdx].title}
              className="w-full h-full object-cover"
            />
            {/* Navegadores */}
            {carousel_cards.length > 1 && (
              <>
                <button
                  onClick={handlePrevCard}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-evino-ink flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextCard}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-evino-ink flex items-center justify-center shadow-md transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Dots indicadores */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1">
                  {carousel_cards.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === activeCardIdx ? 'bg-evino-red w-3' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {/* Rodapé Interno do Carousel Card */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-evino-gray-100 p-2.5 flex items-center justify-between text-xs">
              <div className="truncate pr-4">
                <p className="font-bold text-evino-ink truncate">{carousel_cards[activeCardIdx].title}</p>
                {carousel_cards[activeCardIdx].description && (
                  <p className="text-[10px] text-evino-gray-500 truncate mt-0.5">{carousel_cards[activeCardIdx].description}</p>
                )}
              </div>
              <a
                href={carousel_cards[activeCardIdx].link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-evino-red hover:bg-evino-red-600 active:bg-evino-red-700 text-white font-bold px-3 py-1.5 rounded-evino text-[10px] uppercase transition-colors"
              >
                {getCtaLabel(call_to_action_type)}
              </a>
            </div>
          </div>
        ) : (
          /* Imagem única (Fallback padrão) */
          (image_url || thumbnail_url) && (
            <img
              src={image_url || thumbnail_url || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80'}
              alt={title || 'Creative Image'}
              className="w-full h-full object-cover"
            />
          )
        )}
        
        {/* Barra de Ação inferior para Imagem / Vídeo único */}
        {object_type !== 'CAROUSEL' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-evino-gray-100/30 p-3 flex items-center justify-between text-xs">
            <div className="truncate pr-4">
              <span className="text-[10px] text-evino-gray-400 uppercase font-mono tracking-wider">evino.com.br</span>
              <p className="font-bold text-evino-ink truncate leading-tight mt-0.5">{title}</p>
            </div>
            <a
              href={link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-evino-red hover:bg-evino-red-600 active:bg-evino-red-700 text-white font-bold px-4 py-2 rounded-evino text-xs uppercase tracking-wide transition-colors"
            >
              {getCtaLabel(call_to_action_type)}
            </a>
          </div>
        )}
      </div>

      {/* Ícones de Engajamento Social */}
      <div className="p-3.5 flex items-center justify-between border-b border-evino-gray-100">
        <div className="flex items-center gap-4 text-evino-gray-700">
          <Heart className="w-5.5 h-5.5 cursor-pointer hover:text-red-500 transition-colors" />
          <MessageCircle className="w-5.5 h-5.5 cursor-pointer hover:text-evino-red transition-colors" />
          <Send className="w-5.5 h-5.5 cursor-pointer hover:text-blue-500 transition-colors" />
        </div>
        <Bookmark className="w-5.5 h-5.5 text-evino-gray-700 cursor-pointer hover:text-yellow-600 transition-colors" />
      </div>

      {/* Legenda do Criativo */}
      <div className="p-3.5 text-xs text-evino-ink">
        <p className="font-semibold mb-1">evino</p>
        <p className="text-evino-gray-600 whitespace-pre-line leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}
