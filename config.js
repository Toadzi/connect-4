// config.js content

const config = {
	rows: 6,
	cols: 7,
	connect: 4,
	aiDelay: 500,
	depth: 4,
	algorithm: 'minimax',
	colorai: '#4caf50',
	colorplayer: '#e91e63',
	clickLockoutPeriod: 2000, // 2000 Millisekunden = 2 Sekunden Sperre nach einem Klick
	clickDurationRequired: 2000, // 2000 Millisekunden = 2 Sekunden
	clickThreshold: 0.07 // Schwellenwert
};

export default config;
