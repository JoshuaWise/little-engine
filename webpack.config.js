'use strict';

module.exports = {
	target: 'web',
	mode: 'production',
	devtool: 'source-map',
	entry: './src/index.ts',
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
			},
		],
	},
	resolve: {
		extensions: [],
		extensionAlias: {
			'.js': ['.ts'],
		},
	},
	output: {
		filename: 'little-engine.min.js',
		library: {
			name: 'LittleEngine',
			type: 'umd',
			export: 'default',
		},
	},
};
