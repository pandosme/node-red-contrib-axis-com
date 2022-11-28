//Copyright (c) 2021-2022 Fred Juhlin

const fs = require("fs");
const VapixDigest = require("./vapix-digest.js");
const VapixParser = require("./vapix-parser.js");

var exports = module.exports = {};

exports.HTTP_Get = function( device, cgi, responseType, callback ) {
	VapixDigest.HTTP_Get( device, cgi, responseType, function( error, body ) {
		callback( error, body );
	});
}

exports.HTTP_Post = function( device, cgi, payload, responseType, callback ) {
	VapixDigest.HTTP_Post( device, cgi, payload, responseType, function( error, body ) {
		if( error ) {
			callback(error,body);
			return;
		}
		try {
			body = JSON.parse(body);
		} catch {
		}
		callback( error, body );
	});
}

exports.HTTP_Put = function( device, cgi, payload, responseType, callback ) {
	VapixDigest.HTTP_Put( device, cgi, payload, responseType, function( error, body ) {
		callback( error, body );
	});
}

exports.HTTP_Patch = function( device, cgi, payload, responseType, callback ) {
	VapixDigest.HTTP_Patch( device, cgi, payload, responseType, function( error, body ) {
		callback( error, body );
	});
}

exports.SOAP = function( device, soapBody, callback ) {
	VapixDigest.Soap( device, soapBody, function( error, body ) {
		if( error ) {
			callback( error, body );
			return;
		}
		VapixParser.SoapParser( body, function(error,data){
			callback( error, data );
		});
	});
}

exports.CGI = function( device, cgi, callback ) {
	VapixDigest.HTTP_Get( device, cgi, "text", function( error, body ) {
		if(error) {
			callback(error,body);
			return;
		}
		if( body.search("Error") >= 0 ) {
			callback( true, {
				statusCode: 500,
				statusMessage: "Error",
				body: body
			});
			return;
		}
		callback( error, body );
	});
}

exports.CGI_Post = function( device, cgi, request, callback ) {
	VapixDigest.HTTP_Post( device, cgi, request, "json", function( error, body ) {
		if( error ) {
			callback(error,body);
			return;
		}
		callback( error, body );
	});
}

exports.JPEG = function( device, profile, callback ) {
	VapixDigest.HTTP_Get( device, '/axis-cgi/jpg/image.cgi?' + profile, "buffer", function( error, body ) {
		callback( error, body );
	});
}

exports.Param_Get = function( device, paramPath, callback ) {
	if( !paramPath || paramPath.length === 0 || paramPath.toLowerCase ( ) === "root" ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: paramPath + " is not valid"
		});
		return;
	}
	exports.HTTP_Get( device, '/axis-cgi/param.cgi?action=list&group=' + paramPath, "text", function( error, body ) {
		if( error ) {
			callback( error, body );
			return;
		}
		callback( false, VapixParser.param2json(body) );
	});
}

exports.Param_Set = function( device, group, parameters, callback ) {
	if( !group || group.length == 0 ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing parameter group"
		});
		return;
	}

	if( !parameters || !(typeof parameters === 'object') ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing parameters must be an object"
		});
		return;
	}
	var cgi = '/axis-cgi/param.cgi?action=update';
	for( var parameter in parameters ) {
		var value = parameters[parameter];
		if( value === true )
			value = 'yes';
		if( value === false )
			value = 'no'
		if(  typeof parameters[parameter] === 'object' ) {
			//Don't update sub groups 
		} else {
			cgi += '&root.' + group + '.' + parameter + '=' + encodeURIComponent(value);
		}
	}
	
	exports.CGI( device, cgi, function( error, body ) {
		if( error ) {
			callback( error, body );
			return;
		}
		callback( false, body );
	});
}

exports.DeviceInfo = function( device, callback ) {
	var info = {};

	exports.Param_Get( device, "brand", function( error, response ) {
		if( error ) {
			callback( error, response );
			return;
		}

		info.model = response.ProdNbr || "";
		info.type = response.ProdType || "";

		exports.Param_Get( device, "network", function( error, response ) {
			if( error ) {
				callback( error, response );
				return;
			}
			info.hostname = response.HostName || "";
			info.hostname = response.VolatileHostName.HostName || info.hostname;
			if( response.hasOwnProperty("eth0") ) {
				info.IPv4 = response.eth0.IPAddress || "";
				info.IPv6 = response.eth0.IPv6.IPAddresses || "";
				info.mac = response.eth0.MACAddress || "";
				exports.Param_Get( device, "properties", function( error, response ) {
					if( error ) {
						callback( error, response );
						return;
					}
					info.firmware = response.Firmware && response.Firmware.Version ? response.Firmware.Version:""; 
					info.camera = response.Image && response.Image.Format ? true: false;
					info.audio = response.Audio && response.Audio.Audio ? true: false;
					info.serial = response.System && response.System.SerialNumber ? response.System.SerialNumber : "";
					info.platform = response.System && response.System.Architecture ? response.System.Architecture:"";
					if( response.System && response.System.hasOwnProperty("Soc") ) {
						var items = response.System.Soc.split(' ');
						if( items.length > 1 )
							info.chipset = items[1];
						else
							info.chipset = response.System.Soc;
					}
					info.hardware = response.System && response.System.HardwareID ? response.System.HardwareID:"";
					callback(false,info);
				});
			}
		});
	});
}

exports.Syslog = function( device, callback ) {
	VapixDigest.HTTP_Get( device, '/axis-cgi/systemlog.cgi', "text", function(error, response) {
		if( error ) {
			callback( error, response );
			return;
		}
		var list = VapixParser.Syslog2List( response );
		callback( false, list );
	});
}

exports.GetTime = function( device, callback ) {
	var body = {
		"apiVersion": "1.0",
		"context": "NodeRed",
		"method": "getDateTimeInfo"
	};
	exports.CGI_Post( device, "/axis-cgi/time.cgi", body, function(error, response ) {
		callback( error, response );
	});
}

exports.Connections = function( device, callback ) {
	exports.CGI( device, '/axis-cgi/admin/connection_list.cgi?action=get', function(error, response) {
		if( error ) {
			callback( error, response );
			return;
		}
		var rows = response.split('\n');
		var list = [];
		for( var i = 1; i < rows.length; i++) {
			var row = rows[i].trim();
			row = row.replace(/\s{2,}/g, ' ');
			if( row.length > 10 ) {
				var items = row.split(' ');
				var ip = items[0].split('.');
				if( ip != '127' ) {
					list.push({
						address: items[0],
						protocol: items[1],
						port: items[2],
						service: items[3].split('/')[1]
					})
				}
			}
		}
		callback( false, list );
	});
}

exports.Location_Get = function( device, callback ) {
	exports.CGI( device, '/axis-cgi/geolocation/get.cgi', function(error, response) {
		if( error ) {
			callback( error, response );
			return;
		}
		VapixParser.Location( response, function(error, data ) {
			callback( error, data );
		});
	});
}

exports.Location_Set = function( device, data, callback ) {
	var location = data;
	if( typeof data === "string" && data[0] === '{')
		location = JSON.parse(data);

	if( !location || 
	    !location.hasOwnProperty("longitude") ||
		!location.hasOwnProperty("latitude") ||
		!location.hasOwnProperty("direction") ||
		!location.hasOwnProperty("text") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing longitude, latitude, direction or text"
		});
		return;	
	}
	var cgi = "/axis-cgi/geolocation/set.cgi?";
	latSign = "";
	if( location.latitude < 0 ) {
		location.latitude = -location.latitude;
		latSign = "-";
	}
	var latInt = parseInt(location.latitude);
	var latZ = "";
	if( latInt < 10 )
		latZ = "0";

	lngSign = "";
	if( location.longitude < 0 ) {
		location.longitude = -location.longitude;
		lngSign = "-";
	}
	var lngInt = parseInt(location.longitude);	
	var lngZ = "00";
	if( lngInt >= 10 )
		lngZ = "0";
	if( lngInt >= 100 )
		lngZ = "";
	
	cgi += "lat=" + latSign + latZ + parseFloat(location.latitude).toFixed(8);
	cgi += "&lng=" + lngSign + lngZ + parseFloat(location.longitude).toFixed(8);
	cgi += "&heading=" + location.direction;
	cgi += "&text=" + encodeURIComponent(location.text);
	exports.CGI( device, cgi, function(error, response) {
		if( error ) {
			callback( error, response );
			return;
		}
		if(  response.search("Success") > 0 ) {
			callback(false,"OK");
			return;
		}
		callback(true, response);
	});
}

exports.ACAP_List = function( device, callback ) {
	exports.CGI( device, '/axis-cgi/applications/list.cgi', function(error, response) {
		if( error ) {
			callback( error, response );
			return;
		}
		VapixParser.AcapList2JSON(response, function(error, data) {
			callback( error, data );
		});
	});
}

exports.ACAP_Control = function( device, action, acapID, callback ) {

	if( !action || action.length == 0 ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing action"
		});
		return;
	}
	
	if( !acapID || acapID.length == 0 || acapID.length > 20 ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing ACAP package name/id"
		});
		return;
	}
	
	var cgi =  '/axis-cgi/applications/control.cgi?action=' + action + '&package=' + acapID;
	VapixDigest.HTTP_Get( device, cgi, "text", function( error, response ) {
		if( error ) {
			callback( error, response );
			return;
		}
		response = response.trim();
		switch( response ) {
			case "OK":
			case "Error: 6":  //Application is already running
			case "Error: 7":  //Application is not running
				callback( false, "OK");
			break;
			case "Error: 4":
				callback(true,{
					statusCode: 400,
					statusMessage: "Invalid ACAP",
					body: response
				});
			break;
			default:
				callback(true,{
					statusCode: 400,
					statusMessage: "Unknown response",
					body: response
				});
			break;
		}
	});

}

exports.Account_List = function( device, callback) {

	exports.CGI( device, '/axis-cgi/pwdgrp.cgi?action=get', function( error, response ) {
		if( error ) {
			callback( true, response );
			return;
		}
		VapixParser.Accounts2JSON( response, function( error, json ) {
			callback(error,json);
		});
	});
};

exports.Account_Set = function( device, options, callback) {

	if( !options ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing account data"
		});
		return;
	}
	if( typeof options !== "string" && typeof options !== "object" ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing account data"
		});
		return;
	}
	account = options;
	if( typeof account === "string" )
		account = JSON.parse(account);
	
	if( !account || !account.hasOwnProperty("name") || !account.hasOwnProperty("privileges") || !account.hasOwnProperty("password") ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing account name, priviliges or passoword"
		});
		return;
	}

	var cgi = '/axis-cgi/pwdgrp.cgi?action=update&user=' + account.name + '&pwd=' + encodeURIComponent(account.password);
	VapixDigest.HTTP_Get( device, cgi, "text", function( error, response ) {
		if( !error && response.search("Error") < 0 ) {
			callback(false,response);
			return;
		}

		if( account.name === "root" ) {  //Try generate root account for the first time
			cgi = '/axis-cgi/pwdgrp.cgi?action=add&user=root&pwd=' + encodeURIComponent(account.password) + '&grp=root&sgrp=admin:operator:viewer:ptz';
			VapixDigest.HTTP_Get_No_digest( device, cgi, "text", function(error, response ) {
				callback( error, response );
			});
			return;
		}
		
		var sgrp = "viewer";
		if( account.privileges.toLowerCase() === "viewer" || account.privileges.toLowerCase() === "player" )
			sgrp = "viewer";
		if( account.privileges.toLowerCase() === "operator" || account.privileges.toLowerCase() === "client" )
			sgrp = "viewer:operator:ptz";
		if( account.privileges.toLowerCase() === "admin" || account.privileges.toLowerCase() === "administrator" )
			sgrp = "viewer:operator:admin:ptz";
		if( account.privileges.toLowerCase() === "api" )
			sgrp = "operator:admin";
		
		cgi = '/axis-cgi/pwdgrp.cgi?action=add&user=' + account.name + '&pwd=' + encodeURIComponent(account.password) + '&grp=users&sgrp=' + sgrp + '&comment=node';
		VapixDigest.HTTP_Get( device, cgi, "text", function( error, response ) {	
				if( error ) {
					callback( error, response );
					return;
				}
				if( response.search("Error") >= 0 ) {
					callback(true,response);
					return;
				}
				callback( false, response );
				return;
		});
	});

};

exports.Account_Remove = function( device, accountName, callback) {
	if( !accountName || typeof accountName !== "string" || accountName.length === 0 || accountName.length > 64) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing account name"
		});
		return;
	}
	var cgi  = "/axis-cgi/pwdgrp.cgi?action=remove&user=" + accountName;
	exports.CGI( device, cgi, function( error, response ) {
		if( error ) {
			callback(error, response );
			return;
		}
		callback(false,response);
	});
};

exports.Upload_Firmare = function( device , buffer, callback ) {
	if( !Buffer.isBuffer(buffer) ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Firmware data must be a buffer"
		});
		return;
	}
	
	VapixDigest.upload( device, "firmware", "firmware.bin", null, buffer, 
		function( error, response) {
			if( error )  {
				callback( error, response );
				return;
			}
			if( typeof response === "object" && response.hasOwnProperty("error") ){
				callback(true, {
					statusCode: response.error.code,
					statusMessage: response.error.message,
					body: response
				});
				return;
			}

			if( typeof response === "object" && response.hasOwnProperty("data") ){
				callback(false, device.address + " updated to " + response.data.firmwareVersion);
				return;
			}
			
			VapixDigest.upload( device, "firmware_legacy", "firmware.bin", null, buffer, function( error2, response2) {
				callback( error2, response2 );
				return;
			});
		}
	);
}

exports.Upload_Overlay = function( device, filename, options, callback ) {

	if(!filename || typeof filename !== "string" ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Must set filename for overlay"
		});
		return;
	}

	if( !fs.existsSync(filename) ) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: filename + " down not exist"
		});
		return;
	}	
	
	var paths = filename.split("/");
	var file = paths[paths.length-1];

	VapixDigest.upload( device, "overlay", file, options, fs.createReadStream(filename), function( error, response) {
		callback( error, response );
	});

}

exports.Upload_ACAP = function( device , buffer, callback ) {

	if(!buffer) {  
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "ACAP data must be a buffer"
		});
		return;
	}
	
	VapixDigest.upload( device, "acap", "acap.eap", null, buffer, function( error, response) {
		if(!error) {
			//VAPIX responds error with 200 OK but error is in JSON
			try {
				response = JSON.parse(response);
			} catch {
			}
			if( response.hasOwnProperty("error") ) {
				callback( true, {
					statusCode: response.error.code || 0,
					statusMessage: response.error.message || "Unknown error",
					body: "Not compatible with device"
				});
				return;
			}
			callback( false, response );
			return;
		}

		VapixDigest.upload( device, "acap_legacy", "acap.eap", null, buffer, function( error, response) {
			if( error ) {
				callback( error, response );
				return;
			}
			var body = response.trim();
			switch( body ) {
				case "OK":
					callback( false, "ACAP installed" );
				break;
				case "Error: 1":
					callback(true,{
						statusCode: 500,
						statusMessage: "Installation failed",
						body: body
					});
				break;
				case "Error: 2":
					callback(true,{
						statusCode: 500,
						statusMessage: "Installation failed",
						body: "File verification failed"
					});
				break;
				case "Error: 3":
					callback(true,{
						statusCode: 500,
						statusMessage: "Installation failed",
						body: "File is too large or the storage is full"
					});
				break;
				case "Error: 5":
				case "Error: 10":
					callback(true,{
						statusCode: 500,
						statusMessage: "Installation failed",
						body: "File is not compatible with the HW or FW"
					});
				break;
				default:
					callback(true,{
						statusCode: 500,
						statusMessage: "Installation failed",
						body: body
					});
				break;
			}
		});
	});
}

exports.Certificates_Get = function( device, certificateID, callback ) {

	var body = '<tds:GetCertificateInformation xmlns="http://www.onvif.org/ver10/device/wsdl">';
	body += '<CertificateID>' + certificateID + '</CertificateID>';
	body += '</tds:GetCertificateInformation>';
	
	VapixDigest.Soap( device, body, function( error, response ) {
		if( error ) {
			callback( error, response);
			return;
		}
		VapixParser.Certificate( response, function( error, cert ) {
			callback( error,cert);
		});
	});

};

exports.Certificates_List = function( device, callback ){

	var body = '<tds:GetCertificates xmlns="http://www.onvif.org/ver10/device/wsdl"></tds:GetCertificates>';
	VapixDigest.Soap( device, body, function( error, response ) {
		if( error ) {
			callback(error, response);
			return;
		}
		VapixParser.Certificates( response, function( error, list ) {
			if( error ) {
				callback( error, response );
				return;
			}
			if( list.length === 0 ) {
				callback( false, list );
				return;
			}
			var certCounter = list.length;
			var theCallback = callback;
			var certList = [];
			for( var i = 0; i < list.length; i++ ) {
				exports.Certificates_Get( device, list[i].id, function( error, response ) {
					if( !error )
						certList.push( response );
					certCounter--;
					if( certCounter <= 0 )
						theCallback( false, certList );
				});
			};
			return;
		});
	});

}

exports.Certificates_CSR = function( device, options, callback){

	if(!options || typeof options === "number" || typeof options === "boolean") {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Missing CSR"
		});
		return;
	}
	csr = options;
	if( typeof csr === "string" )
		csr = JSON.parse(csr);
	if(!csr) {
		callback(true,{
			statusCode: 400,
			statusMessage: "Invalid input",
			body: "Invalid CSR JSON"
		});
		return;
	}
	csr.id = "CSR_" + new Date().getTime();
	VapixParser.CSR_Request_Body( csr, function( error, body ) {
		if( error ) {
			callback( error, body );
			return;
		};
		VapixDigest.Soap( device, body, function( error, response ) {
			if( error ) {
				callback(error,response);
				return;
			}
			VapixParser.SoapParser( response, function( error, data ) {
				if( !data.hasOwnProperty("acertificates:CreateCertificate2Response") ) {
					callback("Invalid request", data);
					return;
				}
				callback(error,{
					id: data["acertificates:CreateCertificate2Response"]["acertificates:Id"],
					pem: data["acertificates:CreateCertificate2Response"]["acertificates:Certificate"]
				});
			});
		});
	});
}

exports.Recordings = function( device, options, callback) {
	var cgi = "/axis-cgi/record/list.cgi?recordingid=all";
	if( options.hasOwnProperty("from") ) {
		cgi += "&starttime=" + new Date(options.from).toISOString();
		if( options.hasOwnProperty("to") )
			cgi += "&stoptime=" + new Date(options.to).toISOString();
	}
	exports.CGI( device, cgi, function( error, response ) {
		if( error ) {
			callback(error, response );
			return;
		}
		VapixParser.Recordings( response, function( error, body ) {
			callback(error, body);
		});
	});
}