const { log, error, getOriginURL, getPDFCacheKey, getRedirectURL, validateToken, getAllowableFrameDomains, getAllowableOrigins } = require('./plus_utils');
const { degrees, PDFDocument, rgb, radians  } = require('pdf-lib');
module.exports = {
  handlePDFDownloadRequest,
};

async function handlePDFDownloadRequest(event) {
	
	log('Handling PDF request');

	const {
		searchParams,
	} = new URL(event.request.url);
	const documentID = searchParams.get('DocumentID');
	log(`Document ID - ${documentID}`);
	const referrer = event.request.headers.get('Referer');
	log(`Referrer - ${referrer}`);
	
	try{
		//if(!checkReferrer)
		const startPDFTask = Date.now();
		const token = searchParams.get('t');
		//if token is present check its valid, FYI this will not be optional once we have PLUS2 changes ready
		log(`Token - ${token}`);
		let contactID = searchParams.get('csr');
		const skipFrame = searchParams.get('skf');
		const skipToken = searchParams.get('skt');
		
		const allowableDomains = getAllowableOrigins();

		if (typeof skipFrame === 'undefined' || skipFrame === null || skipFrame == false) 
		{
			log('Checking referrer');

			const url = new URL(referrer);
			const domain = url.hostname;
			log(`Referrer Domain - ${domain}`);

			if(!validReferrer(domain,null, allowableDomains))	
			{
				log(`Invalid referrer ${domain}, redirecting`);
				return redirect(searchParams, documentID, null, referrer);
			}
		}	
			
		//temp for testing
		if(documentID == '1329203')
		{
			log('temp redirect for testing');
			return redirect(searchParams, documentID, null, referrer);
		}
		if (typeof skipToken === 'undefined' || skipToken === null) 
		{
			const cdnTokenCheck = validateToken(token,documentID);
			log(`cdnTokenCheck - ${JSON.stringify(cdnTokenCheck)}`);
			if(cdnTokenCheck.statusCode != 200)
			{
				log('Token check failed, redirecting');
				return redirect(searchParams, documentID, null, referrer);
			}else{
				contactID =cdnTokenCheck.consituents.contactID; 
			}
		}
		
		
		const watermarktext = 'Credit Suisse Report Tracking ID '+contactID;	
		const cacheKey = getPDFCacheKey(documentID,'pdf',referrer);
		
		//Temporary while waiting for cache fix
		const tmpCDN = getOriginURL(event.request.url,documentID,referrer);
		log(`Tmp CDN - ${tmpCDN}`);

		log(`cacheKey is ${cacheKey}`);
		
		//CDN Approach
		const startPDFDownload = Date.now();
		let response = await fetch(cacheKey);
		if(!response|| !response.ok)
		{
		  log(`First PDF retrieval from CDN failed for ${documentID}, attempting alternate route`);
		  response = await fetch(tmpCDN);		  
		}else{
			log(`First PDF retrieval from CDN succeeded for ${documentID}`);
		}
		

		let status = response ? response.status : 'unknown';
		let statusText = response ? response.statusText : 'unknown';
		let contentType = response ? response.headers.get('content-type') : 'unknown';
		let contentLength = response ? response.headers.get('content-length') : 'unknown';
		let cacheStatus = response ? response.headers.get('cf-cache-status') : 'unknown';
		if(!response|| !response.ok)
		{
		  log(`PDF retrieval from CDN failed for ${documentID} with status ${status} (${statusText}), content type ${contentType}, and content length ${contentLength}`);
		  return redirect(searchParams, documentID,referrer);
		}else{
		  log(`PDF retrieval from CDN SUCCEEDED, for ${documentID} with cacheStatus ${cacheStatus}, HTTP status ${status} (${statusText}), content type ${contentType}, and content length ${contentLength}`);
		}
		const cdnHeaders = response.headers;
		const headers = new Headers(cdnHeaders);
		
		const pdfBuffer = await response.arrayBuffer();		
		const pdfDoc = await PDFDocument.load(pdfBuffer, {
			ignoreEncryption: true
		});
		const watermarkStart = Date.now();
		const elapsedPDFDownload = watermarkStart - startPDFDownload;
		log(`PDF Retrieval and Preparation Took ${elapsedPDFDownload} ms for ${documentID}`);
		const pages = pdfDoc.getPages();
		log(`Started watermarking ${documentID}`);
		const { width, height } = pages[0].getSize();
		const angle = Math.atan2(height, width);
		const coordinates = calculateWatermarkPos(height, width, contactID);
		//const colorVal = rgb(0.9, 0.9, 0.9);
		const colorVal = rgb(0.98, 0.98, 0.98);
		const radiansVal = radians(angle);
		const fontSize = 36;
	
		await Promise.all(
		pages.map(async (page, idx) => {
		  //log(`${idx + 1} watermark - ${documentID}`);
		  await watermarkPage(page, contactID, watermarktext, {
			width,
			height,
			angle,
			coordinates,
			colorVal,
			radiansVal,
			fontSize
		  });
		})
		);
		const fileDownloadPrep = Date.now();
		const elapsedWatermark = fileDownloadPrep - watermarkStart;
		log(`Watermarking Took ${elapsedWatermark} ms for ${documentID}`);
	
		log(`Finished watermarking ${documentID}`);

		log(`Saving file ${documentID}`);
		const pdfBytes = await pdfDoc.save();
		log(`Sending response ${documentID}`);
		const rawBytes = searchParams.get('raw');
		const cspValue = getAllowableFrameDomains();
		
		headers.set('Content-Security-Policy', cspValue);
		headers.set('Access-Control-Allow-Origin', "*");
		headers.set('Access-Control-Allow-Methods', "GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH");
		headers.set('Access-Control-Allow-Headers', "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization");
		
		if (rawBytes && rawBytes === 'true') {
			headers['Content-Type'] = 'application/octet-stream';
			headers['Content-Disposition'] = 'attachment; filename=example.pdf';
		}
		response = new Response(pdfBytes, {
			headers
		})
		const elapsedFileDownloadPrep = Date.now() - fileDownloadPrep;
		const elapsedAll = Date.now() - startPDFTask;
		log(`FileDownload Prep Took ${elapsedAll} ms for ${documentID}`);
		log(`Entire Process Took ${elapsedAll} ms for ${documentID}`);
		return response;
	}catch(err)
	{
		error(err);
		log(`Error during final watermarking - performing redirect`);
		return redirect(searchParams, documentID, err,referrer);
	}
}

const watermarkPage = async (page, contactID, watermarktext, { width, height, angle, coordinates, colorVal, radiansVal, fontSize}) => {
  page.drawText(watermarktext, {
    x: coordinates.x,
    y: coordinates.y,
    size: coordinates.textSize,
    color: colorVal,
    rotate: radiansVal,
    blendMode: 'Multiply',
	size: fontSize
  });
};

function rgba(r, g, b, a) {
	const color = rgb(r, g, b);
	color[3] = a;
	return color;
}

function redirect(params, documentID, err,referrer) {
	const noredirect = params.get('noredirect');
	if(noredirect && noredirect == "true")
	{
		log(`Returning direct error page`);
		const headers = {
			'Content-Type': 'text/plain',
			'Cache-Control':'no-cache, no-store, must-revalidate',
			'Pragma':'no-cache',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH',
			'Access-Control-Allow-Headers': 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization'
		}
		response = new Response(`Error: ${err.stack}`, {
			headers
		})
	
		return response;
	}	
	const redirect = getRedirectURL(params, documentID,referrer);
	log(`Redirecting to ${redirect}`);
	return Response.redirect(redirect, 301);
}


function calculateWatermarkPos(pageWidth, pageHeight, dynamicText)
{
	//TODO add in check on page width+height as we might need different rations for different sizes
	const coordinates = {};
	let x_Ratio = 100;
	let textSize = 20;
	const x_AdjustmentFactor = 15;
			
	var number10Digits = Math.floor(dynamicText.length / 10)
	//is there a chance of truncation of text?
	if(number10Digits > 0)
	{
		if(number10Digits >= 3)
		{
			//if getting big adjust font size 
			textSize = textSize - number10Digits;
			//and slightly shift text
			x_Ratio = x_Ratio - (number10Digits * x_AdjustmentFactor)
		}else{
			//shift text
			x_Ratio = x_Ratio - ((number10Digits * 2) * x_AdjustmentFactor)
		}
	}
	
    log(`dynamicText ${dynamicText}, len ${dynamicText.length}, number10Digits ${number10Digits}, x_Ratio ${x_Ratio}, textSize ${textSize}`);
	
	const y_Ratio = x_Ratio * 1.43;
	coordinates.x = x_Ratio;
	coordinates.y = y_Ratio;
	coordinates.textSize = textSize;
	return coordinates;
}

function validReferrer(referrer, ip, validDomains)
{
	//const isFromSpecificIpRange = isReferrerFromIpRange(req, '192.168.0.*');

	let validIP = false;
	const isReferrerValid = validDomains.includes(referrer);
	log(`isReferrerValid ${isReferrerValid}`);
	if(!isReferrerValid)
	{
		validIP = false;
		//let validIP = isReferrerFromIpRange(req, '198.*')
		log(`ip ${ip}, validIP ${validIP}`);
		return validIP;
	}
	return isReferrerValid;
}