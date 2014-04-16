var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = "#330000";

		this.game.load.spritesheet('duotone_simple', 	'assets/sprites/simpleGraphics_tiles32x32_0.png', 32, 32);
	},
	
	create: function() {
		this.game.state.start('play');
	}
};