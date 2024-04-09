//Copyright (c) 2021-2024 Fred Juhlin

const VapixWrapper = require('./vapix-wrapper');
const xml2js = require('xml2js');
const fs = require("fs");

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
				msg.payload = "Missing one or more attributes (address,user,password)";
				node.error("Access failed",msg);
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
							node.error("JPEG Imaged failed on " + device.address, msg);
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
							node.error("Start recording failed on " + device.address, msg);
							return;
						}
						var parser = new xml2js.Parser({
							explicitArray: false,
							mergeAttrs: true
						});
						parser.parseString(response, function (err, result) {
							if( err ) {
								msg.payload = "Invalid XML response from camera";
								node.error("Start recording failed on " + device.address, msg);
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
							msg.payload = result;
							node.error( "Start recording failed on " + device.address, msg);
						});
					});
				break;

				case "Stop recording":
					if( typeof msg.payload !== "string" || msg.payload.length < 10 ) {
						msg.payload = "Input must be a valid recording ID string";
						node.error("Stop recording failed on " + device.address,msg);
						return;
					}
					var id = msg.payload;
					var cgi = "/axis-cgi/record/stop.cgi?recordingid=" + msg.payload;
					VapixWrapper.HTTP_Get( device, cgi, "text", function( error, response) {
						if( error ) {
							msg.payload = response;
							node.error("Stop recording failed on " + device.address,msg);
							return;
						}
						msg.payload = id;
						node.send(msg);
					});
				break;

				case "Camera Info":
					VapixWrapper.Param_Get( device, "properties", function( error, response ) {
						msg.payload = response;
						if( error ) {
							node.error("Camera Info failed on " + device.address, msg);
							return;
						}
						var info = {};
						if( !response.hasOwnProperty("Image") || !response.Image.hasOwnProperty("Format")) {
							msg.payload = "No camera info";
							node.error("Camera Info failed on " + device.address, msg);
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
								node.error("Camera Info failed on " + device.address, msg);
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
							node.error("Get image settings failed on " + device.address, msg);
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
								node.error("Get image settings failed on " + device.address, msg);
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
							node.error("Set image settings failed on " + device.address, msg);
							return;
						}
						if( !options.hasOwnProperty("DayLevel") ) {
							msg.payload = "Missing propertry DayLevel";
							node.error("Set image settings failed on " + device.address, msg);
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
								node.error("Set image settings failed on " + device.address, msg);
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
							node.error("List Recordings failed on " + device.address, msg);
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
						msg.payload = "Missing property storage or id";
						node.error("Export Recording failed on " + device.address, msg );
						return;
					}
					var cgi = "/axis-cgi/record/export/exportrecording.cgi?schemaversion=1&exportformat=matroska";
					cgi += "&recordingid=" + msg.payload.id;
					cgi += "&diskid=" + msg.payload.storage;
					VapixWrapper.HTTP_Get( device, cgi, "blob", function(error, response) {
						msg.payload = response;
						if( error ) {
							node.error("Export Recording failed on " + device.address, msg );
							return;
						}
						node.send( msg );
					});
				break;

				case "Upload overlay":
					node.status({fill:"blue",shape:"dot",text:"Uploading image..."});
					if( typeof options === "string" )
						options = JSON.parse( options );

					VapixWrapper.Upload_Overlay( device, filename, options, function(error, response){
						msg.payload = response;
						if( error ) {
							node.status({fill:"red",shape:"dot",text:"Upload failed"});
							node.error("Upload overlay failed on " + device.address, msg);
							return;
						}
						if( msg.payload.hasOwnProperty("error") ) {
							msg.payload = msg.payload.error;
							node.error("Upload overlay failed on " + device.address, msg);
							return;
						}
						node.status({fill:"green",shape:"dot",text:"Upload success"});
						node.send(msg);
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

