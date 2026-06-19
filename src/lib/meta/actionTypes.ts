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

  if (type === 'purchase') {
    // 'purchase' é o tipo canônico que o Meta Ads Manager exibe por padrão.
    // NÃO somamos 'offsite_conversion.fb_pixel_purchase' junto pois representa
    // os mesmos eventos em formato legado — somar os dois gera duplicação.
    const direct = actions.filter(a => a.action_type === 'purchase');
    if (direct.length > 0) {
      return direct.reduce((sum, act) => sum + parseFloat(act.value || '0'), 0);
    }
    // Fallback apenas para pixels antigos que não reportam 'purchase' diretamente
    const legacy = actions.filter(a => a.action_type === 'offsite_conversion.fb_pixel_purchase');
    return legacy.reduce((sum, act) => sum + parseFloat(act.value || '0'), 0);
  }

  let searchTypes = [type];
  if (type === 'add_to_cart') {
    searchTypes = ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart'];
  } else if (type === 'initiate_checkout') {
    searchTypes = ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'];
  } else if (type === 'view_content') {
    searchTypes = ['view_content', 'offsite_conversion.fb_pixel_view_content'];
  } else if (type === 'landing_page_view') {
    searchTypes = ['landing_page_view', 'offsite_conversion.fb_pixel_landing_page_view'];
  }

  return actions
    .filter(a => searchTypes.includes(a.action_type))
    .reduce((sum, act) => sum + parseFloat(act.value || '0'), 0);
}
