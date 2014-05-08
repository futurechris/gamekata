var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = "#000000";

		this.game.load.spritesheet('blocks',					'assets/sprites/blocks.png', 32, 32);

		this.game.load.audio('partial',								'assets/sfx/flagdrop.wav');
		this.game.load.audio('full',									'assets/sfx/flagreturn.wav');

		this.game.load.audio('music',									"assets/music/Szymon_Matuszewski_-_Space_walk.mp3", true);
	},

	create: function() {
		this.game.state.start('play');
	}
};