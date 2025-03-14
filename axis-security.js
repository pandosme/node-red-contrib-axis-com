//Copyright (c) 2021-2024 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');
const VapixDigest = require("./vapix-digest.js");

module.exports = function(RED) {
	function Axis_Security(config) {
		RED.nodes.createNode(this,config);
		this.preset = config.preset;
		this.action = config.action;
		this.options = config.options;

		var node = this;
		node.on('input', function(msg) {
			node.status({});
			var preset = RED.nodes.getNode(node.preset);
			var user = "root";
			var user = "root";
			
			var device = {
				address: msg.address || preset.address,
				user: msg.user || preset.credentials.user,
				password: msg.password || preset.credentials.password,
				protocol: "http"
			}

			if( !device.address || device.address.length === 0 || !device.user || device.user.length === 0 || !device.password || device.password.length === 0 ) {
				msg.payload = "Missing one or more attributes (address,user,password)";
				node.error("Access failed",msg);
				return;
			}	

			var action = msg.action || node.action;
			var options = node.options || msg.options;
			var data = node.data || msg.payload;

			switch( action ) {
				case "List accounts":
					VapixWrapper.Account_List( device,function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("List accounts failed on " + device.address, msg);
							return;
						}
						node.send(msg);
					});
				break;

				case "Set account":
					var account = msg.payload;
					VapixWrapper.Account_Set( device, account, function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("Set account failed on " + device.address, msg);
							return;
						}
						msg.payload = account;
						node.send(msg);
					});
				break;

				case "Remove account":
					var account = node.account || msg.payload;
					if( !account || typeof account !== "string" || account.length === 0 ) {
						msg.payload = "Account needs to be a string";
						node.error("Remove account failed on " + device.address, msg);
						return;
					}
					VapixWrapper.Account_Remove( device, account, function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("Remove account failed on " + device.address, msg);
							return;
						}
						msg.payload = account;
						node.send(msg);
					});
				break;

				case "Allow discovery":
					var state = msg.payload;
					if( typeof state !== "boolean" ) {
						msg.payload = "msg.payload must be boolean";
						node.error("Discovery config failed on " + msg.device, msg);
						return;
					}
					
					if( state === true ) {
						cgi = "/axis-cgi/param.cgi?action=update&Network.UPnP.Enabled=yes&Network.Bonjour.Enabled=yes&Network.ZeroConf.Enabled=yes&WebService.DiscoveryMode.Discoverable=Yes";
					} else {
						cgi = "/axis-cgi/param.cgi?action=update&Network.UPnP.Enabled=no&Network.Bonjour.Enabled=no&Network.ZeroConf.Enabled=no&WebService.DiscoveryMode.Discoverable=No";
					}
					VapixWrapper.CGI( device, cgi, function(error,response ) {
						msg.payload = response;
						if( error ) {
							node.error("Discovery config failed on " + device.account, msg);
							return;
						}
						msg.payload = state;
						node.send(msg);
					});
				break;

				case "Allow SSH":
					var state = msg.payload;
					if( typeof state !== "boolean" ) {
						msg.payload = "msg.payload must be boolean";
						node.error("SSH Config failed on " + device.address, msg);
						return;
					}
					
					if( state === true ) {
						cgi = "/axis-cgi/param.cgi?action=update&Network.SSH.Enabled=yes";
					} else {
						cgi = "/axis-cgi/param.cgi?action=update&Network.SSH.Enabled=no";
					}
					VapixWrapper.CGI( device, cgi, function(error,response ) {
						msg.payload = response;
						if( error ) {
							node.error("SSH config failed on " + device.address, msg);
							return;
						}
						msg.payload = state;
						node.send(msg);
					});
				break;

				case "Set SSH User":
					var user = msg.payload;
					if( typeof user !== "object" || !user.hasOwnProperty("name") || !user.hasOwnProperty("password") ) {
						msg.payload = "msg.payload must be an object with attribure name and password";
						node.error("Set SSH User failed on " + device.address, msg);
						return;
					}
				
					var data = {
						data: {
							password: user.password,
							comment: user.comment || "Admin"
						}
					}
					VapixDigest.HTTP_Put( device, '/devconf/rest/ssh/v1/users/'+user.name, data, "json", function(error,response ) {
						if( response.hasOwnProperty("status") && response.status === "success" ) {
							msg.payload = "SSH user " + user.name + " is set";
							node.send(msg);
							return;
						}

						data = {
							data: {
								username: user.name,
								password: user.password,
								comment: user.comment || "Admin"
							
							}
						}
						
						VapixDigest.HTTP_Post( device, '/devconf/rest/ssh/v1/users', data, "json", function(error,response ) {
							msg.payload = response;
							if( error ) {
								node.error("Set SSH user failed on " + device.address, msg);
								return;
							}
							if( response.hasOwnProperty("status") && response.status === "success" ) {
								msg.payload = "SSH user " + user.name + " is set";
								node.send(msg);
								return;
							};
							node.error("Set SSH user failed on " + device.address, msg);
							return;
						});
					});
				break;

				case "Allow Browser Access":
					var state = msg.payload;
					if( typeof state !== "boolean" ) {
						msg.payload = "msg.payload must be boolean";
						node.error("Browser access config failed on " + device.address, msg);
						return;
					}
					if( state === true ) {
						cgi = "/axis-cgi/param.cgi?action=update&System.WebInterfaceDisabled=no";
					} else {
						cgi = "/axis-cgi/param.cgi?action=update&System.WebInterfaceDisabled=yes";
					}
					VapixWrapper.CGI( device, cgi, function(error,response ) {
						msg.payload = response;
						if( error ) {
							node.error("Browser access config failed on " + device.address, msg);
							return;
						}
						msg.payload = state;
						node.send(msg);
					});
				break;
				
				case "Set firewall":
				    var ipFormat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

					var list = node.options || msg.payload;

					if( typeof list === "string" && list[0] === "[")
						list = JSON.parse(list);
					if( !list || !Array.isArray(list) ) {
						msg.payload = "Input must be an array of IP addresses";
						node.error("Set firewall failed on " + device.address, msg);
						return;
					}
			
					
					//Check if all address are vaid IP addresses
					var listOK = true;
					var stringList = "";
					list.forEach(function(item){
						if( !listOK )
							return;
						if( !ipFormat.test(item) ) {
							listOK = false;
							msg.payload = item + " is invalid IP address";
							node.error("Set firewall failed on " + device.address, msg);
							return;
						}
						stringList += item + " ";
					});

					if( !listOK )
						return;

					if( list.length === 1 ) {
						msg.payload = "Set two or more white listed IP address";
						node.error("Set firewall failed on " + device.address, msg);
						return;
					}

					if( stringList.length > 0 )
						stringList = stringList.slice(0, -1);
					if( list.length > 0 )
						var cgi = "/axis-cgi/param.cgi?action=update&root.Network.Filter.Enabled=yes";
					else
						var cgi = "/axis-cgi/param.cgi?action=update&root.Network.Filter.Enabled=no";
					cgi += "&root.Network.Filter.Input.AcceptAddresses=" + stringList;
					VapixWrapper.CGI( device, cgi, function(error,response ) {
						msg.payload = response;
						if( error ) {
							node.error("Set firewall failed on " + device.address, msg);
							return;
						}
						msg.payload = list;
						node.send(msg);
					});
				break;

				case "List certificates":
					VapixWrapper.Certificates_List( device, function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("List certificates failed on " + device.address, msg);
							return;
						}
						node.send(msg);
					});
				break;
			
				case "Set HTTPS certificate":
					data = msg.payload;
					if( !data || typeof data !== "object" || !data.hasOwnProperty("cert") || !data.hasOwnProperty("key") ) {
						msg.payload = "Input must be be an object with properties cert or key";
						msg.payload.action = action;
						msg.payload.address = device.address;
						node.error("Set HTTPS certificate failed on " + device.address, msg);
						return;
					}
					data.cert = data.cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					data.cert = data.cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					data.key = data.key.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					data.key = data.key.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					var certID = "HTTPS_" + new Date().toISOString().split('.')[0]
					var body = '<tds:LoadCertificateWithPrivateKey xmlns="http://www.onvif.org/ver10/device/wsdl"><CertificateWithPrivateKey>\n';
					body += '<tt:CertificateID>' + certID + '</tt:CertificateID>\n';
					body += '<tt:Certificate>\n<tt:Data>' + data.cert + '</tt:Data>\n</tt:Certificate>\n';
					body += '<tt:PrivateKey>\n<tt:Data>' + data.key + '</tt:Data>\n</tt:PrivateKey>\n';
					body += '</CertificateWithPrivateKey></tds:LoadCertificateWithPrivateKey>\n';
					VapixWrapper.SOAP( device, body, function(error,response){
						msg.payload = response;
						if( error ) {
							node.error("Set HTTPS certificate failed on " + device.address, msg);
							return;
						}
						body = '<aweb:SetWebServerTlsConfiguration xmlns="http://www.axis.com/vapix/ws/webserver"><Configuration>';
						body += '<Tls>true</Tls>';
						body += '<aweb:ConnectionPolicies><aweb:Admin>HttpAndHttps</aweb:Admin></aweb:ConnectionPolicies>';
						body += '<aweb:Ciphers>';
						body += '  <acert:Cipher>ECDHE-ECDSA-AES128-GCM-SHA256</acert:Cipher>';
						body += '  <acert:Cipher>ECDHE-RSA-AES128-GCM-SHA256</acert:Cipher>';
						body += '  <acert:Cipher>ECDHE-ECDSA-AES256-GCM-SHA384</acert:Cipher>';
						body += '  <acert:Cipher>ECDHE-RSA-AES256-GCM-SHA384</acert:Cipher>';
						body += '  <acert:Cipher>ECDHE-ECDSA-CHACHA20-POLY1305</acert:Cipher>';
						body += '  <acert:Cipher>ECDHE-RSA-CHACHA20-POLY1305</acert:Cipher>';
						body += '  <acert:Cipher>DHE-RSA-AES128-GCM-SHA256</acert:Cipher>';
						body += '  <acert:Cipher>DHE-RSA-AES256-GCM-SHA384</acert:Cipher>';
						body += '</aweb:Ciphers>';
						body += '<aweb:CertificateSet><acert:Certificates>';
						body += '<acert:Id>' + certID + '</acert:Id>';
						body += '</acert:Certificates><acert:CACertificates></acert:CACertificates>';
						body += '<acert:TrustedCertificates></acert:TrustedCertificates>';
						body += '</aweb:CertificateSet></Configuration></aweb:SetWebServerTlsConfiguration>';
						VapixWrapper.SOAP( device, body, function(error,response){
							msg.payload = response;
							if( error ) {
								node.error("Set HTTPS certificate failed on " + device.address, msg);
								return;
							}
							msg.payload = data;
							node.send(msg);
							return;
						});
					});
				break;
				
				case "Generate CSR":
					var csr = data;
					if( typeof crs === "string" )
						csr = JSON.parse(data);
					
					if( !csr || typeof csr !== "object" ) {
						msg.payload = "CSR request inoput must be an object with property CN";
						node.error("Generate CSR failed on " + device.address, msg);
						return;
					}
					if( !csr.hasOwnProperty('CN') ) {
						msg.payload = "Common name (CN) must be set";
						node.error("Generate CSR failed on " + device.address, msg);
					}
					node.status({fill:"blue",shape:"dot",text:"Requesting CSR..."});

					var fromTime = new Date();
					days = 365;
					if( csr.hasOwnProperty('days') )
						days = csr.days;
					var toTime = new Date( fromTime.getTime() + (days * 3600 * 24 * 1000) );
					var validFrom = fromTime.toISOString().split('.')[0];
					var validTo = toTime.toISOString().split('.')[0]

					var subject = '<acertificates:Subject>\n';
					subject +=	'<acert:CN>' + csr.CN + '</acert:CN>\n';
					if( csr.hasOwnProperty('C'))
						subject += '<acert:C>' + csr.C + '</acert:C>\n';
					if( csr.hasOwnProperty('L'))
						subject += '<acert:L>' + csr.L + '</acert:L>\n';
					if( csr.hasOwnProperty('O'))
						subject += '<acert:O>' + csr.O + '</acert:O>\n';
					if( csr.hasOwnProperty('OU'))
						subject += '<acert:OU>' + csr.OU + '</acert:OU>\n';
					if( csr.hasOwnProperty('ST'))
						subject += '<acert:ST>' + csr.ST + '</acert:ST>\n';
					subject +=	'</acertificates:Subject>\n';

					var soapBody = '<acertificates:CreateCertificate2 xmlns="http://www.axis.com/vapix/ws/certificates">\n';
					soapBody += '<acertificates:Id>CSR_' + validFrom + '</acertificates:Id>\n';
					soapBody += subject;
					soapBody += '<acertificates:ValidNotBefore>' + validFrom + '</acertificates:ValidNotBefore>\n'
					soapBody += '<acertificates:ValidNotAfter>' + validTo + '</acertificates:ValidNotAfter>\n';
					soapBody += '</acertificates:CreateCertificate2>\n';
					
					VapixWrapper.SOAP( device, soapBody, function(error,certResponse) {
						if( error ) {
							msg.payload = certResponse;
							node.status({fill:"red",shape:"dot",text:"CSR request failed"});
							node.error("Generate CSR failed on " + device.address, msg);
							return;
						}
						node.status({fill:"green",shape:"dot",text:"CSR complete"});
						if( certResponse.hasOwnProperty("acertificates:CreateCertificate2Response") ) {
							var soapBody = '<acertificates:GetPkcs10Request2 xmlns="http://www.axis.com/vapix/ws/certificates">\n';
							soapBody += '<acertificates:Id>CSR_' + validFrom + '</acertificates:Id>\n';
							soapBody += subject;
							soapBody += '</acertificates:GetPkcs10Request2>\n';
							VapixWrapper.SOAP( device, soapBody, function(error,response) {
								if( error ) {
									msg.payload = response;
									node.status({fill:"red",shape:"dot",text:"CSR request failed"});
									node.error("Generate CSR failed on " + device.address, msg);
									return;
								}
								node.status({fill:"green",shape:"dot",text:"CSR complete"});
								msg.payload = response;
								if( response.hasOwnProperty("acertificates:GetPkcs10Request2Response") ) {
									var rows = response["acertificates:GetPkcs10Request2Response"]["acertificates:Pkcs10Request"].match(/.{1,64}/g);
									var PEM = "-----BEGIN CERTIFICATE REQUEST-----\n";
									rows.forEach(function(row) {
										PEM += row + '\n';
									});
									PEM += "-----END CERTIFICATE REQUEST-----\n";
									msg.payload = PEM;
									msg.csrID = 'CSR_' + validFrom;
									node.send(msg);
									return;
								}
							});
						}
					});
				break;

				case "Install Certificate":
					var PEM = data;
					if( !PEM || typeof PEM !== "string" ) {
						msg.payload = "Missing PEM data";
						node.error("Install Certificate failed on " + device.address, msg);
						return;
					}
					if( PEM.search("-----BEGIN CERTIFICATE-----") < 0 || PEM.search("-----END CERTIFICATE-----") < 0 ) {
						msg.payload = "Invalid PEM data";
						node.error("Install Certificate failed on " + device.address, msg);
						return;
					}
					//Awkward ONVIF again...why not accepting standard PEM formating?!!!!!!!
					PEM = PEM.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					PEM = PEM.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					
					var ID = "CERT_" + new Date().toISOString().split('.')[0];
					
					var soapBody = '<tds:LoadCertificates xmlns="http://www.onvif.org/ver10/device/wsdl">';
					soapBody += '<NVTCertificate><tt:CertificateID>' + ID + '</tt:CertificateID>';
					soapBody += '<tt:Certificate>';
					soapBody += '<tt:Data>';
					soapBody += PEM;
					soapBody += '</tt:Data>';
					soapBody += '</tt:Certificate>';
					soapBody += '</NVTCertificate>';
					soapBody += '</tds:LoadCertificates>';

					VapixWrapper.SOAP( device, soapBody, function(error,response) {
						msg.payload = response;
						if( error ) {
							node.error("Install Certificate failed on " + device.address, msg);
							return;
						}
						msg.certID;
						node.send(msg);
						return;
					});
				break;

				case "Remove Certificate":
					var ID = data;
					if( !ID || typeof ID !== "string" || ID.length < 2 || ID.length > 60) {
						msg.payload = "Missing certificate id";
						node.error("Remove Certificate failed on " + device.address, msg);
						return;
					}
					var soapBody = '<tds:DeleteCertificates xmlns="http://www.onvif.org/ver10/device/wsdl">';
					soapBody += '<CertificateID>' + ID + '</CertificateID>';
					soapBody += '</tds:DeleteCertificates>';
					VapixWrapper.SOAP( device, soapBody, function(error,response) {
						msg.payload = response;
						if( error ) {
							node.error("Remove Certificate failed on " + device.address, msg);
							return;
						}
						node.send(msg);
					});
				break;
				
				case "802.1X EAP-TLS":
					data = msg.payload;
					if( !data || typeof data !== "object" ||
						!data.hasOwnProperty("cert") || !data.hasOwnProperty("key") || 
					    !data.hasOwnProperty("CA_name") || !data.hasOwnProperty("CA_cert") || 
						!data.hasOwnProperty("EAP_identity") || !data.hasOwnProperty("EAPOL_version") || 
						data.cert.length < 500 || data.key.length < 500 || data.CA_cert.length < 500
						) {
							msg.payload = "Input must have valid properties cert, CA_name and EAP_identity";
							node.error("802.1X EAP-TLS failed on " + device.address, msg);
							return;
						}

					data.CA_cert = data.CA_cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					data.CA_cert = data.CA_cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
					
					var body = '<tds:LoadCACertificates xmlns="http://www.onvif.org/ver10/device/wsdl">';
					body += '<CACertificate><tt:CertificateID>' + data.CA_name + '</tt:CertificateID>';
					body += '<tt:Certificate><tt:Data>' + data.CA_cert + '</tt:Data></tt:Certificate></CACertificate></tds:LoadCACertificates>';
					VapixWrapper.SOAP( device, body, function(error,response){
						msg.payload = response;
						if( error ) {
							node.error("802.1X EAP-TLS failed on " + device.address, msg);
							return;
						}
						data.cert = data.cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
						data.cert = data.cert.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
						data.key = data.key.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
						data.key = data.key.replace(/-{5}(BEGIN|END).+?-{5}/g,"");
						
						var certID = "802.1X_" + parseInt(new Date().getTime()/1000);
						var body = '<tds:LoadCertificateWithPrivateKey xmlns="http://www.onvif.org/ver10/device/wsdl"><CertificateWithPrivateKey>\n';
						body += '<tt:CertificateID>' + certID + '</tt:CertificateID>\n';
						body += '<tt:Certificate>\n<tt:Data>' + data.cert + '</tt:Data>\n</tt:Certificate>\n';
						body += '<tt:PrivateKey>\n<tt:Data>' + data.key + '</tt:Data>\n</tt:PrivateKey>\n';
						body += '</CertificateWithPrivateKey></tds:LoadCertificateWithPrivateKey>\n';
						VapixWrapper.SOAP( device, body, function(error,response){
							msg.payload = response;
							if( error ) {
								node.error("802.1X EAP-TLS failed on " + device.address, msg);
								return;
							}
					
							var body = '<tds:SetDot1XConfiguration xmlns="http://www.onvif.org/ver10/device/wsdl">';
							body += '<Dot1XConfiguration>';
							body += '<tt:Dot1XConfigurationToken>EAPTLS_WIRED</tt:Dot1XConfigurationToken>';
							body += '<tt:Identity>' + data.EAP_identity + '</tt:Identity>';
							body += '<tt:EAPMethod>13</tt:EAPMethod>';
							body += '<tt:EAPMethodConfiguration><tt:TLSConfiguration>';
							body += '<tt:CertificateID>' + certID + '</tt:CertificateID>';
							body += '</tt:TLSConfiguration></tt:EAPMethodConfiguration>';
							body += '<tt:CACertificateID>' + data.CA_name + '</tt:CACertificateID>';
							body += '</Dot1XConfiguration></tds:SetDot1XConfiguration>';
							VapixWrapper.SOAP( device, body, function(error,response){
								msg.payload = response;
								if( error ) {
									node.error("802.1X EAP-TLS failed on " + device.address, msg);
									return;
								}
								var cgi = '/axis-cgi/param.cgi?action=update&Network.Interface.I0.dot1x.Enabled=yes&Network.Interface.I0.dot1x.EAPOLVersion=' + data.EAPOL_version;	
								VapixWrapper.CGI( device, cgi, function(error,response ) {
									msg.payload = resonse;
									if(error) {
										node.error("802.1X EAP-TLS failed on " + device.address, msg);
										return;
									}
									node.send(msg);
								});
							});
						});
					});
				break;
				
				default:
					node.warn( action + "is not yet implemented");
				break;
			}
        });
    }
	
    RED.nodes.registerType("Axis Security", Axis_Security,{
		defaults: {
			name: {type:"text"},
			preset: {type:"Device Preset"},
			address: {type:"text"},
			action: { type:"text" },
			options: { type:"text" }
		}		
	});
}

