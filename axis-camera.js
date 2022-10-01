//Copyright (c) 2021-2022 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');
const xml2js = require('xml2js');

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
				protocol: preset.protocol || "http"
			}
			
			var action = msg.action || node.action;
			var filename = msg.filename || node.filename;
			var options = node.options || msg.payload;

			if( !device.address || device.address.length === 0 || !device.user || device.user.length === 0 || !device.password || device.password.length === 0 ) {
				msg.payload = {
					statusCode: 0,
					statusMessage: "Invalid input",
					body: "Missing, address, user or password"
				}
				msg.payload.action = action;
				msg.payload.address = device.address;
				node.error(response.statusMessage, msg);
				return;
			}	
			
			msg.error = false;
			switch( action ) {
				case "JPEG Image":
					var resolution = "resolution=" + node.resolution;
					if( msg.resolution )
						resolution = "resolution=" + msg.resolution;
					VapixWrapper.JPEG( device, resolution, function( error, response) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						if( node.output === "Base64" )
							msg.payload = response.toString('base64');							
						node.send(msg);
					});
				break;

				case "Start recording":
					var cgi = "/axis-cgi/record/record.cgi?diskid=SD_DISK";
					VapixWrapper.HTTP_Get( device, cgi, "text", function( error, response) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						var parser = new xml2js.Parser({
							explicitArray: false,
							mergeAttrs: true
						});
						parser.parseString(response, function (err, result) {
							if( err ) {
								node.error( "XML parse error", {
									statusCode: "PARSE_ERROR",
									statusMessage: "XML parse error",
									body: response
								});
								return;
							}
							if( result.hasOwnProperty("root")
							  && result.root.hasOwnProperty("record")
							  && result.root.record.hasOwnProperty("result")
							  && result.root.record.result === "OK" ) {
								msg.payload = result.root.record.recordingid;
								node.send(msg);
								return;
							}
							node.error( "Start recording failed", {
								statusCode: 500,
								statusMessage: "Start recording failed",
								body: result
							});
						});
					});
				break;

				case "Stop recording":
					var recordingid = msg.payload;
					var cgi = "/axis-cgi/record/stop.cgi?recordingid=" + recordingid;
					VapixWrapper.HTTP_Get( device, cgi, "text", function( error, response) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						var parser = new xml2js.Parser({
							explicitArray: false,
							mergeAttrs: true
						});
						parser.parseString(response, function (err, result) {
							if( err ) {
								node.error( "XML parse error", {
									statusCode: "PARSE_ERROR",
									statusMessage: "XML parse error",
									body: response
								});
								return;
							}
							if( result.hasOwnProperty("root")
							  && result.root.hasOwnProperty("record")
							  && result.root.record.hasOwnProperty("result")
							  && result.root.record.result === "OK" ) {
								msg.payload = result.root.record.recordingid;
								node.send(msg);
								return;
							}
							node.error( "Stop recording failed", {
								statusCode: 500,
								statusMessage: "Stop recording failed",
								body: result
							});
						});
						node.send(msg);
					});
				break;

				case "Camera Info":
					VapixWrapper.Param_Get( device, "properties", function( error, response ) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						var info = {};
						if( !response.hasOwnProperty("Image") || !response.Image.hasOwnProperty("Format")) {
							msg.payload = {
								statusCode: 200,
								statusMessage: "No camera info",
								body: response
							}
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
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
								msg.payload.action = action;
								msg.payload.address = device.address;
								node.error(response.statusMessage, msg);
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
							node.send(msg);
						});
					});
				break;

				case "Get image settings":
					VapixWrapper.Param_Get( device, "ImageSource.I0.Sensor", function( error, response ) {
						if( error ) {
							msg.payload = response;
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
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
								msg.payload.action = action;
								msg.payload.address = device.address;
								node.error(response.statusMessage, msg);
								return;
							}
							settings.DayLevel = parseInt(response.I0.DayNight.ShiftLevel);
							if( response.I0.IrCutFilter === "yes")
								settings.DayLevel = 100;
							if( response.I0.IrCutFilter === "no")
								settings.DayLevel = 0;
							msg.payload = settings;
							node.send(msg);
						});
					});
				break;

				case "Set image settings":
					if( typeof options === "string" )
						options = JSON.parse(options);
					
					var sensor = JSON.parse( JSON.stringify(options) );
					sensor.WDR = sensor.WDR ? "on":"off";
					delete sensor.DayLevel;
					VapixWrapper.Param_Set( device, "ImageSource.I0.Sensor", sensor, function( error, response ) {
						if( error ) {
							msg.payload = response;
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						if( !options.hasOwnProperty("DayLevel") ) {
							msg.payload = {
								statusCode: 400,
								statusMessage: "Invalid input",
								body: "Missing DayLevel"
							}
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
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
								msg.payload = response;
								msg.payload.action = action;
								msg.payload.address = device.address;
								node.error(response.statusMessage, msg);
								return;
							}
							msg.payload = options;
							node.send(msg);
						});
					});
				break;

				case "Recordings":
					VapixWrapper.Recordings( device, msg.payload, function(error,response ) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						msg.payload.forEach( function(item){
							item.url = device.protocol + "://" + device.address;
							item.url += "/axis-cgi/record/export/exportrecording.cgi?schemaversion=1&exportformat=matroska";
							item.url += "&recordingid=" + item.id;
							item.url += "&diskid=" + item.storage;
						})
						node.send( msg );
					});
				break;

				case "Export Recording":
					if( !msg.payload.hasOwnProperty("storage") || !msg.payload.hasOwnProperty("id") ) {
						msg.payload = {
							statusCode: 400,
							statusMessage: "Invalid input",
							body: "Missing property storage or id"
						}
						node.error("Invalid Input", msg );
						return;
					}
					var cgi = "/axis-cgi/record/export/exportrecording.cgi?schemaversion=1&exportformat=matroska";
					cgi += "&recordingid=" + msg.payload.id;
					cgi += "&diskid=" + msg.payload.storage;
					VapixWrapper.HTTP_Get( device, cgi, "blob", function(error, response) {
						msg.payload = response;
						if( error ) {
							msg.payload.action = action;
							msg.payload.address = device.address;
							node.error(response.statusMessage, msg);
							return;
						}
						node.send( msg );
					});
				break;

				case "Set video filter":
					var filter = node.options;
					var postData = {
						"apiVersion": "1.0", 
						"method": "set",
						"params":{"flagValues":{"graphics_udvd":true}}
					}
					VapixWrapper.HTTP_Post(device,'/axis-cgi/featureflag.cgi',postData, "text", function(error,response){
						if( error ) {
							node.send([null,msg]);
							return;
						}
						postData = {
							"apiVersion": "1.0", 
							"method": "toggle_filter", "param": { "type": "none"}
						};
						var filter = node.options;
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

						VapixWrapper.HTTP_Post(device,'/axis-cgi/udvd/udvd.cgi',postData, "text", function(error2,response2){
							if( error2 ) {
								msg.payload = response2;
								node.send([null,msg]);
								return;
							}
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

