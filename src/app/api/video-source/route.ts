import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('video_id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'O parâmetro video_id é obrigatório.' },
        { status: 400 }
      );
    }

    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    const META_API_VERSION = process.env.META_API_VERSION || 'v25.0';
    const BASE_URL = 'https://graph.facebook.com';

    if (!META_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'META_ACCESS_TOKEN_MISSING: configure a variável de ambiente no arquivo .env.local.' },
        { status: 500 }
      );
    }

    // Fazemos a requisição direta ao ID do vídeo solicitando exatamente os campos desejados pelo usuário
    const url = `${BASE_URL}/${META_API_VERSION}/${videoId}?fields=source,permalink_url,picture,thumbnails{uri,is_preferred}&access_token=${META_ACCESS_TOKEN}`;
    console.log(`[Video Source API] Buscando informações de vídeo para ${videoId} (versão: ${META_API_VERSION})...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const metaError = errorBody.error || {};
      
      console.warn(`[Video Source API Warning] Meta API retornou erro para o vídeo ${videoId} (Status ${response.status}):`, metaError.message || metaError);
      
      return NextResponse.json({ 
        source_url: null, 
        error: metaError.message || `Meta API error status ${response.status}` 
      });
    }

    const videoData = await response.json();
    console.log(`[Video Source API] Meta API respondeu com sucesso para o vídeo ${videoId}.`);

    // Trata de forma resiliente se vier em formato de array de objetos ou objeto puro
    const targetObj = Array.isArray(videoData) ? videoData[0] : videoData;
    const sourceUrl = targetObj?.source || null;

    return NextResponse.json({ 
      source_url: sourceUrl,
      permalink_url: targetObj?.permalink_url || null,
      picture: targetObj?.picture || null,
      thumbnails: targetObj?.thumbnails || null
    });
  } catch (error: any) {
    console.error('Erro silencioso na rota de API video-source:', error);
    return NextResponse.json({ 
      source_url: null, 
      error: error.message || 'Erro interno ao processar as informações do vídeo.' 
    });
  }
}
