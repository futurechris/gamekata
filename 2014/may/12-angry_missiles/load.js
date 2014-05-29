var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = "#000033";

		this.game.load.spritesheet('meteor',   	'assets/sprites/MeteorRepository1Icons_16s_cleaned.png', 16, 16, -1, 0, 1);
		this.game.load.spritesheet('bomb_party','assets/sprites/bomb_party_v3.png', 16, 16);

		this.game.load.image('background', 			'assets/sprites/snowbackground_smaller.png');
		
		this.game.load.audio('bomb',						'assets/sfx/explode.wav');
		this.game.load.audio('rocket',					'assets/sfx/boom4.wav');
		
		this.game.load.audio('music',						'assets/music/OldBrokenRadio.mp3');
	},
	create: function() {
		this.game.state.start('play');
	}
};