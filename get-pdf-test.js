const { log, error, getOriginURL, getPDFCacheKey, getRedirectURL, validateToken } = require('./plus_utils');
const {CloudflareCache } = require('./cache');
const { degrees, PDFDocument, rgb, radians  } = require('pdf-lib');
module.exports = {
  handlePDFTestDownloadRequest,
};
async function handlePDFTestDownloadRequest(event) {
	const { searchParams } = new URL(event.request.url);
	const documentID = searchParams.get('DocumentID');
	log(`Document ID - ${documentID}`);
  
	try {
	  //const redirectURL = `https://plus2-uat-web.credit-suisse.com/content/dam/credit-suisse-research/SearchPDF?DocumentID=1330126&DocumentType=Flash&documentClick=true&AuthRequired=false&tagFormat=PDF&isMobileView=false`; 
	  //const redirectURL = `https://plus2-uat2.credit-suisse.com/content/dam/credit-suisse-research/SearchPDF?DocumentID=1330126&DocumentType=Flash&documentClick=true&AuthRequired=false&tagFormat=PDF&isMobileView=false`; 

	  //https://plus2-uat-cache.credit-suisse.com/pdfviewer.html?DocumentID=1047733

	  //forward request to this URL
	  log(`Calling URL`);
		
	  /*
	  const response = await fetch(redirectURL);

    // Get the response body as a buffer
    const arrayBuffer = await response.arrayBuffer();
	const byteLength = arrayBuffer.byteLength;
	log(`PDF size: ${byteLength} bytes`);

    // Set the headers in the response to be the same as the response received from the fetch call
    const headers = {};
    response.headers.forEach((value, name) => {
		log(`Res Header - ${name}: ${value}`);
      headers[name] = value;
    });

    return new Response(arrayBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });*/
	const headers = {
		'Content-Type': 'application/pdf',
		//'Cache-Control':'no-cache, no-store, must-revalidate',
		//'Pragma':'no-cache',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH',
		'Access-Control-Allow-Headers': 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization'
	}	
	return Response.redirect( "https://plus2-uat-cache.credit-suisse.com/pdfviewer.html?DocumentID=1047733", 
	{
		status: 301,
		headers: headers
	  });

	}catch(err)
	{
		error(err);
		log(`Error during final watermarking - performing redirect`);
	}
  }

