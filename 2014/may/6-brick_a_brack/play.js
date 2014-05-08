var mapWidth;
var mapHeight;
var tileSize = 32;

var spawnPoint = {x: 6, y:2};

var score = 0;

// haha. OK.
// Z, S, J, O, T, I, L
var pieces = 
	[
			[[0,0,1,0,1,1,2,1],[2,0,2,1,1,1,1,2],[0,1,1,1,1,2,2,2],[1,0,1,1,0,1,0,2]] // Z
		,	[[0,1,1,1,1,0,2,0],[1,0,1,1,2,1,2,2],[0,2,1,2,1,1,2,1],[0,0,0,1,1,1,1,2]] // S
		,	[[0,0,0,1,1,1,2,1],[2,0,1,0,1,1,1,2],[0,1,1,1,2,1,2,2],[1,0,1,1,1,2,0,2]] // J
		,	[[1,0,1,1,2,1,2,0],[1,0,1,1,2,1,2,0],[1,0,1,1,2,1,2,0],[1,0,1,1,2,1,2,0]] // O
		,	[[0,1,1,1,1,0,2,1],[1,0,1,1,2,1,1,2],[0,1,1,1,2,1,1,2],[1,0,0,1,1,1,1,2]] // T
		,	[[0,1,1,1,2,1,3,1],[2,0,2,1,2,2,2,3],[0,2,1,2,2,2,3,2],[1,0,1,1,1,2,1,3]] // I
		,	[[0,1,1,1,2,1,2,0],[1,0,1,1,1,2,2,2],[0,2,0,1,1,1,2,1],[0,0,1,0,1,1,1,2]] // L
	];

var blankTileIndex = -1;

var activePiece = false;

var testBool = true;
var fallDelay = 1000;
var nextFall = 0;
var pieceDelta = {x: 0, y:0};
var pieceNum = 0;
var pieceRotation = 0;
var difficulty = 1;
var difficultyScaleValue = 16;

var restartAfter 		= 2000;	
var gameRestarting 	= false;
var restartAt 			= 0;
var restartFudge 		= 0.5;

var repeatDelay = 100;
var nextInput = 0;

var keyDown = null;

var downPressed = false;
var gameOver = false;

var play_state = {
	create: function()
	{
		game.physics.startSystem(Phaser.Physics.ARCADE);

		mapWidth 	= game.width  / tileSize;
		mapHeight = game.height / tileSize;

		score = 0;

		this.initializeTilemap();
		this.initializeLayers();
		this.initializeInput();
		this.initializeLabels();

		this.game.time.advancedTiming = true;

		this.sound['partial']		= this.game.add.audio('partial');
		this.sound['full']			=	this.game.add.audio('full');
		this.sound['music']			= this.game.add.audio('music');
		
		this.sound['music'].play('', 1.53, 0.5, true, true);

		this.spawnPiece();
	},

	update: function()
	{
		if(gameOver){return;}
		var alreadyLanded = this.handleInput();
		if( game.time.now > nextFall && !alreadyLanded)
		{
			if(! this.checkCollision({x:0, y:1}) )
			{
				this.pieceFalls();
			}
			else 
			{
				this.pieceLanded();
			}
		}
	},

	handleInput: function()
	{
		if(keyDown != null && game.time.now >= nextInput )
		{
			nextInput = game.time.now + repeatDelay;
			if(			!this.game.input.keyboard.isDown(keyDown)
					&&	!this.game.input.keyboard.justPressed(keyDown) )
			{
				keyDown = null
				return false;
			}
			switch(keyDown)
			{
				case Phaser.Keyboard.UP:
					if(!this.checkCollision({x:0, y:0}, true))
					{
						this.rotatePiece(1);
					}
					break;
				case Phaser.Keyboard.DOWN:
					if(!this.checkCollision({x:0, y:1}))
					{
						this.pieceFalls();
					}
					else
					{
						this.pieceLanded();
						return true;
					}
					break;
				case Phaser.Keyboard.LEFT:
					if(!this.checkCollision({x:-1, y:0}))
					{
						this.shiftPiece(-1);
					}
					break;
				case Phaser.Keyboard.RIGHT:
					if(!this.checkCollision({x:1, y:0}))
					{
						this.shiftPiece(1);
					}
					break;
			}
		}
		return false;
	},

	// check if shifting by delta would collide with anything
	checkCollision: function(delta, rotation)
	{
		rotation		 = typeof rotation		 !== 'undefined' ? rotation 		: false;

		var tempTile;
		for(var i=0; i<pieces[pieceNum][pieceRotation].length; i+=2)
		{
			tempTile = this.map.getTile(pieces[pieceNum][pieceRotation][i] 		+ pieceDelta.x + delta.x,
																	pieces[pieceNum][pieceRotation][i+1] 	+ pieceDelta.y + delta.y,
																	this.brickLayer);

			if(tempTile && tempTile.index != blankTileIndex)
			{
				return true;
			}
		}

		if(rotation)
		{
			var tempRotation = (pieceRotation+1+4)%4;
			for(var i=0; i<pieces[pieceNum][tempRotation].length; i+=2)
			{
				tempTile = this.map.getTile(pieces[pieceNum][tempRotation][i] 		+ pieceDelta.x + delta.x,
																		pieces[pieceNum][tempRotation][i+1] 	+ pieceDelta.y + delta.y,
																		this.brickLayer);
				if(tempTile && tempTile.index != blankTileIndex)
				{
					return true;
				}
			}
		}

		return false;
	},

	pieceLanded: function()
	{
		if(activePiece)
		{
			this.clearPiece();
			this.placePiece(this.brickLayer);
		}

		activePiece = false;

		if(!this.checkLines())
		{
			this.spawnPiece();
		}
	},

	checkLines: function()
	{
		var lineList = new Array();
		for(var i=this.map.height-2; i>1; i--)
		{
			var blankFound = false;
			for(var j=1; j<this.map.width-1; j++)
			{
				var tempTile = this.map.getTile(j,i,this.brickLayer);
				if(tempTile && tempTile.index == blankTileIndex)
				{
					blankFound = true;
				}
			}
			if(!blankFound)
			{
				lineList.push(i);
			}
		}
		if(lineList.length > 0)
		{
			this.removeLines(lineList);
			return true;
		}
		return false;
	},

	removeLines: function(lineList)
	{
		for(var i=0; i<lineList.length; i++)
		{
			var y = lineList[i];
			for(var x=1; x<this.map.width-1; x++)
			{
				this.map.putTile(blankTileIndex, x, y, this.brickLayer);
			}
		}
		if(lineList.length == 4)
		{
			this.sound['full'].play();
			this.lineGravity(lineList);
		}
		else if(lineList.length > 0)
		{
			this.sound['partial'].play();
			this.lineGravity(lineList);
		}
		this.addScore(lineList.length);
		this.updateLabels();
	},

	addScore: function(size)
	{
		score += 3*(size*size + 2*difficulty);
		if(score >= difficulty*100)
		{
			difficulty++;
		}
	},

	updateLabels: function()
	{
		this.label_level.text = "Level: "+difficulty;
		this.label_score.text = "Score: "+score;
	},

	lineGravity: function(lineList)
	{
		var linesDelta = new Array();

		for(var i=0; i<this.map.height; i++)
		{
			linesDelta.push(0);
		}

		for(var i=0; i<lineList.length; i++)
		{
			linesDelta[lineList[i]]=-1;
			for(var j=lineList[i]; j>0; j--)
			{
				if(linesDelta[j] != -1)
				{
					linesDelta[j]++;
				}
			}
		}
		// linesDelta now represents how far that line needs to move down
		for(var i=linesDelta.length-1; i>=0; i--)
		{
			if(linesDelta[i] != 0 && linesDelta[i] != -1)
			{
				// some other integer, so we need to move
				var newY = i+linesDelta[i];
				var tempTile;
				var index = -1;

				for(var j=1; j<this.map.width-1; j++)
				{
					tempTile = this.map.getTile(j,i,this.brickLayer)
					if(tempTile)
					{
						this.map.putTile(tempTile.index, j, newY, this.brickLayer);
						this.map.putTile(blankTileIndex, j, i, this.brickLayer);					
					}
				}
			}
		}
	},

	pieceFalls: function()
	{
		this.clearPiece();

		pieceDelta.y++;
		this.placePiece(this.activeLayer);

		nextFall = game.time.now + (fallDelay*(1-difficulty/difficultyScaleValue));
	},

	spawnPiece: function()
	{
		activePiece = true;
		pieceDelta.x = spawnPoint.x;
		pieceDelta.y = spawnPoint.y;

		pieceNum = Math.floor(Math.random()*7);
		pieceRotation = 0;

		this.placePiece(this.activeLayer);

		nextFall = game.time.now + (fallDelay*(1-difficulty/difficultyScaleValue));

		if(this.checkCollision({x:0,y:0})){
			this.gameOver();
		}
	},

	gameOver: function()
	{
		gameOver = true;
		game.time.events.add(	Phaser.Timer.SECOND * ((restartAfter/1000)-restartFudge), 
	 	function()
	 	{
	 		gameOver = false;
	 		this.sound['music'].stop();
	 		this.game.state.start('play');
	 	},
	 	this);
	},

	clearPiece: function()
	{
		for(var i=0; i<pieces[pieceNum][pieceRotation].length; i+=2)
		{
			this.map.putTile(blankTileIndex,	pieces[pieceNum][pieceRotation][i] 	+ pieceDelta.x,
																				pieces[pieceNum][pieceRotation][i+1] + pieceDelta.y,
																				this.activeLayer);
		}
	},


	placePiece: function(layer)
	{
		for(var i=0; i<pieces[pieceNum][pieceRotation].length; i+=2)
		{
			this.map.putTile(pieceNum, 	pieces[pieceNum][pieceRotation][i] 	+ pieceDelta.x,
																	pieces[pieceNum][pieceRotation][i+1] + pieceDelta.y,
																	layer);
		}
	},

	// #########################################################################
	// Input handling

	rotatePiece: function(direction)
	{
		this.clearPiece();
		
		pieceRotation = (pieceRotation+direction+4)%4;

		this.placePiece(this.activeLayer);
	},

	shiftPiece: function(deltaX)
	{
		this.clearPiece();
		pieceDelta.x+=deltaX;
		this.placePiece(this.activeLayer);
	},

	// #########################################################################
	// Init helpers

	initializeInput: function()
	{
		var boomKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		boomKey.onDown.add( function(){ this.keyPressed(Phaser.Keyboard.DOWN ); }, this);

		var cursorKeys = this.game.input.keyboard.createCursorKeys();

		cursorKeys.up.onDown.add(	function(){		 this.keyPressed( Phaser.Keyboard.UP 	 )}, this);
		cursorKeys.down.onDown.add(	function(){  this.keyPressed( Phaser.Keyboard.DOWN  )}, this);
		cursorKeys.left.onDown.add(	function(){	 this.keyPressed( Phaser.Keyboard.LEFT	 )}, this);
		cursorKeys.right.onDown.add( function(){ this.keyPressed( Phaser.Keyboard.RIGHT )}, this);
	},

	keyPressed: function(key)
	{
		keyDown = key;
	},

	initializeTilemap: function()
	{
		this.map = this.game.add.tilemap(null, tileSize, tileSize, mapWidth, mapHeight);
		this.map.addTilesetImage('blocks');
	},

	initializeLayers: function()
	{
		this.activeLayer		= this.map.createBlankLayer("activeLayer",
													this.map.width, this.map.height,
													tileSize, tileSize);

		this.brickLayer			= this.map.createBlankLayer("brickLayer",
													this.map.width, this.map.height,
													tileSize, tileSize);
		for(var i=0; i<this.map.width; i++)
		{
			this.map.putTile(7,	i, 0, this.brickLayer);
			this.map.putTile(7,	i, this.map.height-1, this.brickLayer);
		}
		for(var i=0; i<this.map.height; i++)
		{
			this.map.putTile(7,	0, i, this.brickLayer);
			this.map.putTile(7,	this.map.width-1, i, this.brickLayer);
		}
	},

	initializeLabels: function()
	{
		var style = { font: "28px Arial", fill: '#FF00FF'};
		this.label_score = this.game.add.text( 40, 40, "Score: 0", style);
		this.label_level = this.game.add.text( this.game.width-160, 40, "Level: 1", style);
		this.label_score.setShadow(2,2,"rgba(0,0,0,1)",1);
	},
};