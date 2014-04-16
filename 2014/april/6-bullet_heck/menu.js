var menu_state = {
	create: function() {
		var space_key = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		space_key.onDown.add(this.start, this);
	},

	start: function() {
		this.game.state.start('play');
	}
};