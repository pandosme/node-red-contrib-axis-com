//Copyright (c) 2021-2022 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');

module.exports = function(RED) {
	
	function Axis_Camera(config) {
		RED.nodes.createNode(this,config);
		this.preset = config.preset;		
		this.action = config.action;
		this.resolution = config.resolution;
		this.output = config.output;
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
			var filename = msg.filename || node.filename;
			var options = node.options || msg.payload;
			
			msg.error = false;
			switch( action ) {
				case "JPEG Image":
					var resolution = "resolution=" + node.resolution;
					if( msg.resolution )
						resolution = "resolution=" + msg.resolution;
					VapixWrapper.JPEG( device, resolution, function( error, response) {
						msg.payload = response;
						if( error )
							node.send([null,msg]);
						else {
							if( node.output === "Base64" )
								msg.payload = response.toString('base64');							
							node.send([msg,null]);
						}
					});
				break;

				case "Camera Info":
					VapixWrapper.Param_Get( device, "properties", function( error, response ) {
						msg.payload = response;
						var info = {};
						if( error ) {
							node.send([null,msg]);
							return;
						}
						if( !response.hasOwnProperty("Image") || !response.Image.hasOwnProperty("Format")) {
							msg.payload = {
								statusCode: 200,
								statusMessage: "No camera info",
								body: response
							}
							node.send([null,msg]);
							return;
						}
						info.formats = response.Image.Format.split(","),
						info.resolutions = response.Image.Resolution.split(",")
						info.largest = info.resolutions[0];
						info.medium = "640x480";
						info.smallest = info.resolutions[info.resolutions.length-1];
						info.aspect = "4:3";
						info.rotation = 0;
						VapixWrapper.Param_Get( device, "ImageSource.I0", function( error, response ) {
							if( error ) {
								msg.payload = response;
								node.send([null,msg]);
								return;
							}
							if( response.hasOwnProperty("I0") ) { 
								if( response.I0.hasOwnProperty("Sensor") && response.I0.Sensor.hasOwnProperty("AspectRatio") ) {
									info.aspect  = response.I0.Sensor.AspectRatio;
									if( info.aspect === "16:9")
										info.medium = "640x360";
									if( info.aspect === "4:3")
										info.medium = "640x480";
									if( info.aspect === "1:1")
										info.medium = "640x640";
									if( info.aspect === "16:10")
										info.medium = "640x400";
								}
								if( response.I0.hasOwnProperty("Rotation") )
									info.rotation = parseInt(response.I0.Rotation);
							}
							msg.payload = info;
							node.send([msg,null]);
						});
					});
				break;

				case "Get image settings":
					VapixWrapper.Param_Get( device, "ImageSource.I0.Sensor", function( error, response ) {
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						msg.error = error;
						var settings = {
							Brightness: parseInt(response.I0.Sensor.Brightness),
							ColorLevel: parseInt(response.I0.Sensor.ColorLevel),
							Contrast: parseInt(response.I0.Sensor.Contrast),
							Exposure: response.I0.Sensor.Exposure,
							WhiteBalance: response.I0.Sensor.WhiteBalance,
							WDR: response.I0.Sensor.WDR === "on"
						}
						VapixWrapper.Param_Get( device, "ImageSource.I0.DayNight", function( error, response ) {
							if( error ) {
								msg.payload = response;
								node.send([null,msg]);
								return;
							}
							settings.DayLevel = parseInt(response.I0.DayNight.ShiftLevel);
							if( response.I0.IrCutFilter === "yes")
								settings.DayLevel = 100;
							if( response.I0.IrCutFilter === "no")
								settings.DayLevel = 0;
							msg.payload = settings;
							node.send([msg,null]);
						});
					});
				break;

				case "Set image settings":
					if( typeof options === "string" )
						options = JSON.parse(options);
					if(!options || typeof options !== "object") {
					}
					
					var sensor = JSON.parse( JSON.stringify(options) );
					sensor.WDR = sensor.WDR ? "on":"off";
					delete sensor.DayLevel;
					VapixWrapper.Param_Set( device, "ImageSource.I0.Sensor", sensor, function( error, response ) {
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						if( !options.hasOwnProperty("DayLevel") ) {
							msg.payload = {
								statusCode: 400,
								statusMessage: "Invalid input",
								body: "Missing DayLevel"
							}
							node.send([null,msg]);
							return;
						}
						var DayNight = {
							IrCutFilter: "auto",
							ShiftLevel: options.DayLevel
						}
						if( options.DayLevel === 0 )
							DayNight.IrCutFilter = "no";
						if( options.DayLevel === 100 )
							DayNight.IrCutFilter = "yes";
						VapixWrapper.Param_Set( device, "ImageSource.I0.DayNight", DayNight, function( error, response ) {
							msg.payload = response;
							if( error ) {
								node.send([null,msg]);
								return;
							}
							node.send([msg,null]);
						});
					});
				break;

				case "Set video filter":
					var postData = {
						"apiVersion": "1.0", 
						"method": "set",
						"params":{"flagValues":{"graphics_udvd":true}}
					}
					VapixWrapper.HTTP_Post(device,'/axis-cgi/featureflag.cgi',postData, "json", function(error,response){
						if( error ) {
							msg.payload = response;
							node.send([null,msg]);
							return;
						}
						
						if( response.hasOwnProperty("error") ) {
							msg.payload = {
								statusCode: 400,
								statusMessage: "Error",
								body: response.error.message
							}
							node.send([null,msg]);
							return;
						}
						postData = {
							"apiVersion": "1.0", 
							"method": "toggle_filter", "param": { "type": "none"}
						};
						var filter = msg.options;
						switch( filter ) {
							case "Sketch": 
								postData = {
									"apiVersion": "1.0", 
									"method": "toggle_filter", "param": { "type": "sobel"}
								}
							break;
							case "Blur":
								postData = {
									"apiVersion": "1.0", 
									"method": "toggle_filter", "param": { "type": "blur"}
								}
							break;
						}

						VapixWrapper.HTTP_Post(device,'/axis-cgi/udvd/udvd.cgi',postData, "json", function(error2,response2){
							if( error2 ) {
								msg.payload = response2;
								node.send([null,msg]);
								return;
							}
/*
							if( response.hasOwnProperty("error") ) {
								msg.payload = {
									statusCode: 400,
									statusMessage: "Error",
									body: response.error.message
								}
								node.send([null,msg]);
								return;
							}
*/							
							msg.payload = filter;
							node.send([msg,null]);
						});
					});
				break;

				case "Upload overlay":
					if(!filename || filename.length === 0 ) {
						node.status({fill:"red",shape:"dot",text:"Invalid filename"});
						msg.error = true;
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Missing filename"
						}
						node.send([null,msg]);
					}
					
					node.status({fill:"blue",shape:"dot",text:"Uploading image..."});
					if( typeof options === "number" || typeof options === "boolean" || typeof options === "undefined" )
						options = null;
					if( typeof options === "string" )
						options = JSON.parse( options );
					VapixWrapper.Upload_Overlay( device, filename, options, function(error, response){
						msg.payload = response;
						if( error ) {
							node.status({fill:"red",shape:"dot",text:"Upload failed"});
							node.send([null,msg]);
							return;
						}
						node.status({fill:"green",shape:"dot",text:"Upload success"});
						node.send([msg,null]);
					});
				break;
				
				default:
					node.warn( action + " is not yet implemented");
				break;

			}
        });
    }
	
    RED.nodes.registerType("Axis camera",Axis_Camera,{
		defaults: {
			name: { type:"text" },
			preset: {type:"Device Access"},
			action: { type:"text" },
			resolution: { type:"text" },
			output: { type:"text" },
			options: { type:"text" },
			filename: { type:"text" }
		}		
	});
}

