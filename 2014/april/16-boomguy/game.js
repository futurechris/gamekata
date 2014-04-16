
var width 	= 640;
var height 	= 480;
var game 		= new Phaser.Game(width, height, Phaser.AUTO, 'game_div');

game.state.add('load', load_state);
game.state.add('menu', menu_state);
game.state.add('play', play_state);

game.state.start('load');