//Copyright (c) 2021-2022 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');

module.exports = function(RED) {
	
    function Axis_Device(config) {
	
		RED.nodes.createNode(this,config);
		this.preset = config.preset;
		this.action = config.action;
		this.cgi = config.cgi;
		this.data = config.data;
		this.options = config.options;
		this.filename = config.filename;
		var node = this;
		node.on('input', function(msg) {
			node.status({});

			var preset = RED.nodes.getNode(node.preset);
			var device = {
				address: msg.address || preset.address,
				user: msg.user || preset.credentials.user,
				password: msg.password || preset.credentials.password,
				protocol: "http"
			}

			if( !device.address || device.address.length === 0 || !device.user || device.user.length === 0 || !device.password || device.password.length === 0 ) {
				msg.payload = {
					statusCode: 0,
					statusMessage: "Invalid input",
					body: "Missing, address, user or password"
				}
				node.send([null,msg]);
			}	

			var action = msg.action || node.action;
			var data = node.data || msg.payload;
			var options = msg.options || node.options;
			var filename = msg.filename || node.filename;
//			console.log(action,device);
			switch( action ) {
				case "Device Info":
					VapixWrapper.DeviceInfo( device, function(error, response ) {
						msg.payload = response;
						if( error )
							node.send([null,msg]);
						else
							node.send([msg,null]);
					});
				break;

				case "Get Network settings":
//					console.log("Get Network settings");
					var request = {
						"apiVersion": "1.0",
						"context": "nodered",
						"method": "getNetworkInfo",
						"params":{}
					}
					VapixWrapper.CGI_Post( device, "/axis-cgi/network_settings.cgi", request, function(error, response ) {
						msg.payload = response;
						if( error ) {
							node.send([null,msg]);
							return;
						}
						if( msg.payload.hasOwnProperty("error") || !msg.payload.hasOwnProperty("data") ) {
							msg.payload = {
								statusCode: 200,
								statusMessage: "Invalid response",
								body: msg.payload
							}
							node.send([null,msg]);
							return;
						}
						msg.payload = msg.payload.data;
						node.send([msg,null]);
					});
				break;
				
				case "Restart":
					VapixWrapper.CGI( device, '/axis-cgi/restart.cgi', function(error, response) {
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						msg.payload = device.address + " is restarting";
						node.send([msg,null]);
					});
				break;

				case "Upgrade firmware":
					if( !Buffer.isBuffer(msg.payload) ) {
						msg.payload = {
							statusCode: 0,
							statusMessage: "Invalid input",
							body: "Firmware data must be a buffer"
						}
						node.send([null,msg]);
						return;
					}
					node.status({fill:"blue",shape:"dot",text:"Updating..."});
					VapixWrapper.Upload_Firmare( device , msg.payload, function(error, response ) {
						msg.payload = response;
						if(error) {
							node.status({fill:"red",shape:"dot",text:"Error"});
							msg.payload = response;
							node.send([null,msg]);
							return;
						} else {
							node.status({fill:"green",shape:"dot",text:"Success"});
							node.send([msg,null]);
						}
					});
				break;

				case "Set time":
					if( typeof data === "string" )
						data = JSON.parse(data);
					if(!data) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Time data needs to be an objet or JSON"
						}
						node.send([null,msg]);
						return;
					}
					var numberOfSetttings = 0;
					for( var name in data ) {
						if(name === "ntp")
							numberOfSetttings++;
						if(name === "timezone")
							numberOfSetttings++;
					}
					if( numberOfSetttings === 0 ) {
						msg.error = false;
						msg.payload = data;
						node.send([msg,null]);
						return;
					}
					if( data.hasOwnProperty("ntp") ) {
						if(typeof data.ntp === "string" )
							data.ntp = [data.ntp];
						if( !Array.isArray(data.ntp) ) {
							VapixWrapper.CGI( device, "/axis-cgi/param.cgi?action=update&Time.ObtainFromDHCP=yes", function(error, response ){
								if( error ) {
									msg.payload = response;
									node.send([null,msg]);
									return;
								}
								numberOfSetttings--;
								if( numberOfSetttings <= 0 ) {
									msg.payload = data;
									node.send([msg,null]);
									return;
								}
							});
						} else {
							var body = {
								"apiVersion":"1.1",
								"method":"setNTPClientConfiguration",
								"params":{
									"enabled":true,
									"serversSource":"static",
									"staticServers":data.ntp
								}
							}
							VapixWrapper.CGI_Post( device, "/axis-cgi/ntp.cgi", body, function(error, response) {
								if( error ) {
									msg.payload = response;
									node.send([null,msg]);
									return;
								}
								VapixWrapper.CGI( device, "/axis-cgi/param.cgi?action=update&Time.ObtainFromDHCP=no", function(error, response ){
									if( error ) {
										msg.payload = response;
										node.send([null,msg]);
										return;
									}
									msg.payload = response;
									numberOfSetttings--;
									if( numberOfSetttings <= 0 ) {
										if(!error)
											msg.payload = "OK";
										node.send([msg,null]);
										return;
									}
								})
							});
						}
					}
					if( data.hasOwnProperty("timezone") ) {
						if( typeof data.timezone !== "string" || data.timezone.length < 8 ||  data.timezone.search("/") < 0 ) {
							numberOfSetttings--;
							if( numberOfSetttings <= 0 ) {
								msg.payload = {
									statusCode: 400,
									statusMessage: "Invalid input",
									body: "Timezon syntax"
								}
								node.send([null,msg]);
								return;
							}
						} else {
							var body = {
								"apiVersion":"1.0",
								"method":"setTimeZone",
								"params":{
									"timeZone": data.timezone
								}
							}
							VapixWrapper.CGI_Post( device, "/axis-cgi/time.cgi", body, function(error, response) {
								if( error ) {
									msg.payload = response;
									node.send([null,msg]);
									return;
								}
								msg.payload = data;
								numberOfSetttings--;
								if( numberOfSetttings <= 0 ) {
									node.send([msg,null]);
								}
							});
						}
					}
				break;

				case "Syslog":
					VapixWrapper.Syslog( device, function( error, response) {
						msg.payload = response;
						if( error ) {
							node.send([null,msg]);
							return;
						}
						node.send([msg,null]);
					});
				break;

				case "Connections":
					VapixWrapper.Connections( device, function( error, response) {
						msg.payload = response;
						if( error ) {
							node.send([null,msg]);
							return;
						}
						node.send([msg,null]);
					});
				break;

				case "Get location":
					VapixWrapper.Location_Get( device, function( error, response) {
						msg.payload = response;
						if( error ) {
							node.send([null,msg]);
							return;
						}
						node.send([msg,null]);
					});
				break;

				case "Set location":
					if( typeof data === "string" )
						data = JSON.parse( data );
					
					if(!data || typeof data !== "object") {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Location syntax"
						}
						node.send([null,msg]);
						return;
					}
					VapixWrapper.Location_Set( device, data, function( error, response) {
						msg.payload = response;
						if( error ) {
							node.send([null,msg]);
							return;
						}
						node.send([msg,null]);
					});
				break;

				case "HTTP Get":
					var cgi = node.cgi || msg.cgi;
					if( !cgi || cgi.length < 2 ) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Missing cgi"
						}
						node.send([null,msg]);
						return;
					}
					VapixWrapper.HTTP_Get( device, cgi, "text", function(error, response ) {
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						msg.payload = response;
						if( typeof msg.payload === "string" && (msg.payload[0] === '{' || msg.payload[0] === '[' ) ) {
							var json = JSON.parse(response);
							if( json )
								msg.payload = json;
						}
						node.send([msg,null]);
					});
				break;
				
				case "HTTP Post":
					var cgi = node.cgi || msg.cgi;
					if( !cgi || cgi.length < 2 ) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Missing cgi"
						}
						node.send([null,msg]);
						return;
					}
					if(!data) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Missing post data"
						}
						node.send([null,msg]);
						return;
					}
					node.status({fill:"blue",shape:"dot",text:"Requesting..."});
					VapixWrapper.HTTP_Post( device, cgi, data, "text", function(error, response ) {
						if( error ) {
							node.status({fill:"red",shape:"dot",text:"Request failed"});
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						node.status({fill:"green",shape:"dot",text:"Request success"});
						
						if( typeof response === "string" && (response[0] === '{' << response[0] === '[') )
							msg.payload =  JSON.parse(response);
						else
							msg.payload = response;
						node.send([msg,null]);
					});
				break;

				case "SOAP Post":
					if( typeof data !== "string" || data.length < 20 || data[0] !== '<') {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "SOAP body syntax"
						}
						node.send([null,msg]);
					}
					VapixWrapper.SOAP( device, data, function(error, response ) {
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						msg.payload = response;
						node.send([msg,null]);
					});
				break;

				
				default:
					msg.payload = {
						statusCode: 400,
						statusMessage: "Invalid input",
						body: action + "is undefined",
					}
					node.send([null,msg]);
					return;
			}
        });
    }
	
    RED.nodes.registerType("Axis device",Axis_Device,{
		defaults: {
			name: { type:"text" },
			preset: {type:"Device Access"},
			action: { type:"text" },
			data: {type: "text"},
			options: {type: "text"},
			cgi: {type: "text"},
			filename: { type:"text" }
		}		
	});
}

