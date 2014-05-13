var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = "#9999FF";

		this.game.load.spritesheet('meteor',   'assets/sprites/MeteorRepository1Icons_16s_cleaned.png', 16, 16, -1, 0, 1);
		this.game.load.image('background', 'assets/sprites/snowbackground_smaller.png');
	},
	create: function() {
		this.game.state.start('play');
	}
};