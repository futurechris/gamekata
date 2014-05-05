var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = "#aaaaaa";
		this.game.load.spritesheet('protagonist', 		'assets/sprites/protagonist.png', 32, 32);
		this.game.load.spritesheet('duotone_simple', 	'assets/sprites/simpleGraphics_tiles32x32_0.png', 32, 32);
		this.game.load.spritesheet('bomb_party', 			'assets/sprites/bomb_party_v3.png', 16, 16);

		this.game.load.image('floor', 								'assets/sprites/bomb_party_grass_tile_32x32.png');
		this.game.load.image('power', 								'assets/sprites/bomb_size_upgrade.png');
		this.game.load.image('count', 								'assets/sprites/bomb_count_upgrade.png');

		this.game.load.audio('bomb',									'assets/sfx/explode.wav');
		this.game.load.audio('upgrade',								'assets/sfx/itempick2.wav');
		this.game.load.audio('victory',								'assets/sfx/round_end.wav');
		this.game.load.audio('place',									'assets/sfx/land.wav');

		this.game.load.audio('music',									"assets/music/Rainbow_(promodj.com).mp3");
	},

	create: function() {
		this.game.state.start('play');
	}
};