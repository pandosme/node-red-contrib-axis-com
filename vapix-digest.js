//Copyright (c) 2021-2022 Fred Juhlin

const xml2js = require('xml2js');
const got = require("got");
const digestAuth = require("@mreal/digest-auth");
const FormData = require("form-data");

var exports = module.exports = {};

exports.HTTP_Get_No_digest = function( device, path, resonseType, callback ) {
	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address + path;
	(async () => {
		try {
			const response = await got( url,{
				responseType: resonseType,
				https:{rejectUnauthorized: false}
			});
			callback(false, response.body );
		} catch (error) {
			callback( true, {
				statusCode: error && error.response ? error.response.statusCode:0,
				statusMessage: error && error.response ? error.response.statusMessage:"Unkown error",
				body: error && error.response ? error.response.body:""
			} );
		}
	})();
}

exports.HTTP_Get = function( device, path, responseType, callback ) {
	
	if( !device || !device.hasOwnProperty("address") || !device.hasOwnProperty("user") || !device.hasOwnProperty("password") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing address, user or password"
		});
		return;
	}
	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address + path;

	var client = got.extend({
		hooks:{
			afterResponse: [
				(res, retry) => {
					const options = res.request.options;
					const digestHeader = res.headers["www-authenticate"];
					if (!digestHeader){
//						console.error("Response contains no digest header");
						return res;
					}
					const incomingDigest = digestAuth.ClientDigestAuth.analyze(	digestHeader );
					const digest = digestAuth.ClientDigestAuth.generateProtectionAuth( incomingDigest, device.user, device.password,{
						method: options.method,
						uri: options.url.pathname,
						counter: 1
					});
					options.headers.authorization = digest.raw;
					return retry(options);
				}
			]
		}
	});
	(async () => {
		const data = await client.get( url,{
				responseType: responseType,
				https:{rejectUnauthorized: false}
		})
		.then( response => {
			var resolve = Promise.resolve( response.body );
			callback( false, response && response.body? response.body:"" );
			return resolve;
		})
		.catch(err => {
			var resolve = Promise.resolve( err );
			var errorObject = {
				statusCode: err && err.response ? err.response.statusCode:0,
				statusMessage: err && err.response ? err.response.statusMessage:"Unkown error",
				body: err && err.response ? err.response.body:""
			};
			callback( true, errorObject );
			return resolve;
		});
	})();
}

exports.HTTP_Post = function( device, path, body, responseType, callback ) {

	if( !device || !device.hasOwnProperty("address") || !device.hasOwnProperty("user") || !device.hasOwnProperty("password") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing address, user or password"
		});
		return;
	}

	if(!body) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing post body"
		});
		return;
	}

	var json = null;
	if( typeof body === "object" )
		json = body;
	if( typeof body === "string" && (body[0]==='{' || body[0]==='[' ))
		json = JSON.parse( body );

	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address + path;
//	console.log("Digest POST:", url, body, responseType );
	var client = got.extend({
		hooks:{
			afterResponse: [
				(res, retry) => {
					const options = res.request.options;
					const digestHeader = res.headers["www-authenticate"];
					if (!digestHeader){
//						console.error("Response contains no digest header");
						return res;
					}
					const incomingDigest = digestAuth.ClientDigestAuth.analyze(	digestHeader );
					const digest = digestAuth.ClientDigestAuth.generateProtectionAuth( incomingDigest, device.user, device.password,{
						method: options.method,
						uri: options.url.pathname,
						counter: 1
					});
					options.headers.authorization = digest.raw;
					return retry(options);
				}
			]
		}
	});

	(async () => {
		try {
			var response = 0;
			if( json )
				response = await client.post( url, {
												json: json,
												responseType: 'json',
												https: {rejectUnauthorized: false}
											});
			else
				response = await client.post( url, {
												body: body,
												responseType: responseType,
												https: {rejectUnauthorized: false}
											});
//			console.log("axis-digest:HTTP_Get: Response false",response.body);
			callback(false, response.body );
		} catch (error) {
			callback(true, {
				statusCode: error && error.response ? error.response.statusCode:0,
				statusMessage: error && error.response ? error.response.statusMessage:"Unkown error",
				body: error && error.response ? error.response.body:""
			});
		}
	})();
}

exports.HTTP_Put = function( device, path, body, responseType, callback ) {
	if( !device || !device.hasOwnProperty("address") || !device.hasOwnProperty("user") || !device.hasOwnProperty("password") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing address, user or password"
		});
		return;
	}

	if(!body) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing put body"
		});
		return;
	}

	var json = null;
	if( typeof body === "object" )
		json = body;
	if( typeof body === "string" && (body[0]==='{' || body[0]==='[' ))
		json = JSON.parse( body );

	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address + path;
//	console.log("Digest POST:", url, body, responseType );
	var client = got.extend({
		hooks:{
			afterResponse: [
				(res, retry) => {
					const options = res.request.options;
					const digestHeader = res.headers["www-authenticate"];
					if (!digestHeader){
//						console.error("Response contains no digest header");
						return res;
					}
					const incomingDigest = digestAuth.ClientDigestAuth.analyze(	digestHeader );
					const digest = digestAuth.ClientDigestAuth.generateProtectionAuth( incomingDigest, device.user, device.password,{
						method: options.method,
						uri: options.url.pathname,
						counter: 1
					});
					options.headers.authorization = digest.raw;
					return retry(options);
				}
			]
		}
	});

	(async () => {
		try {
			var response = 0;
			if( json )
				response = await client.put( url, {
												json: json,
												responseType: 'json',
												https: {rejectUnauthorized: false}
											});
			else
				response = await client.put( url, {
												body: body,
												responseType: responseType,
												https: {rejectUnauthorized: false}
											});

//			console.log("Digest Post Response:", url, response.body);
			callback(false, response.body );
		} catch (error) {
			callback(true, {
				statusCode: error && error.response ? error.response.statusCode:0,
				statusMessage: error && error.response ? error.response.statusMessage:"Unkown error",
				body: error && error.response ? error.response.body:""
			});
		}
	})();
}

exports.HTTP_Patch = function( device, path, body, responseType, callback ) {
	if( !device || !device.hasOwnProperty("address") || !device.hasOwnProperty("user") || !device.hasOwnProperty("password") ) {
			callback("Invalid input","Missing address,user or password");
			return;
	}

	if(!body) {
		callback("Invalid input", "Missing POST body");
		return;
	}

	var json = null;
	if( typeof body === "object" )
		json = body;
	if( typeof body === "string" && (body[0]==='{' || body[0]==='[' ))
		json = JSON.parse( body );

	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address + path;
//	console.log("Digest POST:", url, body, responseType );
	var client = got.extend({
		hooks:{
			afterResponse: [
				(res, retry) => {
					const options = res.request.options;
					const digestHeader = res.headers["www-authenticate"];
					if (!digestHeader){
//						console.error("Response contains no digest header");
						return res;
					}
					const incomingDigest = digestAuth.ClientDigestAuth.analyze(	digestHeader );
					const digest = digestAuth.ClientDigestAuth.generateProtectionAuth( incomingDigest, device.user, device.password,{
						method: options.method,
						uri: options.url.pathname,
						counter: 1
					});
					options.headers.authorization = digest.raw;
					return retry(options);
				}
			]
		}
	});

	(async () => {
		try {
			var response = 0;
			if( json )
				response = await client.patch( url, {
												json: json,
												responseType: 'json',
												https: {rejectUnauthorized: false}
											});
			else
				response = await client.patch( url, {
												body: body,
												responseType: responseType,
												https: {rejectUnauthorized: false}
											});

//			console.log("Digest Post Response:", url, response.body);
			callback(false, response.body );
		} catch (error) {
			callback(true, {
				statusCode: error && error.response ? error.response.statusCode:0,
				statusMessage: error && error.response ? error.response.statusMessage:"Unkown error",
				body: error && error.response ? error.response.body:""
			});
		}
	})();
}

exports.Soap = function( device, body, callback ) {
	if(!body || body.length < 20 ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "SOAP body is missing"
		});
		return;
	}
	
	var soapEnvelope = '<SOAP-ENV:Envelope ' +
	                   'xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" '+
					   'xmlns:xs="http://www.w3.org/2001/XMLSchema" '+
					   'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
					   'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '+
					   'xmlns:tt="http://www.onvif.org/ver10/schema" '+
					   'xmlns:onvif="http://www.onvif.org/ver10/schema" '+
					   'xmlns:tds="http://www.onvif.org/ver10/device/wsdl" '+
					   'xmlns:tev="http://www.onvif.org/ver10/event/wsdl" '+
					   'xmlns:tns1="http://www.onvif.org/ver10/topics" ' +
					   'xmlns:acertificates="http://www.axis.com/vapix/ws/certificates" '+
					   'xmlns:acert="http://www.axis.com/vapix/ws/cert" '+
					   'xmlns:aev="http://www.axis.com/vapix/ws/event1" ' +
					   'xmlns:aweb="http://www.axis.com/vapix/ws/webserver" '+
					   'xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope">\n';

	soapEnvelope += '<SOAP-ENV:Body>' + body + '</SOAP-ENV:Body>\n';
	soapEnvelope += '</SOAP-ENV:Envelope>\n';
	exports.HTTP_Post( device, '/vapix/services', soapEnvelope,"text", function( error, response) {
		callback(error,response);
	});
}

exports.upload = function( device, type, filename, options, buffer, callback ) {
//	console.log("vapix-digest.upload:", type,options);
	if( !device || !device.hasOwnProperty("address") || !device.hasOwnProperty("user") || !device.hasOwnProperty("password") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing address, user or password"
		});
		return;
	}
	
	if( !type || !(type === "firmware" || type === "firmware_legacy" || type === "acap" || type === "acap_legacy" || type === "overlay" ) ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: type + " is not a valid upload type"
		});
		return;
	}
	
	
	var protocol = device.protocol || "http";
	var url = protocol + "://" + device.address;


	if(!buffer || Buffer.isBuffer(buffer) !== true ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Data is not a buffer"
		});
		return;
	}
//console.log("vapix-digest: Uploading starting");
	var formData = {
		apiVersion: "1.0",
		context: "nodered",
		method: ""
	}

	var part1 = null;
	var part2 = null;
	var contenttype = "application/octet-stream";

	switch( type ) {
		case "firmware":
			url +=  '/axis-cgi/firmwaremanagement.cgi';
			part1 = "data";
			part2 = "fileData";
			formData.method = "upgrade";
			contenttype = "application/octet-stream";
		break;

		case "firmware_legacy":
			url +=  '/axis-cgi/firmwareupgrade.cgi?type=normal';
			part1 = null;
			part2 = "fileData";
			contenttype = "application/octet-stream";
		break;

		case "acap":
			url += "/axis-cgi/packagemanager.cgi";
			part1 = "data";
			part2 = "fileData";
			formData.method = "install";
			contenttype = "application/octet-stream";
		break;

		case "acap_legacy":
			url += "/axis-cgi/applications/upload.cgi";
			part1 = null;
			part2 = "packfil";
			contenttype = "application/octet-stream";
		break;

		case "overlay":
			if( !filename || typeof filename !== "string" || filename.length === 0 ) {
				callback(true,{
					statusCode: 400,
					statusMessage: "Invalid input",
					body: "Overlay must have a filename"
				});
				return;
			}

			url += '/axis-cgi/uploadoverlayimage.cgi';
			part1 = "json";
			part2 = "image";
			formData.method = "uploadOverlayImage";
			formData.params = {
				scaleToResolution:true
			}
			if( options && options.hasOwnProperty("scale") && options.scale )
				formData.params.scaleToResolution = options.scale;
			if( options && options.hasOwnProperty("alpha")  )
				formData.params.alpha = options.alpha;
			contenttype = "image/" + filename.split(".")[1];
		break;
		default:
			callback(true,"Invalidy upload type");
			return;
	}

	var formJSON = JSON.stringify(formData);
	var client = got.extend({
		hooks:{
			afterResponse: [
				(res, retry) => {
					const options = res.request.options;
					const digestHeader = res.headers["www-authenticate"];
					if (!digestHeader){
//						console.error("Response contains no digest header");
						return res;
					}
					const incomingDigest = digestAuth.ClientDigestAuth.analyze(	digestHeader );
					const digest = digestAuth.ClientDigestAuth.generateProtectionAuth( incomingDigest, device.user, device.password,{
						method: options.method,
						uri: options.url.pathname,
						counter: 1
					});

					const form = new FormData();
					if( part1 ) {
						form.append(
							part1,
							formJSON,
							{
								filename: "blob",
								contentType: "application/json",
							}
						);
					};
					if( part2 ) {
						form.append(
							part2,
							buffer,
							{
								filename: filename,
								contentType: contenttype
							}
						);
					};
					options.headers = form.getHeaders();
					options.headers.authorization = digest.raw;
					options.body = form;
					return retry(options);
				}
			]
		}
	});

	(async () => {
		try {
			const response = await client.post(url, {
				https:{rejectUnauthorized: false}
			});
//			console.log("AxisDigest Upload Response", response.body);
			if( typeof response.body === "string" && ( response.body[0] === '{' || response.body[0] === '[' ) ) {
				var json = JSON.parse( response.body );
				if( json ) {
					callback(false, json );
					return;
				}
			}
			callback(false, response.body );
		} catch (error) {
			callback(true, {
				statusCode: error && error.response ? error.response.statusCode:0,
				statusMessage: error && error.response ? error.response.statusMessage:"Unkown error",
				body: error && error.response ? error.response.body:""
			});
		}
	})();
}
