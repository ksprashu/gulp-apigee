module.exports.import = {
	properties: {
		options: {
			required: true,
			type: 'object',
			message: 'is required',
			properties: {
				org: {
					type: 'string',
					required: true
				},
				api: {
					type: 'string',
					required: true
				},
				username: {
					type: 'string',
					required: true
				},
				password: {
					type: 'string',
					required: true
				}
			}
		},
		bundle: {
			required: true,
			type: 'object',
			message: 'is required',
			properties: {
				contents: {
					required: true
				}
			}
		}
	}
};

module.exports.deploy = {
	properties: {
		options: {
			required: true,
			type: 'object',
			message: 'is required',
			properties: {
				org: {
					required: true,
					type: 'string'
				},
				env: {
					required: true,
					type: 'string'
				},
				api: {
					required: true,
					type: 'string'
				},
				revision: {
					required: true,
					type: 'string'
				},
				override: {
					required: true,
					type: 'boolean'
				}, 
				delay: {
					required: true,
					type: 'integer'
				},
				username: {
					required: true,
					type: 'string'
				},
				password: {
					required: true,
					type: 'string'
				}
			}
		}
	}
};
