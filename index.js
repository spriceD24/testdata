const { log, error } = require('./plus_utils');
const url = require('url');
const {handlePDFDownloadRequest } = require('./get-pdf');
const {handlePDFTestDownloadRequest } = require('./get-pdf-test');
const {handleClearArticleRequest } = require('./clear-article');

import {
    degrees,
    PDFDocument,
    rgb
} from 'pdf-lib';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

export default {
    async fetch(request, env, ctx) {
        try {
            return await handleRequest(request, env, ctx);
        } catch (e) {
            return new Response(e.message);
        }
    },
};

async function handleRequest(event) {
	log('Routing Request');
	
  // Parse the request URL
	const parsedUrl = url.parse(event.request.url, true);
	// Get the pathname
	const pathname = parsedUrl.pathname;
	// Trim the pathname to remove leading and trailing slashes
	const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');
	log(`Routing Request to path ${trimmedPath}`);

	// Route the request to the appropriate handler function
	switch (trimmedPath) {
		case 'get-pdf':
		case 'pdfviewer':
		case 'shorturlpdf.html':
		case 'pdfviewer.html':
			return handlePDFDownloadRequest(event);
		case 'get-pdf-test':
			return handlePDFTestDownloadRequest(event);
		case 'clear-article':
			return handleClearArticleRequest(event);
		default:
			return notFound(event);
	}

}


// Handler functions for each route
function hello(event) {
  return new Response('Hello, World!');
}

function goodbye(event) {
  return new Response('Goodbye, World!');
}

function notFound(event) {
  return new Response('Sorry, no mapping found');
}
