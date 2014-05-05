var playerSpeed = 200;
var tileSize = 32;
var playerBodyShrink = 4;

var bombOffset 		= {dx: -4, 	dy: -2};
var explodeOffset	= {dx: 4,		dy: 0 };
var countShiftedLeft = false;
var powerShiftedLeft = false;

var bombGroupSize = 100;//00;
var explosionGroupSize = 100;

var bombLifetime = 3000; // in ms
//var bombPower = 1;
//var maxBombCount = 1;
//var _currentBombCount = 0;

var powerChance = 0.15;
var countChance = 0.15;
var brickChance = 0.94;

var mapWidth  = 20; 
var mapHeight = 15;
var mapData		= new Array();
var brickIndex = 5;

var directionNames = [ 'up', 'down', 'left', 'right' ];
var directionUnits = {};
directionUnits['up'] 		= { x: 0, y: -1 };
directionUnits['down'] 	= { x: 0, y: 	1 };
directionUnits['left'] 	= { x:-1, y: 	0 };
directionUnits['right'] = { x: 1, y: 	0 };

var playerStartCoords = [
														{ x: 	1, 	y: 1  }
													,	{ x: 18, 	y: 1  }
													,	{ x: 18, 	y: 13 }
													,	{ x: 	1, 	y: 13 }
												];
var numPlayers 			= 4;
var restartAfter 		= 4000;	
var gameRestarting 	= false;
var restartAt 			= 0;
var restartFudge 		= 0.5;

// AI values
var chaseChance				= 0.05;
var bombChance				= 0.45;
var huntChance				= 0.25;
var planningDelay 		= 750;
var aggressionFactor 	= 100;
var baseAggression		=	200;
var aggressionRNG			= 200;

// some pool variables
var _reachabilityPool = new Array();

var play_state = {
	create: function()
	{
		game.physics.startSystem(Phaser.Physics.ARCADE);

		//this.levelMap = game.add.tilemap('levelMap');
		mapWidth 	= game.width  / tileSize;
		mapHeight = game.height / tileSize;
		playerStartCoords.x = Math.floor(mapWidth/2)+1;
		playerStartCoords.y = Math.floor(mapHeight/2);

		this.initializeSprites();
		this.initializeGroups();
		this.initializeState();
		this.initializeInput();

		this.initializeTilemap();
		this.initializeLayers();

		this.initializeMapData();
		//this.initializeMap();

		this.game.time.advancedTiming = true;
		this.inputQueue = new Array();

		this.initializeAI();

		this.initializeLabels();

		this.game.stage.disableVisibilityChange = true;

		this.game.audio = {};
		this.sound['bomb'] 		= this.game.add.audio('bomb');
		this.sound['upgrade'] 	= this.game.add.audio('upgrade');
		this.sound['victory'] 	= this.game.add.audio('victory');
		this.sound['place'] 		= this.game.add.audio('place');
		this.sound['music'] 		= this.game.add.audio('music');

		gameRestarting = false;
		this.sound['music'].play('',0,0.5,true,true);

/*
		for(var i=0; i<this.playerGroup.length; i++){
			console.log(this.map.getTile(
				Math.floor(this.playerGroup.getAt(i).x/tileSize),
				Math.floor(this.playerGroup.getAt(i).y/tileSize),
				this.dynamicLayer
			));
		}
		*/
	},

	update: function()
	{
		if(gameRestarting)
		{
			this.restartLabels();
		}
		else
		{
			this.checkDamage();
			this.handleMovement();
			this.bombInput();
		}
	},

	restartLabels: function()
	{
		this.label_restart_time.text = Math.floor(.9+(restartAt - game.time.now)/1000) + " ";
	},

	// #########################################################################
	// Input handling

	checkDamage: function()
	{
		this.game.physics.arcade.overlap(
								this.playerGroup,
								this.explosionGroup,
								this.handleDamage,
								null, this);
	},

	handleDamage: function(player, explosion)
	{
		player.kill();
		//console.log(this.playerGroup);
		//this.playerGroup.remove(player, true);
		//console.log(this.playerGroup);
		var oldTileX = Math.round(player.position.x / tileSize);
		var oldTileY = Math.round(player.position.y / tileSize);
		this.removeTileHelper(oldTileX, oldTileY, this.dynamicLayer);
		
		if(this.playerGroup.countLiving()<=1){
			gameRestarting = true;
			restartAt = game.time.now+restartAfter;

			if(this.playerGroup.countLiving()==0){
				this.label_victory.visible = false;
				this.label_draw.visible = true;
			} else {
				var winner = this.playerGroup.getFirstAlive();
				this.label_victory.text = "Player "+(winner.number+1)+" wins!";
				this.label_draw.visible = false;
				this.label_victory.visible = true;
			}

			this.label_restart.visible = true;
			this.label_restart_time.visible = true;

			this.game.restarting = true;
			this.startFade(this.sound['music'], 1000, 0.1);
			this.sound['victory'].play('',0,0.5);

			game.time.events.add(	Phaser.Timer.SECOND * ((restartAfter/1000)-restartFudge), 
				 	function()
				 	{
				 		this.game.state.start('play');
				 	},
				 	this);
		}
	},

	startFade: function(song, duration, value){
		value		 = typeof value		 !== 'undefined' ? value 		: 0;
		duration = typeof duration !== 'undefined' ? duration : 1000;
		game.add.tween(song).to({volume:0}, duration, null, true);
	},


	bombInput: function()
	{
		for(var i=0; i<numPlayers; i++)
		{
			if(	 this.playerGroup.getAt(i)._currentBombCount < this.playerGroup.getAt(i).maxBombCount
				&& this.playerGroup.getAt(i).alive)
			{
				if(i==0)
				{
					if(this.game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
					{
						this.placeBomb(this.playerGroup.getAt(i));
					}
				}
				else
				{
					// get #AI decision
				}
			}
		}
	},

	placeBomb: function(player)
	{
		var nearest = {	x: Math.round(player.x/tileSize)
									, y: Math.round(player.y/tileSize)
									};
		// check if there's a bomb in the tile we're nearest
		// if not, place a bomb in that tile
		if( !this.safeHasTile(nearest.x, nearest.y, this.bombLayer) ){
			if( this.bombGroup.countDead() == 0 ){
				return;
			}
			var bomb = this.bombGroup.getFirstDead();

			var tile = this.map.putTile(35, nearest.x, nearest.y, this.bombLayer);
			tile.bomb = bomb;
			bomb.tile = tile;

			bomb.reset(	(nearest.x*tileSize)+bombOffset.dx
								,	(nearest.y*tileSize)+bombOffset.dy
								);
			bomb.animations.play('burn', 3000/bombLifetime, false, true);
			bomb.power = player.bombPower;
			bomb.timer = game.time.events.add(	Phaser.Timer.SECOND * (bombLifetime/1000), 
											 	function()
											 	{
											 		this.detonateBomb(bomb);
											 	},
											 	this);
			bomb.player = player;
			player._currentBombCount++;
			this.sound['place'].play();
		}
	},

	updateLabels: function()
	{
		this.label_count.text = this.playerGroup.getAt(0).maxBombCount;
		this.label_power.text = this.playerGroup.getAt(0).bombPower;

		if(this.playerGroup.getAt(0).maxBombCount>=10 && !countShiftedLeft)
		{
			countShiftedLeft=true;
			this.label_count.position.x -= 13;
		}
		if(this.playerGroup.getAt(0).bombPower>=10 && !powerShiftedLeft)
		{
			powerShiftedLeft=true;
			this.label_power.position.x -= 13;	
		}
	},

	handleMovement: function()
	{
		this.game.physics.arcade.overlap(this.playerGroup, this.powerGroup, this.collectUpgrade, null, this);
		this.game.physics.arcade.overlap(this.playerGroup, this.countGroup, this.collectUpgrade, null, this);

		// introduce #AI movement here
		for(var i=0; i<numPlayers; i++)
		{
			if(	this.playerGroup.getAt(i).moveTween
			 && this.playerGroup.getAt(i).moveTween.isRunning 
			 && !this.playerGroup.getAt(i).shouldReplan
			 )
			{
				continue;
			}
			else
			{
				if(i==0){
					this.humanMovement(i);
				} else if( this.playerGroup.getAt(i).alive ){
					this.robotMovement(i);
				}
			}
		}
	},

	humanMovement: function(playerNumber)
	{
		if(this.inputQueue){
			var humanNum = playerNumber;

			var dX = 0;
			var dY = 0;

			if(this.inputQueue[this.inputQueue.length-1]){
				this.playerGroup.getAt(humanNum).animations.play(this.inputQueue[this.inputQueue.length-1]);

				dX = tileSize * directionUnits[this.inputQueue[this.inputQueue.length-1]].x;
				dY = tileSize * directionUnits[this.inputQueue[this.inputQueue.length-1]].y;
			}
			else
			{
				return;
			}

			this.genericMovement(playerNumber, dX, dY);
		}
	},



	genericMovement: function(playerNumber, x, y)
	{
		//console.log("GM: "+x+","+y);
		if(x != 0 || y != 0){
			var oldX = this.playerGroup.getAt(playerNumber).position.x;
			var oldY = this.playerGroup.getAt(playerNumber).position.y;
			var newX = oldX+x;
			var newY = oldY+y;

			var tileX = Math.round(newX / tileSize);
			var tileY = Math.round(newY / tileSize);
			var oldTileX = Math.round(oldX / tileSize);
			var oldTileY = Math.round(oldY / tileSize);

			if( this.canMove(tileX,tileY))
			{
				this.playerGroup.getAt(playerNumber).moveTween = game.add.tween(this.playerGroup.getAt(playerNumber));

				this.playerGroup.getAt(playerNumber).moveTween.to({ x: newX, y:newY }, playerSpeed, null, true);
				this.removeTileHelper(oldTileX, oldTileY, this.dynamicLayer).playerBody = false;
				this.map.putTile( 35, tileX, tileY, this.dynamicLayer).playerBody = true;
				//console.log("New loc: "+newX/tileSize+", "+newY/tileSize);
				return true;
			}
			else
			{
				//console.log("Can't move to: "+newX/tileSize+", "+newY/tileSize);
				return false;
			}
		}
	},

	// just a wrapper for the different collision layers
	canMove: function(x, y){
		if( 	this.safeHasTile(x, y, this.bombLayer )
			||	this.safeHasTile(x, y, this.dynamicLayer )
			|| 	this.safeHasTile(x, y, this.wallLayer )){
			return false;
		}

		return true;
	},

	collectUpgrade: function(player, upgrade)
	{
		var tile = upgrade.tile;
		
		if(tile.upgradeType && tile.upgradeType==="power")
		{
			this.sound['upgrade'].play();
			player.bombPower			+=	1;

			// and clean up
			this.removeTileHelper(tile.x, tile.y, this.map.upgradeLayer);
			tile.upgrade = false;
			tile.upgradeType = "";
			upgrade.kill();
			this.updateLabels();
		}
		else if(tile.upgradeType && tile.upgradeType==="count")
		{
			this.sound['upgrade'].play();
			player.maxBombCount	+=	1;

			// and clean up
			this.removeTileHelper(tile.x, tile.y, this.map.upgradeLayer);
			tile.upgrade = false;
			tile.upgradeType = "";
			upgrade.kill();
			this.updateLabels();
		}
	},

	// input are added at the end of the list,
	// and the last item is the one that gets obeyed
	inputDown: function(key)
	{
		this.inputQueue.push(key);
	},

	// input can be removed in any order, though.
	inputUp: function(key)
	{
		var position = this.inputQueue.indexOf(key);
		if( position >= 0 )
		{
			this.inputQueue.splice(position, 1);
		}
	},

	detonateBomb: function(bomb, chain)
	{
		chain = typeof chain !== 'undefined' ? chain : false;

		if(bomb.timer){
			this.game.time.events.remove(bomb.timer);
		}
		var power = bomb.power || 1; // default minimum power of 1

		/////////////////////////////
		// Calculate explosion tiles
		var deltas = new Array();
		deltas.push({x: 0, y:-1});
		deltas.push({x: 1, y: 0});
		deltas.push({x: 0, y: 1});
		deltas.push({x:-1, y: 0});

		// Placement cycles 0-3, for the 4 directions.
		// 0 is up, cycles clockwise.
		var coords = new Array();
		for(var i=0; i<4; i++){ coords.push(new Array()); }

		for(var i=1; i<=power; i++){
			// init the four directions
			coords[0].push({x: deltas[0].x*i, y: deltas[0].y*i});
			coords[1].push({x: deltas[1].x*i, y: deltas[1].y*i});
			coords[2].push({x: deltas[2].x*i, y: deltas[2].y*i});
			coords[3].push({x: deltas[3].x*i, y: deltas[3].y*i});
		}


		/////////////////////////////
		// Place center explosion
		var grew = true;
		if( this.explosionGroup.countDead() == 0)
		{
			// unlikely that we'll run out, but to be safe.
			// smarter handling of this might be to grow the group.
			return;
		}

		if(!chain)
		{
			this.sound['bomb'].play();
		}

		var explosion = this.explosionGroup.getFirstDead();
		//explosion.anchor.set(0.5,0.5);

		if( explosion == null )
		{
			bomb.player._currentBombCount--;
			if(chain){
				bomb.visible=false; // using bomb.kill seems to be screwing with the animation.
														// this seems to be a tolerable workaround for now.
			}
			return;
		}

		explosion.reset(bomb.position.x+explodeOffset.dx, bomb.position.y+explodeOffset.dy);
		explosion.animations.play('small', 6, false, true);

		var nearest = {	x: Math.round(bomb.position.x/tileSize)
									, y: Math.round(bomb.position.y/tileSize)
									};
		// remove bomb collision
		//this.map.remove Tile( nearest.x, nearest.y, this.bombLayer);
		this.removeTileHelper( bomb.tile.x, bomb.tile.y, this.bombLayer);


		///////////////////////////////
		// Place explosion extensions
		//grew = false;
		var impacted = new Array();
		for(var i=0; i<4; i++){
			impacted.push(false);
		}
		while(grew){
			grew = false;

			for(var i=0; i<4; i++){
				if(impacted[i])
				{
					continue;
				}
				if( this.explosionGroup.countDead() == 0)
				{
					// unlikely that we'll run out, but to be safe.
					// smarter handling of this might be to grow the group.
					return;
				}

				var placeAt = coords[i].shift();
				if(placeAt){

					// check to see if we collided with a block
					nearest = {	x: Math.round((bomb.position.x+placeAt.x*tileSize)/tileSize)
										, y: Math.round((bomb.position.y+placeAt.y*tileSize)/tileSize)
										};

					if(this.safeHasTile(nearest.x, nearest.y, this.bombLayer)){
						var bombTile = this.map.getTile(nearest.x, nearest.y, this.bombLayer);
						if(bombTile.bomb){
							this.detonateBomb(bombTile.bomb, true);
							impacted[i]=true;
						}

					}
					if(this.safeHasTile(nearest.x, nearest.y, this.upgradeLayer)){
						this.bombDestroysDynamic(nearest.x, nearest.y, this.upgradeLayer);
					}
					if(this.safeHasTile(nearest.x, nearest.y, this.dynamicLayer)){
						// impact and remove that tile
						var tile = this.map.getTile( nearest.x, nearest.y, this.dynamicLayer);
						if( !tile.playerBody && !tile.upgrade )
						{
							impacted[i] = true;
							this.bombDestroysDynamic(nearest.x, nearest.y, this.dynamicLayer);
						}
					}
					if(this.safeHasTile(nearest.x, nearest.y, this.wallLayer)){
						// impact and leave that tile
						impacted[i] = true;
						// then short-circuit.
						continue;
					}

					explosion = this.explosionGroup.getFirstDead();
					//explosion.anchor.set(0.5,0.5);
					if( explosion == null )
					{
						grew = false;
						continue;
					}

					explosion.reset(bomb.position.x+placeAt.x*tileSize+explodeOffset.dx,
												 	bomb.position.y+placeAt.y*tileSize+explodeOffset.dy);
					explosion.animations.play('small', 6, false, true);

					var explodeCollide = this.map.putTile(36, nearest.x, nearest.y, this.bombLayer);

					game.time.events.add(	Phaser.Timer.SECOND * 0.5, // 6 fps, 3 frames = 0.5s
										this.removeTileHelper, this, nearest.x, nearest.y, this.bombLayer);
/*
					game.time.events.add(	Phaser.Timer.SECOND * 0.5, // 6 fps, 3 frames = 0.5s
								 	function()
								 	{
								 		console.log("Removing from... "+nearest.x+", "+nearest.y);
								 		console.log(this.bombLayer.map.getTile(nearest.x, nearest.y, this.bombLayer).index);
								 		this.removeTileHelper(nearest.x, nearest.y, this.bombLayer);
								 	}, );
*/
					grew = true;
				}
			}
		}
		bomb.player._currentBombCount--;
		if(chain){
			bomb.visible=false; // using bomb.kill seems to be screwing with the animation.
													// this seems to be a tolerable workaround for now.
		}
	},

	safeHasTile: function(x, y, layer){
		if( 	this.map.hasTile(x, y, layer)
			&& 	this.map.getTile(x, y, layer).index != -1){
			return true;
		}
		return false;
	},

	removeTileHelper: function(x, y, layer){
		//var tile = this.map.getTile(x, y, layer);
		return this.map.putTile(-1, x, y, layer);
		//return tile;
	},

	bombDestroysDynamic: function(x, y, layer){
		var tile = this.removeTileHelper(x, y, layer);
		if(tile.upgrade)
		{
			tile.upgrade = false;
			tile.upgradeType = "";
			tile.upgradeSprite.kill();
			return;
		}

		// else it's a brick, so let's check for upgrade.
		var check = Math.random();
		if(check < countChance)
		{
			// spawn count
			if( this.countGroup.countDead() > 0 )
			{
				var countUpgrade = this.countGroup.getFirstDead();
				var tile = this.map.putTile(35, x, y, this.upgradeLayer);
				tile.upgradeSprite = countUpgrade;
				tile.upgradeType = "count";
				tile.upgrade = true;
				countUpgrade.tile = tile;

				countUpgrade.reset(x*tileSize, y*tileSize);
			}
		}
		else if(check < countChance+powerChance)
		{
			// spawn power
			if( this.powerGroup.countDead() > 0 )
			{
				var powerUpgrade = this.powerGroup.getFirstDead();
				var tile = this.map.putTile(35, x, y, this.upgradeLayer);
				tile.upgradeSprite = powerUpgrade;
				tile.upgradeType = "power";
				tile.upgrade = true;
				powerUpgrade.tile = tile;

				powerUpgrade.reset(x*tileSize, y*tileSize);
			}
		}

		// and now tell each bot to update
		for(var i=0; i<this.playerGroup.length; i++)
		{
			this.updateReachabilityWith(this.playerGroup.getAt(i), x, y, false);
		}
	},

	// #########################################################################
	// Init helpers


	initializeSprites: function()
	{
		this.groundSprite = this.game.add.tileSprite(0,0,
					this.clp2(Math.max(game.width,game.height)),
					this.clp2(Math.max(game.width,game.height)),
					'floor');
		this.groundSprite.anchor.set(0,0);

		

	},

	initializeGroups: function()
	{
		this.bombGroup = this.game.add.group();

		game.physics.enable(this.bombGroup, Phaser.Physics.ARCADE);

		this.bombGroup.enableBody = true;

		this.bombGroup.createMultiple(bombGroupSize, 'bomb_party', 20);
		this.bombGroup.callAll('animations.add', 'animations', 'burn', [20,28,36], 1);
		this.bombGroup.callAll('scale.setTo', 'scale', 2,2);



		this.explosionGroup = this.game.add.group();
		game.physics.enable(this.explosionGroup, Phaser.Physics.ARCADE);
		this.explosionGroup.enableBody = true;
		this.explosionGroup.createMultiple(explosionGroupSize, 'bomb_party', 47);
		this.explosionGroup.callAll('animations.add', 'animations', 'small', [47,39,31], 6);
		this.explosionGroup.callAll('scale.setTo', 'scale', 2,2);



		this.wallGroup = this.game.add.group();
		
		game.physics.enable(this.wallGroup, Phaser.Physics.ARCADE);
		this.wallGroup.enableBody = true;
		//this.wallGroup.createMultiple(mapWidth*mapHeight, 'duotone_simple', 5);
		//this.wallGroup.callAll('scale.setTo', 'scale', 2,2);



		this.structureGroup = this.game.add.group();
		game.physics.enable(this.structureGroup, Phaser.Physics.ARCADE);
		this.structureGroup.enableBody = true;
		//this.structureGroup.createMultiple(mapWidth*mapHeight, 'duotone_simple', 16);



		this.powerGroup = this.game.add.group();
		game.physics.enable(this.powerGroup, Phaser.Physics.ARCADE);
		this.powerGroup.enableBody = true;
		this.powerGroup.createMultiple(bombGroupSize, 'power');

		this.countGroup = this.game.add.group();
		game.physics.enable(this.countGroup, Phaser.Physics.ARCADE);
		this.countGroup.enableBody = true;
		this.countGroup.createMultiple(bombGroupSize, 'count');

		this.playerGroup = this.game.add.group();

		game.physics.enable(this.playerGroup, Phaser.Physics.ARCADE);
		this.playerGroup.enableBody = true;

		for(var i=0; i<numPlayers; i++)
		{
			var player = this.playerGroup.create(0, 0, 'protagonist', i*4);

			player.animations.add('up', 		[i*4+0]);
			player.animations.add('right', 	[i*4+1]);
			player.animations.add('left', 	[i*4+2]);
			player.animations.add('down', 	[i*4+3]);
			player.animations.play('down');
			player.number = i;

			player.body.setSize(tileSize-playerBodyShrink, tileSize-playerBodyShrink,
													playerBodyShrink/2, playerBodyShrink/2);

			player.bombPower = 1;
			player.maxBombCount = 1;
			player._currentBombCount = 0;
			player.bombOnArrival = false;
			if(i != 0 )
			{
				player.shouldReplan = true;
			}
			player.a_star = new a_star();
		}
	},

	initializeState: function()
	{
		this.score = 0;
		this.bombRange = 0;
		this.walkSpeed = 1.0;

		this.direction = {
			x: 0,
			y: 0
		};
		this.movementKeys = 0;
	},

	log2: function(value)
	{
		return Math.log(value) / Math.log(2);
	},

	// ceiling in powers of 2. I.e., next power of 2.
	clp2: function(value)
	{
		return Math.pow(2,Math.ceil(this.log2(value)));
	},

	initializeInput: function()
	{
		// who's the boom key??!
		//var boomKey = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

		//boomKey.onDown.add(	this.bombDown, this);
		//boomKey.onUp.add(		this.bombUp, this);

		var cursorKeys = this.game.input.keyboard.createCursorKeys();

		cursorKeys.up.onDown.add(	function(){		 this.inputDown( 'up' 	 )}, this);
		cursorKeys.down.onDown.add(	function(){  this.inputDown( 'down'  )}, this);
		cursorKeys.left.onDown.add(	function(){	 this.inputDown( 'left'	 )}, this);
		cursorKeys.right.onDown.add( function(){ this.inputDown( 'right' )}, this);

		cursorKeys.up.onUp.add(	function(){		 this.inputUp( 'up' 	 )}, this);
		cursorKeys.down.onUp.add(	function(){  this.inputUp( 'down'  )}, this);
		cursorKeys.left.onUp.add(	function(){	 this.inputUp( 'left'	 )}, this);
		cursorKeys.right.onUp.add( function(){ this.inputUp( 'right' )}, this);

		this.game.input.onTap.add( this.AITap, this );

	},

	initializeMapData: function()
	{
		var carveList = new Array();
		for(var vert=0; vert<mapHeight; vert++){
			//mapData.push(new Array());
			for(var horiz=0; horiz<mapWidth; horiz++)
			{
				if(vert==0 || vert==(mapHeight-1) || horiz==0 || horiz==(mapWidth-1) )
				{
					//mapData[vert].push({tile:2});
					this.map.putTile(16,horiz,vert,this.wallLayer);
				}
				else
				{
					if(		vert%2==0
						&&	((horiz<=9 && horiz%2==0) ||	(horiz>9 && (horiz+1)%2==0 )) )
					{
						this.map.putTile(16,horiz, vert, this.wallLayer);
					} else {
						if(Math.random()<brickChance)
						{
							this.map.putTile(brickIndex,horiz, vert, this.dynamicLayer);
						}
						else
						{
							carveList.push({x: horiz, y: vert});
						}
					}
				}
			}
		}
		
		this.playerCarve();
		this.mapCarve(carveList);
	},

	carve: function(x, y, layer)
	{
		// remove the tiles adjacent to it, if they're not a wall			
		for(var vert=y-1; vert<=y+1; vert++)
		{
			this.removeTileHelper(x, vert, layer);
		}
		for(var horiz=x-1; horiz<=x+1; horiz++)
		{
			this.removeTileHelper(horiz, y, layer);
		}
	},

	mapCarve: function(list)
	{
		for(var i=0; i<list.length; i++)
		{
			this.carve(list[i].x, list[i].y, this.dynamicLayer);
		}
	},

	playerCarve: function()
	{
		// for each player
		var spotsAvailable = new Array();
		for(var i=0; i<playerStartCoords.length; i++)
		{
			spotsAvailable.push(i);
		}
		for(var i=0; i<numPlayers; i++)
		{
			// give them a position from the remaining available
			var index 		= Math.floor(Math.random()*spotsAvailable.length);
			var position 	= spotsAvailable.splice(index,1)
			var coords 		= playerStartCoords[position];

			this.carve(coords.x, coords.y, this.dynamicLayer);

			this.playerGroup.getAt(i).reset(coords.x*tileSize, coords.y*tileSize);

			this.map.putTile( 35, coords.x, coords.y, this.dynamicLayer);
		}

	},

	initializeMap: function()
	{
		for(var vert=0; vert<mapHeight; vert++){
			for(var horiz=0; horiz<mapWidth; horiz++){
				switch(mapData[vert][horiz].tile){
					case 0:
						break;
					case 1:
						var wall = this.wallGroup.getFirstDead();
						//wall.anchor.setTo(0.5,0.5);
						wall.reset(horiz*tileSize, vert*tileSize);
						break;
					case 2:
						var structure = this.structureGroup.getFirstDead();
						//structure.anchor.setTo(0.5,0.5);
						structure.reset(horiz*tileSize, vert*tileSize);
						break;
				}
			}
		}
	},

	initializeTilemap: function()
	{
		this.map = this.game.add.tilemap(null, tileSize, tileSize, mapWidth, mapHeight);
		this.map.addTilesetImage('duotone_simple');
	},

	initializeLayers: function()
	{
		this.bombLayer 			= this.map.createBlankLayer("bombLayer", 
													this.map.width, this.map.height,
													tileSize, tileSize);

		this.dynamicLayer 	= this.map.createBlankLayer("dynamicLayer",
													this.map.width, this.map.height,
													tileSize, tileSize);

		this.wallLayer 			= this.map.createBlankLayer("wallLayer",
													this.map.width, this.map.height,
													tileSize, tileSize);

		this.upgradeLayer 	= this.map.createBlankLayer("upgradeLayer",
													this.map.width, this.map.height,
													tileSize, tileSize);

		this.map.setCollision([5,16],true,this.wallLayer);
		this.map.setCollision([5,16,35],true,this.dynamicLayer);
	},

	initializeLabels: function()
	{
		var style = { font: "28px Arial", fill: '#FFFF00'};

		this.label_count 	= this.game.add.text(		this.game.width-48-2*tileSize, this.game.height-30, "1", style);
		this.sprite_count = this.game.add.sprite( this.game.width-28-2*tileSize, this.game.height-28, 'count');
		this.sprite_count.scale = {x: .8, y: .8};
		this.label_count.setShadow(2,2,"rgba(0,0,0,1)",1);

		this.label_power 	= this.game.add.text(		this.game.width-48, this.game.height-30, "1", style);
		this.sprite_power = this.game.add.sprite( this.game.width-28, this.game.height-28, 'power');
		this.sprite_power.scale = {x: .8, y: .8};

		var restartStyle = { font: "56px Arial", fill: '#FF0000'};
		this.label_restart = this.game.add.text( this.game.width/2-150, this.game.height/2 - 56, "Restarting in ", restartStyle );
		this.label_restart.setShadow(2,2,"rgba(0,0,0,1)",3);
		this.label_restart.visible = false;

		this.label_restart_time = this.game.add.text( this.game.width/2-16, this.game.height/2 + 0, (1+restartAfter/1000)+" ", restartStyle);
		this.label_restart_time.visible = false;

//		var victoryStyle = { font: "56px Arial", fill: '#FF0000'};
		this.label_victory = this.game.add.text( this.game.width/2-165, this.game.height/2 - 112, "Player X wins!", restartStyle);
		this.label_victory.visible = false;

//		var itsADrawStyle = { font: "56px Arial", fill: '#FF0000'};
		this.label_draw = this.game.add.text( this.game.width/2-125, this.game.height/2 - 112, "It's a draw!", restartStyle);
		this.label_draw.visible = false;
	},

	initializeAI: function()
	{
		// loop over players, clearTileReach
		// loop over players, reachability init with current position
		for(var i=0; i<this.playerGroup.length; i++)
		{
			this.clearTileReach(this.playerGroup.getAt(i));
			this.initialReachability(this.playerGroup.getAt(i));
		}
	},

	//////////////////////////////////////////
	// AI functions
	clearTileReach: function(player)
	{
		//console.log("CTR "+player.number);
		player.reach = new Array();
		for(var vert=0; vert<mapHeight; vert++)
		{
			player.reach.push(new Array());
			for(var horiz=0; horiz<mapWidth; horiz++)
			{
				player.reach[vert].push(-1);
			}
		}
	},

	initialReachability: function(player)
	{
		if(player.number == 0){ return; }
		this.updateReachabilityWith(player, Math.round(player.x/tileSize), Math.round(player.y/tileSize),true);
	},

	// adds (x,y), then branches from there.
	// override ignores the "is there something adjacent here already?"
	// so we can initialize.
	updateReachabilityWith: function(player, x, y, override)
	{	
		//console.log("URW "+player.number);
		if(_reachabilityPool.length != 0)
		{
			_reachabilityPool = new Array();
		}

		// test to see if this is adjacent to an existing reachable spot
		if( 	!this.adjacentToReach(player, x, y)
			&&	!override )
		{

			return;
		}


		// add the new point
		_reachabilityPool.push({x:x, y:y});

		var currentPoint;
		var count = 0;
		// loop until empty.
		while(_reachabilityPool.length > 0 && count<10000000)
		{
			// get next point, depth-y
			currentPoint = _reachabilityPool.pop();

			// if not, mark it. It's assumed here that _poolAddAdjacent won't
			// put it in the list if it wasn't a valid square
			// ... and that the initial call doesn't add an invalid square
			player.reach[currentPoint.y][currentPoint.x] = 1;
			count++;

			// and check each point adjacent to that one for reachable
			this._poolAddAdjacent(currentPoint.x, currentPoint.y, player.reach);
		}
	},

	adjacentToReach: function(player, x, y)
	{
		// up
		if(player.reach[y-1][x] != -1)
		{
			return true;
		}
		// down
		if(player.reach[y+1][x] != -1)
		{
			return true;
		}
		// left
		if(player.reach[y][x-1] != -1)
		{
			return true;
		}
		// right
		if(player.reach[y][x+1] != -1)
		{
			return true;
		}
		return false;
	},

	// this function is hyper-ugly. Poor form, brain, poor form.
	_poolAddAdjacent: function(x, y, reach)
	{
		var wallLayerIndex = this.map.getLayer(this.wallLayer);
		var dynamicLayerIndex = this.map.getLayer(this.dynamicLayer);

		// up
		if( 	this.safeTileIndexEqualsCheck(this.map.getTileAbove(wallLayerIndex, x, y), -1)
			&&	this.safeTileIndexEqualsCheck(this.map.getTileAbove(dynamicLayerIndex, x, y), -1)
			&&	reach[y-1][x]==-1)
		{
			_reachabilityPool.push({x:x, y:(y-1)});
		}

		// down
		if( 	this.safeTileIndexEqualsCheck(this.map.getTileBelow(wallLayerIndex, x, y), -1)
			&&	this.safeTileIndexEqualsCheck(this.map.getTileBelow(dynamicLayerIndex, x, y), -1)
			&&	reach[y+1][x]==-1 )
		{
			_reachabilityPool.push({x:x, y:(y+1)});
		}

		// left
		if( 	this.safeTileIndexEqualsCheck(this.map.getTileLeft(wallLayerIndex, x, y), -1)
			&&	this.safeTileIndexEqualsCheck(this.map.getTileLeft(dynamicLayerIndex, x, y), -1)
			&&	reach[y][x-1]==-1)
		{
			_reachabilityPool.push({x:(x-1), y:y});
		}

		// right
		if( 	this.safeTileIndexEqualsCheck(this.map.getTileRight(wallLayerIndex, x, y), -1)
			&&	this.safeTileIndexEqualsCheck(this.map.getTileRight(dynamicLayerIndex, x, y), -1)
			&&	reach[y][x+1]==-1)
		{
			_reachabilityPool.push({x:(x+1), y:y});
		}
	},

	safeTileIndexEqualsCheck: function(tile, index)
	{
		if( 	tile
			&&	(tile.index == index) )
		{
			return true;
		}
		if( tile == null )
		{
			return true;
		}
		return false;
	},

	robotMovement: function(playerNumber)
	{
		var bot = this.playerGroup.getAt(playerNumber);

		var tileX = Math.round(bot.x/tileSize);
		var tileY = Math.round(bot.y/tileSize);

		// check if we're at the destination
		if( 	(bot.destination != null)
			&& 	(bot.destination.x == tileX)
			&&	(bot.destination.y == tileY))
		{
			//console.log("Arrived");
			bot.destination = null;
			bot.plannedPath = null;
			if(bot.bombOnArrival){
				bot.waitForBomb = game.time.now + bombLifetime;
				this.placeBomb(bot);
				this.findSafeSpot(bot, tileX, tileY);
				bot.bombOnArrival = false;
			}
			return;
		}

		if( bot.shouldReplan ){
			bot.plannedPath = null;
			bot.shouldReplan = false;
			bot.a_star.paused = false;
			return;
		}

		if( bot.destination == null )
		{
			if( bot.waitForBomb > game.time.now )
			{
				return;
			}

			var rng = Math.random();
			if(rng < chaseChance){
				this.chasePlayer(bot);
			}
			else if(rng < chaseChance+bombChance)
			{
				this.findBombSpot(bot);
			}
			else if(rng < chaseChance+bombChance+huntChance)
			{
				this.huntPlayer(bot);
			}
			else
			{
				this.findUpgrade(bot);
			}			

			return;
		}


		if( bot.plannedPath == null || bot.plannedPath.length == 0)
		{
			if( game.time.now < bot.planDelay )
			{
				return;
			}
			// make a plan
			var d = new Date();
			var startTime = d.getTime();

			bot.plannedPath = bot.a_star.search({x: tileX, y:tileY}, bot.destination, this.map);

			bot.planDelay = game.time.now + planningDelay;

			if( bot.plannedPath == null || bot.plannedPath.length == 0){
				bot.destination = null;
				return; // apparently can't reach destination. drop it and re-try next cycle
			}
			bot.shouldReplan = false;
		}
		
		//console.log(bot.plannedPath.length);

		// execute plan
		var next;//
		if(bot.plannedPath.length == 0){
			bot.plannedPath = null;
			return;
		}
		next = bot.plannedPath[0];

		var dX 		= (next.x - tileX)*tileSize;
		var dY 		= (next.y - tileY)*tileSize;
		//console.log("GMd:"+dX+","+dY);
		//console.log(next);
		//console.log("bot:"+bot.x+", "+bot.y);
		if(this.genericMovement(playerNumber, dX, dY))
		{
			bot.plannedPath.shift();
			bot.a_star.paused = false;
		}
		else
		{
			//console.log("Killing plan");
			bot.plannedPath = null;
			// replan?
		}
	},

	findClosestCardinal: function(bX, bY, dX, dY)
	{
		var best = 0;
		var bestDist = Number.MAX_VALUE;

		var checkPoint = new Phaser.Point(bX,bY);
		var destPoint = new Phaser.Point(dX,dY);
		var tempDist = 0;

		for(var i=0; i<4; i++)
		{
			checkPoint.set ( bX + directionUnits[directionNames[i]].x,
											 bY + directionUnits[directionNames[i]].y );
			tempDist = Phaser.Point.distance(checkPoint,destPoint);
			if(tempDist < bestDist)
			{
				bestDist = tempDist;
				best = i;
			}
		}
		return best;
	},

	testAngle: function(a, b)
	{
		// return Phaser.Point.angle(a,b);
		return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
	},

	AITap: function(pointer)
	{
		var tileX = Math.floor(pointer.worldX/tileSize);
		var tileY = Math.floor(pointer.worldY/tileSize);
		var tileCX = tileX*tileSize;
		var tileCY = tileY*tileSize;

		var playerX = this.playerGroup.getAt(0).x;
		var playerY = this.playerGroup.getAt(0).y;

		var dX = tileCX - playerX;
		var dY = tileCY - playerY;

		this.bombDestroysDynamic(tileX, tileY, this.bombLayer);
	},

	findUpgrade: function(bot)
	{
		// pursue, gets interrupted when 
		// restart if upgrade gets picked up
		var reachableUpgrade 	= false;
		var nearestUpgradeX 	= -1;
		var nearestUpgradeY 	= -1;
		var nearestUpgradeDistance = Number.MAX_VALUE;
		var tempDist = 0;

		var tempX = 0;
		var tempY = 0;

		for(var i=0; i<this.powerGroup.length; i++)
		{
			if( ! this.powerGroup.getAt(i).alive )
			{
				continue;
				
			}

			tempX = this.powerGroup.getAt(i).x/tileSize;
			tempY = this.powerGroup.getAt(i).y/tileSize;
			if(bot.reach[tempY][tempX] != -1)
			{
				tempDist = Math.abs(tempX - bot.x) 
									+Math.abs(tempY - bot.y);
				if(tempDist < nearestUpgradeDistance){
					nearestUpgradeDistance = tempDist;
					nearestUpgradeX 	= tempX;
					nearestUpgradeY 	= tempY;
					reachableUpgrade 	= true;
				}
			}
		}

		for(var i=0; i<this.countGroup.length; i++)
		{
			if( !this.countGroup.getAt(i).alive )
			{
				continue;
			}

			tempX = this.countGroup.getAt(i).x/tileSize;
			tempY = this.countGroup.getAt(i).y/tileSize;
			if(bot.reach[tempY][tempX] != -1)
			{
				tempDist = Math.abs(tempX - bot.x) 
									+Math.abs(tempY - bot.y);
				if(tempDist < nearestUpgradeDistance){
					nearestUpgradeDistance = tempDist;
					nearestUpgradeX 	= tempX;
					nearestUpgradeY 	= tempY;
					reachableUpgrade 	= true;
				}
			}
		}

		var targetX = nearestUpgradeX;
		var targetY = nearestUpgradeY;

		if(!reachableUpgrade)
		{
			return;
		}

		if(bot.reach[targetY][targetX]){
			//console.log("Bot "+bot.number+" seeks upgrade at "+targetX+", "+targetY);
			bot.destination = {x:targetX, y:targetY};
		}
	},

	chasePlayer: function(bot)
	{
		// for a duration, then reset
		// mark down player number - if player dies, interrupted
		var target = bot.number;
		while(		target==bot.number
					|| !this.playerGroup.getAt(target).alive )
		{
			target = Math.floor(Math.random()*this.playerGroup.length);
		}

		target = 0;

		var targetX = Math.floor(this.playerGroup.getAt(target).x/tileSize);
		var targetY = Math.floor(this.playerGroup.getAt(target).y/tileSize);

		if(bot.reach[targetY][targetX] != -1){
			bot.destination = {x:targetX, y:targetY};

			var botAggro = typeof bot.aggression 	!== 'undefined' ? bot.aggression : 0;

			var time = 		baseAggression
									+	(botAggro*aggressionFactor)
									+ Math.round(Math.random()*aggressionRNG);

			game.time.events.add(	Phaser.Timer.SECOND * (time/1000), 
				 	function()
				 	{
				 		this.shouldReplan = true;
				 		this.plannedPath = null;
				 		this.a_star.paused = false;
				 	},
				 	bot);
		}
	},

	findBombSpot: function(bot)
	{
		// trigger bomb-placing behavior afterwards somehow.
		// what we want is the nearest brick that has a 'reach' adjacent to it
		var target = this.nearestReachableBrick(bot);

		if(target == null)
		{
			//console.log("No bomb target found");
			// unable to find, bail.
			return;
		}

		// otherwise let's walk there and say we're going to put a bomb when we arrive.
		//console.log("Bot "+bot.number+" will bomb at "+target.x+", "+target.y);
		bot.destination = target;
		bot.bombOnArrival = true;
	},

	findSafeSpot: function(bot, x, y)
	{
		var nearestDistance = Number.MAX_VALUE;
		var nearestX = 0;
		var nearestY = 0;
		var found = false;

		var tempTiles;
		var tempDistance = 0;
		for(var vert=1; vert<(mapHeight-1); vert++)
		{
			for(var horiz=1; horiz<(mapWidth-1); horiz++)
			{
				// tile reachable
				//console.log(bot);
				//console.log("V: "+vert+" H:"+horiz+" bot:"+bot.number);
				//console.log(bot.reach);
				if( bot.reach[vert][horiz] != -1 ){
					// check line of sight
					if( ! this.lineOfSight(bot.bombPower, horiz, vert, x, y, this.dynamicLayer))
					{
						// good spot, check if it's nearest
						found = true;
						// check distance to (horiz,vert), update if needed
						tempDistance = Math.abs(bot.x-horiz) + Math.abs(bot.y-vert);
						if(tempDistance < nearestDistance)
						{
							nearestDistance = tempDistance;
							nearestX = horiz;
							nearestY = vert;
						}
					}
				}
			}
		}
		if(found)
		{
			bot.destination = {x: nearestX, y: nearestY};
			//console.log("Bot fleeing own bomb, to "+nearestX+", "+nearestY);

		}
		return null;
	},

	lineOfSight: function(radius, ax, ay, bx, by, layer)
	{
		// check horizontal blast
		if( ay == by )
		{
			// on same line, so do more calculations
			// first, distance
			if( Math.abs(ay-by) <= radius )
			{
				// might be in range, do real LOS
				return true;
			}
		}
		if( ax == bx )
		{
			// on same line, so do more calculations
			// first distance
			if( Math.abs(ax-bx) <= radius )
			{
				// might be in range, do real LOS
				return true;
			}
		}
		return false;
	},

	nearestReachableBrick: function(bot)
	{
		var nearestDistance = Number.MAX_VALUE;
		var nearestX = 0;
		var nearestY = 0;
		var found = false;

		var tempTiles;
		var tempDistance = 0;
		for(var vert=1; vert<(mapHeight-1); vert++)
		{
			for(var horiz=1; horiz<(mapWidth-1); horiz++)
			{
				// tile reachable
				if( bot.reach[vert][horiz] != -1 ){
					// look for bricks
					tempTiles = this.adjacentTiles( horiz, vert, this.dynamicLayer );
					for(var i=0; i<tempTiles.length; i++)
					{
						if(tempTiles[i].index == 5)
						{
							found = true;
							// check distance to (horiz,vert), update if needed
							tempDistance = Math.abs(bot.x-horiz) + Math.abs(bot.y-vert);
							if(tempDistance < nearestDistance)
							{
								nearestDistance = tempDistance;
								nearestX = horiz;
								nearestY = vert;
							}
						}
					}
				}
			}
		}
		if(found)
		{
			return {x: nearestX, y: nearestY};
		}
		return null;
	},

	adjacentTiles: function(x, y, layer)
	{
		var tiles = new Array();
		var layerIdx = this.map.getLayer(layer);
		var tempTile;

		tempTile = this.map.getTileAbove(layerIdx, x, y);
		if(tempTile){ tiles.push(tempTile); }

		tempTile = this.map.getTileBelow(layerIdx, x, y);
		if(tempTile){ tiles.push(tempTile); }

		tempTile = this.map.getTileRight(layerIdx, x, y);
		if(tempTile){ tiles.push(tempTile); }

		tempTile = this.map.getTileLeft(layerIdx, x, y);
		if(tempTile){ tiles.push(tempTile); }

		return tiles;
	},

	huntPlayer: function(bot)
	{
		// check over players, call "find nearest adjacent-to-player", store.
		var list = this.findReachablePlayerAdjacencies(bot);

		// iterate over that list, select nearest one (or shortest one? Add A* path length thing?)
		var nearestIdx = this.nearestInList(list, bot.x, bot.y);

		if(nearestIdx < 0)
		{
			return;
		}

		bot.destination = {x: list[nearestIdx].x, y:list[nearestIdx].y};

		// like chase, set aggression time.
		var botAggro = typeof bot.aggression 	!== 'undefined' ? bot.aggression : 0;

		var time = 		baseAggression
								+	(botAggro*aggressionFactor)
								+ Math.round(Math.random()*aggressionRNG);

		game.time.events.add(	Phaser.Timer.SECOND * (time/1000), 
			 	function()
			 	{
			 		this.shouldReplan = true;
			 		this.plannedPath = null;
			 		this.a_star.paused = false;
			 		this.bombOnArrival = true;
			 	},
			 	bot);

	},

	findReachablePlayerAdjacencies: function(bot)
	{
		var list = new Array();
		var tempBot;
		var subList;


		for(var i=0; i<this.playerGroup.length; i++)
		{
			tempBot = this.playerGroup.getAt(i);
			if( tempBot.number != bot.number )
			{
				// check to see if we can get near that player
				if( this.adjacentToReach(	bot,
																	Math.round(tempBot.x/tileSize),
																	Math.round(tempBot.y/tileSize) ) )
				{
					list.push({	x: Math.round(tempBot.x/tileSize),
											y: Math.round(tempBot.y/tileSize)});
				}
			}
		}

		return list;
	},

	// manhattan dist
	nearestInList: function(list, x, y)
	{
		var nearestDist = Number.MAX_VALUE;
		var nearestIdx = -1;
		var tempDist =  nearestDist;
		for(var i=0; i<list.length; i++)
		{
			tempDist = Math.abs(list[i].x-x) + Math.abs(list[i].y-y);
			if(tempDist < nearestDist)
			{
				nearestDist = tempDist;
				nearestIdx = i;
			}
		}
		return nearestIdx;
	}
};