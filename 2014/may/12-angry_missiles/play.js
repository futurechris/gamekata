var missileStart = {x:80, y:310};
var explodeOffset					= {x: -8, y: -4 };
var missileExplodeOffset	= {x: -24, y: -32 };

var updateDelay = 100;
var renderDelay = 2000;
var nextUpdate = 0;
var nextRender = 0;

var filter;
var tileSize = 16;

var base = 400;
var slotWidth = tileSize * 3;
var slotCount = 1;
var slotEmpty = new Array();
var targetTimer = 1000;
var targetsCount = 1;

var score = 0;

var missilesCount = 1;
var missileVelocity = 450;
var missileGravity = 250;
var inFlight = false;

var tracerLine = new Array();
var tracerSegments = 50;
var tracerDelta = 0;
var lastTracerDeltaReset = 0;
var tracerDeltaSpeed = 100;

var score = 0;

var groundCoords = [
			{ x: 0, 	y: 306 }
		,	{ x: 134, y: 329 }
		,	{ x: 282, y: 364 }
		,	{ x: 421,	y: 347 }
		,	{ x: 547,	y: 341 }
		,	{ x: 810,	y: 368 }
										];
var groundPolygons = new Array();

var play_state = {
	create: function()
	{
		score = 0;
		inFlight = false;
		lastTracerDeltaReset = 0;
		nextUpdate = 0;
		nextRender = 0;

		this.initializeSprites();
		this.initializeInput();
		this.initializeSlots();
		this.initializeTracer();
		this.initializeLabels();
		this.initializeGround();
		initialized = true;

		this.game.stage.smoothed = false;

		this.timer = this.game.time.events.loop(targetTimer, this.spawnTarget, this);
		game.physics.arcade.gravity.y = missileGravity;
		//game.physics.arcade.setBoundsToWorld(true,true,false,true);

		this.game.audio = {};
		this.sound['bomb'] 		= this.game.add.audio('bomb');
		this.sound['rocket'] 	= this.game.add.audio('rocket');
		this.sound['music']		= this.game.add.audio('music');

		this.sound['music'].play('',0,0.67,true,true);
	},


	update: function()
	{
		this.updateTracer(this.game.input.mousePointer);
		
		if(this.game.time.now > nextUpdate){
			this.updateTracer(this.game.input.mousePointer);
			//this.fireTap(this.game.input.mousePointer);
			nextUpdate = this.game.time.now+updateDelay;
		}
		
		for(var i=0; i<this.missileGroup.length; i++)
		{
			if(this.missileGroup.getAt(i).alive)
				this.updateMissileAngle(this.missileGroup.getAt(i));
		}

		this.game.physics.arcade.overlap(this.missileGroup, this.targetGroup, this.targetHit, null, this);
		
		if(inFlight && this.missileGroup.countLiving()==0)
		{
			inFlight = false;
			this.cannonSprite.visible = true;
		}

		if(inFlight)
		{
			for(var i=0; i<this.missileGroup.length; i++)
			{
				if(this.missileGroup.getAt(i).alive)
				{
					if(this.belowGround(this.missileGroup.getAt(i).x,
															this.missileGroup.getAt(i).y))
					{
						console.log("Ground hitting");
						this.groundHit(this.missileGroup.getAt(i));
					}
				}
			}
		}
	},

	groundHit: function(missile)
	{
		if(missile.alive)
		{
			missile.alive = false;
			missile.visible = false;
			var explosion = this.explosionGroup.getFirstDead();
			if(explosion!=null)
			{
				explosion.reset(missile.position.x+missileExplodeOffset.x, 
												missile.position.y+missileExplodeOffset.y);
				explosion.animations.play('small', 6, false, true);
				this.sound['bomb'].play();
			}
		}
	},

	targetHit: function(missile, target)
	{
		if(missile.alive && target.alive)
		{
			this.game.tweens.remove(target.tween);
			missile.alive = false;
			missile.visible = false;
			target.alive = false;
			target.visible = false;
			score++;
			this.updateLabels();

			// create explosion
			var explosion = this.explosionGroup.getFirstDead();
			if(explosion!=null)
			{
				explosion.reset(target.position.x+explodeOffset.x, target.position.y+explodeOffset.y);
				explosion.animations.play('small', 6, false, true);
				this.sound['bomb'].play();
			}
		}
	},

	updateLabels: function()
	{
		this.label_score.text = "Score: "+score;
	},

	////////////////////////////////////
	// Init helper
	initializeSprites: function()
	{
		this.bgSprite = this.game.add.sprite(0,0,'background');
		this.bgSprite.anchor.set(0,0);

		this.tracerGroup = this.game.add.group();
		this.tracerGroup.createMultiple(tracerSegments, 'meteor', 0);
		this.tracerGroup.callAll('anchor.set', 0.5, 0.5);

		this.missileGroup = this.game.add.group();
		game.physics.enable(this.missileGroup, Phaser.Physics.ARCADE);
		this.missileGroup.enableBody = true;
		this.missileGroup.createMultiple(missilesCount, 'meteor', 15);
		this.missileGroup.callAll('scale.setTo', 'scale', 2,2);

		this.targetGroup = this.game.add.group();
		game.physics.enable(this.targetGroup, Phaser.Physics.ARCADE);
		this.targetGroup.enableBody = true;
		this.targetGroup.createMultiple(targetsCount, 'meteor', 72);
		this.targetGroup.callAll('scale.setTo', 'scale', 2,2);

		this.cannonSprite = this.game.add.sprite(missileStart.x,missileStart.y,'meteor',15);
		this.cannonSprite.anchor.set(0.5,0.5);
		this.cannonSprite.scale.x = 2;
		this.cannonSprite.scale.y = 2;

		this.explosionGroup = this.game.add.group();
		this.explosionGroup.createMultiple(10, 'bomb_party', 47);
		this.explosionGroup.callAll('animations.add', 'animations', 'small', [47,39,31], 6);
		this.explosionGroup.callAll('scale.setTo', 'scale', 4,4);
	},

	initializeGround: function()
	{
		for(var i=0; i<(groundCoords.length-1); i++)
		{
			groundPolygons.push(
				new Phaser.Polygon(
					groundCoords[i].x, 	groundCoords[i].y,
					groundCoords[i+1].x,groundCoords[i+1].y,
					groundCoords[i+1].x,this.game.height+200,
					groundCoords[i].x,	this.game.height+200
				)
				);
		}
	},

	initializeInput: function()
	{
		this.game.input.onTap.add( this.fireTap, this );
	},

	initializeLabels: function()
	{
		var style = { font: "28px Arial", fill: '#FFFF00'};

		this.label_score = this.game.add.text(	0, this.game.height-30, "Score: 0", style);
		this.label_score.setShadow(2,2,"rgba(0,0,0,1)",1);
		this.label_score.visible = true;
	},

	fireTap: function(pointer)
	{
		//console.log("P: ("+pointer.x+", "+pointer.y+")");
		var newShot = this.missileGroup.getFirstDead();
		if(newShot === null)
		{
			return;
		}


		newShot.reset(missileStart.x, missileStart.y);
		this.cannonSprite.visible = false;

		//newShot.body.gravity.y = missileGravity;

		var baseDX = (pointer.x - missileStart.x);
		var baseDY = (pointer.y - missileStart.y);

		var angle = Math.atan2(-1*baseDY, baseDX);

		//var angle = this.game.physics.arcade.angleToPointer(this.cannonSprite,pointer);
		//var velocity = this.game.physics.arcade.velocityFromAngle(angle,missileVelocity, newShot.body.velocity);
		//console.log("v: "+velocity);
		if(angle < 0)
		{
			angle = 0;
		}
		if(angle>(Math.PI/2))
		{
			angle = (Math.PI/2);
		}

		//angle = Math.PI/4;

		newShot.body.velocity.x = Math.cos(angle) * missileVelocity;
		newShot.body.velocity.y = -Math.sin(angle) * missileVelocity;

		//newShot.outOfBoundsKill = true;
		//newShot.checkWorldBounds = true;
		newShot.body.setSize(tileSize*0.875,tileSize*0.875,0,0);
		newShot.anchor.set(0.5,0.5);

		inFlight = true;
		this.sound['rocket'].play();
	},

	updateMissileAngle: function(missile)
	{
		missile.rotation = (Math.PI/4)+game.physics.arcade.angleToXY(missile,
			missile.x + missile.body.velocity.x, missile.y+missile.body.velocity.y);
	},

	spawnTarget: function()
	{
		var target = this.targetGroup.getFirstDead();
		if(target === null)
		{
			return;
		}
		if(target.tween != null)
		{
			this.game.tweens.remove(target.tween);	
			target.tween = null;
		}

		target.body.allowGravity = false;

		var targetHorizontal = this.getOpenSlot();

		var newY = game.height - (slotWidth + Math.random()*(game.height*0.167));

		target.reset( targetHorizontal, newY);
		target.body.setSize(tileSize*0.875,tileSize*0.875,0,0);
		//target.anchor.set(0.5,0.5);

		//game.add.tween(target).to( { alpha: 1 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);
		
		target.tween = game.add.tween(target).to( 
					{ y: newY-(game.height*0.67) }, 2000,Phaser.Easing.Linear.None, true, 0, Number.MAX_VALUE, true);
		
		/*
		target.tween = game.add.tween(target).to( 
					{ y: 200 }, 2500,Phaser.Easing.Linear.None)
					.to({ y: 300 },2500,Phaser.Easing.Linear.None)
					.loop()
					.start();
		*/
	},

	initializeSlots: function()
	{
		base = this.game.width * 0.5;
		slotCount = Math.floor((this.game.width-base)/slotWidth);
	},

	getOpenSlot: function()
	{
		return base + (Math.floor(Math.random()*slotCount)) * slotWidth;
	},

	initializeTracer: function()
	{
		for(var i=0; i<this.tracerGroup.length; i++)
		{
			this.tracerGroup.getAt(i).anchor.set(0.5,0.5);
		}
	},

	updateTracer: function(pointer)
	{
		if((this.tracerGroup != null) && this.tracerGroup.length > 0)
		{
			var baseDX = (pointer.x - missileStart.x);
			var baseDY = (pointer.y - missileStart.y);

			var angle = /*(180/Math.PI) * */Math.atan2(-1*baseDY, baseDX);

			var curveLength = Math.sqrt(baseDX*baseDX + baseDY*baseDY);
			//console.log("CL: "+curveLength);
			var actualSegments = tracerSegments;// curveLength/tileSize;

			var dX = baseDX/tracerSegments;
			var dY = baseDY/tracerSegments;

			//var rot = game.physics.arcade.angleToXY(this.tracerGroup.getAt(0),pointer.x, pointer.y);
			if(this.game.time.now >= (lastTracerDeltaReset+tracerDeltaSpeed))
			{
				lastTracerDeltaReset = this.game.time.now;
			}
			tracerDelta = (this.game.time.now - lastTracerDeltaReset)/tracerDeltaSpeed;

			if(angle < 0)
			{
				angle = 0;
			}
			if(angle>(Math.PI/2))
			{
				angle = (Math.PI/2);
			}

			for(var t=0; t<tracerSegments; t++)
			{
				/*
				if(t>actualSegments)
				{
					this.tracerGroup.getAt(t).alive = false;
					this.tracerGroup.getAt(t).visible = false;
				}
				else*/
				{
					this.setTracerIndexByTime(t, (t+tracerDelta)/10, angle);
					//this.tracerGroup.getAt(t).reset(missileStart.x+(dX*(t+tracerDelta)), missileStart.y+(dY*(t+tracerDelta)));
					//this.tracerGroup.getAt(t).rotation = rot;
				}
			}
		}

		if(tracerLine.length>0)
		{
			tracerLine[0].setTo(missileStart.x, missileStart.y, pointer.x, pointer.y);
			//tracerLine[0].
			for(var t=0; t<tracerSegments; t++)
			{
				tracerLine[t].setTo(0, pointer.y-(t*3), game.width, pointer.y-(t*3));
			}
		}

		this.cannonSprite.rotation = (Math.PI/4)-angle;
		//console.log(this.tracerGroup);
	},



	setTracerIndexByTime: function(idx, t, theta )
	{
		var g = missileGravity;
		var v_zero = missileVelocity;
		var angle = /*(Math.PI/180) * */theta;
		



		//angle = Math.PI/2;
		
		var oldX = this.tracerGroup.getAt(idx).x;
		var oldY = this.tracerGroup.getAt(idx).y;

		var prevX = 0;//this.tracerGroup.getAt(idx-1).x;
		var prevY = 0;//this.tracerGroup.getAt(idx-1).y;
		if(idx>0){
			prevX = this.tracerGroup.getAt(idx-1).x;
			prevY = this.tracerGroup.getAt(idx-1).y;
		}

		var newX = missileStart.x + (v_zero * t * Math.cos(angle));
		var newY = missileStart.y - (v_zero * t * Math.sin(angle) - 0.5*g*t*t);

		if((oldX != newX) || (oldY != newY) )
		{
			this.tracerGroup.getAt(idx).reset(newX,newY);
		}
		if(idx==0){
			this.tracerGroup.getAt(idx).rotation = -angle;
		}
		else
		{
			this.tracerGroup.getAt(idx).rotation = Math.atan2(newY-prevY, newX-prevX);
		}
		if( this.belowGround(newX,newY))
		{
			this.tracerGroup.getAt(idx).visible = false;
		}
	},

	belowGround: function(x, y)
	{
		if(y>game.height){
			return true;
		}
		for(var i=0; i<groundPolygons.length; i++)
		{
			if(groundPolygons[i].contains(x,y))
			{
				return true;
			}
		}
		return false;
	},

};