const moment = require('moment');
const crypto = require('crypto');
const { DateTime } = require('luxon');
const ALLOWABLE_TIME_TO_LIVE_IN_SECONDS = 3600; //1 day
//const ALLOWABLE_TIME_TO_LIVE_IN_SECONDS = 120;   /2 mins
//const ALLOWABLE_TIME_TO_LIVE_IN_SECONDS = 2592000; //1 month
//const ALLOWABLE_TIME_TO_LIVE_IN_SECONDS = 7776000; //3 months
const DELIMITER = '/';
const algorithm = 'aes-128-cbc';
const key = Buffer.from('Q6G3378B45578B1m', 'utf8');
const iv = Buffer.from('4G18hpvnm547Q79x', 'utf8');
const CDN_CONTACT_ID = 'cdn_client';
const origin_key = Buffer.from('X9J279B34571j2sq', 'utf8');
const origin_iv = Buffer.from('4S22pnfgt326F78r', 'utf8');
const ALLOWED_ORIGINS = ['plus2-uat.credit-suisse.com', 'plus2-uat2.credit-suisse.com', 'plus2.credit-suisse.com'];
 

function log(text)
{
	const currentTime = new Date();
	console.log(moment().format('DD-MMM-yyyy hh:mm:ss.SSS'),text);
}


function error(text)
{
	const currentTime = new Date();
	console.log(moment().format('DD-MMM-yyyy hh:mm:ss.SSS'),text);
}


function getPDFCacheKey(documentID,format,referrer)
{
	var txt	= documentID+'/'+CDN_CONTACT_ID+'/'+format;
	log(`Txt for key is ${txt}`);
	var token = encryptOrigin(txt);
	log(`Token for key is ${token}`);
	var token = encodeURIComponent(token);
	log(`Encode Token for key is ${token}`);
  let domain = 'https://plus2-uat-web.credit-suisse.com';
  if(referrer && (referrer.includes('plus.credit-suisse.com') || referrer.includes('plus-cache.credit-suisse.com')))
  {
    domain = 'https://plus-web.credit-suisse.com';
  }
	const cacheKey = `${domain}/content/credit-suisse-research/getcloudflarepdf?token=${token}`;
	return cacheKey;
}

function getOriginURL(hostname, documentID,referrer)
{
	//add in checks for DEV, UAT and PROD by checking source URL
  let domain = 'https://plus2-uat-web.credit-suisse.com';
  if(referrer && referrer.includes('plus.credit-suisse.com'))
  {
    domain = 'https://plus2-web.credit-suisse.com';
  }
	return `${domain}/content/dam/credit-suisse-research/analyst-assets/${documentID}/${documentID}.pdf`;
}

function getRedirectURL(params,documentID,referrer)
{
	const documentType = params.get('DocumentType');
	const documentClick = params.get('documentClick');
	const authRequired = params.get('AuthRequired');
	const tagFormat = params.get('tagFormat');
	const isMobileView = params.get('isMobileView');
	log(`getRedirectURL referrer = ${referrer}`);
	//add in checks for DEV, UAT and PROD by checking source URL
  let domain = 'https://plus2-uat2.credit-suisse.com';
  if(referrer && referrer.includes('plus.credit-suisse.com'))
  {
    domain = 'https://plus2.credit-suisse.com';
  }
  if(referrer && referrer.includes('plus2-uat.credit-suisse.com'))
  {
    domain = 'https://plus2-uat.credit-suisse.com';
  }
  if(referrer && referrer.includes('localhost:3000'))
  {
    domain = 'https://localhost:3000';
  }
	return `${domain}/content/dam/credit-suisse-research/SearchPDF?DocumentID=${documentID}&DocumentType=Flash&documentClick=${documentClick}&AuthRequired=${authRequired}&tagFormat=${tagFormat}&isMobileView=${isMobileView}`
}

function getCDNMetaData(fullURI) {
  const metaData = {};
  console.log(`Full URI = ${fullURI}`);
  const decryptedURI = decrypt(fullURI);
  console.log(`Decrypted URI = ${decryptedURI}`);
  const consituents = decryptedURI.split(DELIMITER);
  console.log(`length is ${consituents.length}`);

  if (consituents.length >= 1) {
    metaData.timestampUTC = parseInt(consituents[0]);
  }
  if (consituents.length >= 2) {
    metaData.docID = parseInt(consituents[1]);
  }
  if (consituents.length >= 3) {
    metaData.contactID = consituents[2];
  }
  if (consituents.length >= 4) {
    metaData.authenticated = parseInt(consituents[3]);
  }
  if (consituents.length >= 5) {
    metaData.format = parseInt(consituents[4]);
  }

  return metaData;
}

function validateToken(token,documentID)
{
	log('Called validate token');
	const metaData = getCDNMetaData(token);	
	log(`Meta = ${JSON.stringify(metaData)}`);
    
    if (!metaData.docID) {
		log(`Missing Doc ID on token `);
		return new CDNTokenCheck(500, 'Missing Doc ID on token', metaData);
	}

    if (!metaData.timestampUTC) {
		log(`Missing Doc ID on token `);
		return new CDNTokenCheck(500, 'Missing Timestamp on token', metaData);
	}

    if (documentID && metaData.docID && documentID != metaData.docID) {
		log(`Doc ID on token ${metaData.docID}, does not match document ID in param ${documentID}`);
		return new CDNTokenCheck(500, 'Document IDs do not match', metaData);
	}
	
    if ((metaData.authenticated && metaData.authenticated === 1) && (metaData.contactID == null || metaData.contactID.trim().length === 0)) {
		console.log(`Authentication mismatch, no contact ID found`);
		return new CDNTokenCheck(500, 'Mismatch on authenitcation flags', metaData);
	}

    //now check if time on token has elapsed
	if(metaData.timestampUTC && metaData.timestampUTC > 0)
	{
		//first get time in UTC
		const currentTimeUTC = getCurrentUtcTime();
		const requestDateUTC = new Date(metaData.timestampUTC);
		const currentDateUTC = new Date(currentTimeUTC);

		log(`Checking current date ${currentDateUTC.toString()} long val = ${currentTimeUTC}, against URL date of ${requestDateUTC.toString()} request long = ${metaData.timestampUTC}`);
		if (currentTimeUTC - metaData.timestampUTC > ALLOWABLE_TIME_TO_LIVE_IN_SECONDS * 1000) {
		  log(`UTC timestamp on token ${metaData.timestampUTC} is past allowable threshold UTC now ${currentTimeUTC}`);
		  return new CDNTokenCheck(404, 'Link has expired', );
		}
	}
    //if auth required check contact ID exist
    //all looks good, download PDF
    //TBD add code to download PDF
    return new CDNTokenCheck(200, 'OK',metaData);	
}

class CDNTokenCheck {
  constructor(statusCode, status, consituents) {
    this.statusCode = statusCode;
    this.status = status;
    this.consituents = consituents;
  }

}

function getCurrentUtcTime() {
  // initialize d1 by using now() method of Luxon
  const d1 = DateTime.utc();
  // pass UTC date to the main method.
  return d1.toMillis();
}

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function encryptOrigin(text) {
  const cipher = crypto.createCipheriv(algorithm, origin_key, origin_iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decrypt(text) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(text, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getAllowableFrameDomains() {
  const cspValue = `frame-ancestors 'self' ${ALLOWED_ORIGINS.map(origin => `https://${origin}`).join(' ')}`;
  return cspValue;
}

function getAllowableOrigins() {
  return ALLOWED_ORIGINS;
}

module.exports = {
  log,
  error,
  getPDFCacheKey,
  getOriginURL,
  getRedirectURL,
  getCDNMetaData,
  validateToken,
  CDNTokenCheck,
  getCurrentUtcTime,
  getAllowableFrameDomains,
  getAllowableOrigins
};