const token = "EAA4p5VrNw0gBRjoA19lgaBCtJhItLq14RUgXFVsGmGJKXP3ZCO4d1BPO3mFrvs9ZAXgdPLYcqZBdRPOje158yKaTEiXVXdlUqNZACYslJw9EWiJcRJdmJJT08wJXKOkOzYqXuTZAgoPEuodB1DHZBHFKvBrmRTgoDX4qIDAL6cqHI3iANTOfxOx6CmiI6X";
const accountId = "act_775254035944122";

async function test() {
  try {
    // 1. Busca os Ads e seus criativos
    console.log("Buscando ads da conta...");
    const adsUrl = `https://graph.facebook.com/v25.0/${accountId}/ads?fields=creative{id,name,object_type}&limit=10&access_token=${token}`;
    const adsRes = await fetch(adsUrl);
    const adsData = await adsRes.json();
    
    if (!adsData.data || adsData.data.length === 0) {
      console.log("Nenhum ad retornado na conta.");
      return;
    }
    
    // Filtra criativos de vídeo ou pega o primeiro
    const creative = adsData.data.map(ad => ad.creative).find(c => c && c.id);
    if (!creative) {
      console.log("Nenhum criativo válido nos ads.");
      return;
    }
    
    console.log(`Testando preview para o Creative ID: ${creative.id} (${creative.name})...`);
    
    // 2. Chama previews
    const previewUrl = `https://graph.facebook.com/v25.0/${creative.id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${token}`;
    const previewRes = await fetch(previewUrl);
    const previewData = await previewRes.json();
    
    console.log("Status do Preview:", previewRes.status);
    console.log("Resposta do Preview:");
    console.log(JSON.stringify(previewData, null, 2));
    
  } catch (e) {
    console.error("Erro geral no teste:", e);
  }
}

test();
