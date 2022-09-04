//Copyright (c) 2021-2022 Fred Juhlin

module.exports = function(RED) {
	function Axis_Preset_Node(config) {
		RED.nodes.createNode(this,config);
		this.name = config.name;
		this.address = config.address;
		this.user = config.user;
		this.password = config.password;
		this.protocol = config.protocol;
	}
	
	RED.nodes.registerType("Device Access", Axis_Preset_Node,{
		defaults: {
			name: {type: "text"},
			address: {type: "text"},
			protocol: {type:"text"}
		},
		credentials: {
			user: {type: "text"},
			password: {type:"password"}
		}		
	});
}

