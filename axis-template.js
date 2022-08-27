const VapixWrapper = require('vapix-wrapper');

module.exports = function(RED) {
	
    function AXIS_Template(config) {
		RED.nodes.createNode(this,config);
		this.preset = config.preset;		
		this.action = config.action;
		this.data = config.data;
		this.options = config.options;
		var node = this;
		
		node.on('input', function(msg) {
			node.status({});
			var device = {address: null,user: null,password: null,protocol: "http"}

			var preset = RED.nodes.getNode(node.preset);
			if( preset ) {
				device.address = preset.address;
				device.user = preset.credentials.user;
				device.password = preset.credentials.password;
				device.protocol = preset.protocol || "http";
			}
			if( msg.address ) device.address = msg.address;
			if( msg.user ) device.user = msg.user;
			if( msg.password ) device.password = msg.password;

			var action = msg.action || node.action;
			var data = node.data || msg.payload;
			var options = msg.options || node.option;
			
//			console.log("axis-template", {address: device.address,action: action,data: data,options: options});

			switch( action ) {
				case "Get":
					msg.payload = {
						action: action,
						data: data,
						options: options
					}
					node.warn("Not yet implemented");
					node.send(msg);
				break;
				case "Set":
					msg.payload = {
						action: action,
						data: data,
						options: options
					}
					node.warn("Not yet implemented");
					node.send(msg);
				break;
			}
        });
    }
	
    RED.nodes.registerType("axis-template",AXIS_Template,{
		defaults: {
			preset: {type:"axis-preset"},
			action: { type:"text" },
			data: { type:"data" },
			options: { type:"text" }
		}		
	});
}
