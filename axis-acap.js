//Copyright (c) 2021-2022 Fred Juhlin

const fs = require("fs");
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
				msg.payload = "Missing one or more attributes (address,user,password)";
				node.error("Access failed",msg);
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
							node.error("ACAP Status failed on " + device.address, msg);
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
								msg.payload = acap + " is not installed";
								node.error("ACAP Status failed on " + device.address, msg);
								return;
							}
						}
						node.send(msg);
					});
				break;

				case "Start ACAP":
					if(!acap) {
						msg.payload = "Undefined ACAP package id";
						node.error("Start ACAP failed on " + device.address,msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "start", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("Start ACAP failed on " + device.address,msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Stop ACAP":
					if(!acap) {
						msg.payload = "Undefined ACAP package id";
						node.error("Stop ACAP failed on " + device.address,msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "stop", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error("Stop ACAP failed on " + device.address,msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Remove ACAP":
					if(!acap) {
						msg.payload = "Undefined ACAP package id";
						node.error("Remove ACAP failed on " + device.address,msg);
						return;
					}
					VapixWrapper.ACAP_Control( device, "remove", acap, function(error, response){
						msg.payload = response;
						if( error ) {
							node.error("Remove ACAP failed on " + device.address,msg);
							return;
						}
						msg.payload = acap;
						node.send(msg);
					});
				break;

				case "Install ACAP":
					var filename = msg.filename || node.filename;
					if( !fs.existsSync(filename) ) {
						msg.payload = filename + " does not exist";
						node.error("Install ACAP failed on " + device.address, msg);
						return;
					}	
					
					node.status({fill:"blue",shape:"dot",text:"Installing..."});
					VapixWrapper.Upload_ACAP( device, filename, function(error, response){
						msg.payload = response;
						if( error ) {
							node.status({fill:"red",shape:"dot",text:"Failed"});
							node.error("Install ACAP failed on " + device.address, msg);
							return;
						}

						if( typeof response === "object" && response.hasOwnProperty("data") ) {
							msg.payload = response.data.id;
						} else 
							msg.payload = acap;
						
						node.status({fill:"green",shape:"dot",text:"Success"});
						node.send(msg);
					});
				break;

				default:
					node.error("Invalid action", msg);
				break;
			}
        });
    }

    RED.nodes.registerType("Axis ACAP", Axis_ACAP,{
		defaults: {
			action: { type:"text" },
			preset: {type:"Device Access"},
			action: { type:"text" },
			acap: { type:"text" }
		}
	});
}
