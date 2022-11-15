//Copyright (c) 2021-2022 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');

module.exports = function(RED) {
	function Axis_ACAP(config) {
		RED.nodes.createNode(this,config);
		this.preset = config.preset;
		this.action = config.action;
		this.acap = config.acap;
		var node = this;
		node.on('input', function(msg) {
			node.status({});
			var device = {
				address: null,
				user: null,
				passwaord: null,
				protocol: "http"
			}
			var preset = RED.nodes.getNode(node.preset);
			var device = {
				address: msg.address || preset.address,
				user: msg.user || preset.credentials.user,
				password: msg.password || preset.credentials.password,
				protocol: preset.protocol || "http"
			}

			if( !device.address || device.address.length === 0 || !device.user || device.user.length === 0 || !device.password || device.password.length === 0 ) {
				msg.payload = {
					statusCode: 0,
					statusMessage: "Invalid input",
					body: "Missing device address, user or password"
				}
				msg.payload.action = action;
				msg.payload.address = device.address;
				node.error("Invalid input", msg);
				return;
			}	

			var action = msg.action || node.action;
			var acap = node.acap || msg.payload;
			if( typeof acap !== "string" || acap.length < 2 )
				acap = null;
			
			switch( action ) {
				case "ACAP Status":
					VapixWrapper.ACAP_List( device, function( error, response ) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						if( acap ) {
							var selectedACAP = null;
							response.forEach( function( item ){
								if( item.Name === acap )
									selectedACAP = item;
							});
							if( selectedACAP ) {
								msg.payload = selectedACAP;
								node.send(msg);
								return;
							} else {
								msg.payload = {
									statusCode: 400,
									statusMessage: "Invalid input",
									body: acap + " is not installed"
								}
								node.error("Invalid input", msg);
								return;
							}
						}
						node.send(msg);
					});
				break;

				case "Start ACAP":
					if(!acap) {
						msg.payload = {
							statusCode: 0,
							statusMessage: "Invalid input",
							body: "Set ACAP ip"
						}
						node.error("Invalid input",msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "start", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Stop ACAP":
					if(!acap) {
						msg.payload = {
							statusCode: 0,
							statusMessage: "Invalid input",
							body: "Set ACAP ip"
						}
						node.error("Invalid input",msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "stop", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Remove ACAP":
					if(!acap) {
						msg.payload = {
							statusCode: 0,
							statusMessage: "Invalid input",
							body: "Set ACAP ip"
						}
						node.error("Invalid input",msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "remove", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Install ACAP":
					if( Buffer.isBuffer( msg.payload ) !== true ) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "msg.payload must be a buffer"
						}
						node.error(msg);
						return;
					}
					node.status({fill:"blue",shape:"dot",text:"Installing..."});
					VapixWrapper.Upload_ACAP( device, msg.payload, function(error, response){
						msg.payload = response;
						if( error ) {
							node.status({fill:"red",shape:"dot",text:"Failed"});
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}

						if( typeof response === "object" && response.hasOwnProperty("data") ) {
							msg.payload = response.data.id;
						}
						
						node.status({fill:"green",shape:"dot",text:"Success"});
						node.send(msg);
					});
				break;

				default:
					msg.payload = {
						statusCode: 400,
						statusMessage: "Invalid input",
						body: action + "is undefined",
					}
					msg.payload.action = action;
					msg.payload.address = device.address;
					node.error(response.statusMessage, msg);
				break;
			}
        });
    }

    RED.nodes.registerType("Axis ACAP", Axis_ACAP,{
		defaults: {
			action: { type:"txt" },
			preset: {type:"Device Access"},
			action: { type:"text" },
			acap: { type:"text" }
		}
	});
}
