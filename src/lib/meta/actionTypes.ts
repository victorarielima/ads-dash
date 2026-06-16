const ACTION_LABELS: Record<string, string> = {
  'purchase': 'Compras',
  'add_to_cart': 'Adições ao Carrinho',
  'initiate_checkout': 'Início de Checkout',
  'view_content': 'Visualizações de Conteúdo',
  'landing_page_view': 'Visualizações de Página de Destino',
  'post_reaction': 'Reações',
  'comment': 'Comentários',
  'share': 'Compartilhamentos',
  'page_like': 'Curtidas na Página',
  'post_engagement': 'Engajamento com o Post',
  'lead': 'Cadastros',
  'search': 'Pesquisas',
  'add_payment_info': 'Adições de Info de Pagamento',
  'subscribe': 'Assinaturas'
};

export function getActionLabel(actionType: string): string {
  return ACTION_LABELS[actionType] || actionType;
}

export function parseActions(actions: Array<{ action_type: string; value: string }> | undefined, type: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  // Mapeamento inteligente para aceitar variações comuns da Graph API para Pixel (ex: fb_pixel_purchase)
  let searchTypes = [type];
  if (type === 'purchase') {
    searchTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_conversion.messaging_purchase'];
  } else if (type === 'add_to_cart') {
    searchTypes = ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart'];
  } else if (type === 'initiate_checkout') {
    searchTypes = ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'];
  } else if (type === 'view_content') {
    searchTypes = ['view_content', 'offsite_conversion.fb_pixel_view_content'];
  } else if (type === 'landing_page_view') {
    searchTypes = ['landing_page_view', 'offsite_conversion.fb_pixel_landing_page_view'];
  }

  // Filtra e soma todos os eventos correspondentes para maior precisão analítica
  const matchingActions = actions.filter(a => searchTypes.includes(a.action_type));
  return matchingActions.reduce((sum, act) => sum + parseFloat(act.value || '0'), 0);
}
