const { log, getPDFCacheKey, getOriginURL } = require('./plus_utils');
const { CloudflareCache } = require('./cache');
const fetch = require('node-fetch');

const zoneKey = '78ffe3069e7b83051360c95794603a0e';
const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneKey}/purge_cache`;
const authKey = 'Bearer mPZA2sEOIb8gguJ_m5CsWhiAXf42rUP2GFYYDk5S';

module.exports = {
  handleClearArticleRequest,
};

async function handleClearArticleRequest(event) {
	const cloudflareCache = new CloudflareCache(caches.default);
  
	const { searchParams } = new URL(event.request.url);
	const documentID = searchParams.get('DocumentID');
	const referrer = event.request.headers.get('Referer');
	log(`Referrer - ${referrer}`);
	log(`Handling Clear article request ${documentID}`);
  
	const host = event.request.headers.get('Host');
	const domain = host.split(':')[0]; // Remove port number if any
	log(`Domain - ${domain}`);

	const cacheKey = getPDFCacheKey(documentID, 'pdf', domain);
	//const tmpCDN = getOriginURL(event.request.url, documentID, referrer);
	//log(`Tmp CDN - ${tmpCDN}`);
	log(`cacheKey is ${cacheKey}`);
  
	try {
	  //const jsonResponse = await callApi(cacheKey, tmpCDN);
	  const jsonResponse = await callApi(cacheKey);
	  log(`Response: ${jsonResponse}`);
  
	  return new Response(JSON.stringify(jsonResponse), {
		headers: { 'Content-Type': 'application/json' },
	  });
	} catch (error) {
	  log(error);
	}
  }
  

  async function callApi(url1, url2) {
	log(`apiUrl: ${apiUrl}`);
	const response = await fetch(apiUrl, {
	  method: 'POST',
	  headers: {
		'Authorization': 'Bearer mPZA2sEOIb8gguJ_m5CsWhiAXf42rUP2GFYYDk5S',
		'Content-Type': authKey,
	  },
	  body: JSON.stringify({ files: [url1, url2] }),
	});
	const jsonResponse = await response.json();
	log(`Response: ${JSON.stringify(jsonResponse)}`);
	return jsonResponse;
  }
  