const token = "EAA4p5VrNw0gBRjoA19lgaBCtJhItLq14RUgXFVsGmGJKXP3ZCO4d1BPO3mFrvs9ZAXgdPLYcqZBdRPOje158yKaTEiXVXdlUqNZACYslJw9EWiJcRJdmJJT08wJXKOkOzYqXuTZAgoPEuodB1DHZBHFKvBrmRTgoDX4qIDAL6cqHI3iANTOfxOx6CmiI6X";
const videoId = "1759445568340934";

async function test() {
  const versions = ['v25.0', 'v23.0', 'v22.0', 'v19.0'];
  for (const version of versions) {
    const url = `https://graph.facebook.com/${version}/${videoId}?fields=source,permalink_url,picture,thumbnails&access_token=${token}`;
    console.log(`Testando versão ${version}...`);
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Versão ${version} - Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      console.log('--------------------------------------------------');
    } catch (e) {
      console.error(`Erro na versão ${version}:`, e.message);
    }
  }
}

test();
