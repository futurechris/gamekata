var load_state = {
	preload: function() {
		this.game.stage.backgroundColor = '#888888';
		this.game.load.image('hero_down', 'assets/sprites/protag_1_down.png');
		this.game.load.image('hero_up', 	'assets/sprites/protag_1_up.png');
		this.game.load.image('hero_left', 'assets/sprites/protag_1_left.png');
		this.game.load.image('hero_right','assets/sprites/protag_1_right.png');

		this.game.load.image('bullet',		'assets/sprites/bullet_1.png');
		this.game.load.image('potion',   	'assets/sprites/red-potion_0.png');
		this.game.load.image('background', 'assets/sprites/background_3.png');

    game.load.spritesheet('duotone_minimal', 	'assets/sprites/minimalObjects_32x32Tiles.png', 32, 32);
    game.load.spritesheet('duotone_simple', 	'assets/sprites/simpleGraphics_tiles32x32_0.png', 32, 32);
	},
	create: function() {
		this.game.state.start('play');
	}
};