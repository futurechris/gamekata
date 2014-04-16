var DEBUG = true;
var DEBUG_LEVEL = 0;

var heroScale = 1;
var bulletScale = 1;
var diagMultiplier = 0.70710678118655;

var difficultyBumpDelay = 10*1000; // ms
var difficulty = 1;

var spawnDelay = 1000; //ms
var enemySpeed = 60;
var spawnPoolSize  = 500;
var enemyHealthbarSize = 24;
var baseEnemyHealth = 10;
var baseEnemyDamage = 1; // 1 per second

var bulletDamage = 1;
var bulletFireDelay = 100; //ms
var gunDamage = 1;
var playerMaxHealth = 10;
var playerCurrentHealth = playerMaxHealth;
var _playerPreviousHealth = 0;

var healthDropPoolSize = 20;
var healthDropChanceBase = 0.10;
var healthDropChanceScale = 0.02;
var healthDropFailures = 0;
var healthDropValue = 2;

var upgradeDropPoolSize = 20;
var upgradeDropChanceBase = 0.05;
var upgradeDropChanceScale = 0.01;
var upgradeDropFailures = 0;
var upgradeDropValue = 1;

var play_state = {
	create: function() {
 		game.physics.startSystem(Phaser.Physics.ARCADE);
 		this.initializeState();
		this.initializeSprites();
		this.initializeGroups();
		this.initializeTimers();
		this.initializeLabels();
		this.score = 0;
	},

	update: function() {
		this.checkInput();
		this.checkPickup();
		this.moveEnemies();
		this.updatePlayerHealthbar(); // just to make it more responsive
		this.processDamage();
		this.updateGrowth();
		this.updateLabels();
		this.updatePlayerHealthbar();
	},

	processDamage: function() {
		// check for bullet-monster overlap
		game.physics.arcade.overlap(this.bullets, this.enemies, this.collisionHandler, null, this);
		game.physics.arcade.overlap(this.herosprite, this.enemies, this.playerInjuredHandler, null, this);
	},

	collisionHandler: function(bullet, enemy){
		bullet.kill();

		enemy.currentHealth -= bulletDamage;
		if(enemy.currentHealth <= 0){
			enemy.kill();
			this.score++;
			enemy.totalHealth = baseEnemyHealth+difficulty;
			enemy.currentHealth = enemy.totalHealth;
			enemy._previousHealth = 0;
			if(Math.random() < (healthDropChanceBase + healthDropChanceScale*healthDropFailures++)) {
				this.spawnHealthDrop(enemy);
				healthDropFailures = 0;
			}
			if(Math.random() < (upgradeDropChanceBase + upgradeDropChanceBase*upgradeDropFailures++)) {
				this.spawnUpgradeDrop(enemy);
				upgradeDropFailures = 0;
			}
		}
		this.updateMonsterHealthbar(enemy);
	},

	playerInjuredHandler: function(player, enemy){
		playerCurrentHealth -= this.game.time.elapsed * baseEnemyDamage/1000;
		if(playerCurrentHealth<=0){
			this.removeTimers();
			this.restartGame();
		}
	},

	moveEnemies: function() {
		this.enemies.forEachAlive(function(enemy){
			if( ! this.game.physics.arcade.overlap(enemy, this.herosprite)){
				game.physics.arcade.moveToObject(enemy, this.herosprite, enemySpeed);
			}	else {
				enemy.body.velocity.x = 0;
				enemy.body.velocity.y = 0;
			}
		}, this);
	},

	checkInput: function() {
		var directions = 0;
		if(this.game.input.keyboard.isDown(Phaser.Keyboard.W)){
			this.herosprite.body.velocity.y = -200;
			directions++;
		} else if(this.game.input.keyboard.isDown(Phaser.Keyboard.S)){
			this.herosprite.body.velocity.y = 200;
			directions++;
		} else {
			this.herosprite.body.velocity.y = 0;
		}
		if(this.game.input.keyboard.isDown(Phaser.Keyboard.A)){
			this.herosprite.body.velocity.x = -200;
			directions++;
		} else if(this.game.input.keyboard.isDown(Phaser.Keyboard.D)){
			this.herosprite.body.velocity.x = 200;
			directions++;
		} else {
			this.herosprite.body.velocity.x = 0;
		}
		if(directions > 1){
			this.herosprite.body.velocity.x *= diagMultiplier;
			this.herosprite.body.velocity.y *= diagMultiplier;
		}
	},

	checkPickup: function() {
		//this.debugLog("checkPickup", 1);
		game.physics.arcade.overlap(this.herosprite, this.healthDrops,  this.healthDropHandler,  null, this);
		game.physics.arcade.overlap(this.herosprite, this.upgradeDrops, this.upgradeDropHandler, null, this);
	},

	healthDropHandler: function(player, drop) {
		drop.kill();
		playerCurrentHealth = Math.min(playerCurrentHealth+healthDropValue, playerMaxHealth);
	},

	upgradeDropHandler: function(player, drop){
		this.debugLog("upgradeDropHandler", 0);
		drop.kill();
		gunDamage += upgradeDropValue;
		this.updateLabels();
	},

	fireBullets: function(){
		var bullet = this.bullets.getFirstDead();
		bullet.scale.x = bulletScale;
		bullet.scale.y = bulletScale;
		bullet.reset( this.herosprite.x, this.herosprite.y );
		/*
		console.log( "(x,y): "+this.herosprite.x+','+this.herosprite.y);

		game.physics.arcade.velocityFromAngle(
			game.physics.arcade.angleToPointer(this.herosprite),
			100, bullet.body.velocity);
		*/
		game.physics.arcade.moveToPointer(bullet, 400);
	},

	// ##############################################
	// Update helpers

	updatePlayerHealthbar: function(){
		if( _playerPreviousHealth != playerCurrentHealth ){
			this.playerHealthbar.clear();
			var perc = (playerCurrentHealth / playerMaxHealth );
			
			var barSize = 12;

			this.playerHealthbar.beginFill("0xFF0000");
			this.playerHealthbar.lineStyle(barSize, "0xFF0000", 1);
			this.playerHealthbar.moveTo(barSize/2,barSize);
			this.playerHealthbar.lineTo(enemyHealthbarSize * 10 * perc, barSize);
			this.playerHealthbar.endFill();
		}	
	},

	updateMonsterHealthbar: function(m) {
		if( m._previousHealth != m.currentHealth ){
			m.healthbar.clear();
			var perc = (m.currentHealth / m.totalHealth);

			m.healthbar.beginFill("0xFF0000");
			m.healthbar.lineStyle(4, "0xFF0000", 1);
			m.healthbar.moveTo(-enemyHealthbarSize/2,-14);
			m.healthbar.lineTo(enemyHealthbarSize * perc - (enemyHealthbarSize/2), -14);
			m.healthbar.endFill();
		}
		m._previousHealth = m.currentHealth;
		this.debugLog("Initializing monster healthbar", 5);
	},

	updateLabels: function(){
		this.label_score.text = this.score;
		this.label_damage.text = "Dmg: "+gunDamage;
	},

	updateGrowth: function(){

	},

	// ##############################################
	// Spawning

	spawnHealthDrop: function(enemy){
		if( this.healthDrops.countDead() == 0){return;}
		var drop = this.healthDrops.getFirstDead();
		drop.anchor.set(0.5,0.5);
		drop.reset(enemy.x, enemy.y);
	},

	spawnUpgradeDrop: function(enemy){
		if( this.upgradeDrops.countDead() == 0){ return; }
		var drop = this.upgradeDrops.getFirstDead();
		drop.anchor.set(0.5,0.5);
		drop.reset(enemy.x, enemy.y);
	},

	spawnEnemies: function(){
		var spawnRate = difficulty*0.1;
		if(this.enemies.countLiving() == 0){
			spawnRate = (spawnRate+1)/2;
		}
		var spawnValue = Math.random();
		
		while(spawnRate>spawnValue){
			this.spawnOneEnemy();
			spawnRate--;
		}
	},

	spawnOneEnemy: function(){
		var spawnX = 0;
		var spawnY = 0;

		var sides = true;
		if(Math.random()>0.5){sides = false;}

		if(sides){
			// "sides" include the squares in the corners
			if(Math.random()>0.5){
				spawnX = -16;
			} else {
				spawnX = game.width+16;
			}
			spawnY = Math.random() * ( (game.height+16)-(-16) ) + (-16);
		} else {
			if(Math.random()>0.5){
				spawnY = -16;
			} else {
				spawnY = game.height+16;
			}
			spawnX = Math.random() * game.width;
		}

		//spawnX = Math.random()*game.width;
		//spawnY = Math.random()*game.height;
		if( this.enemies.countDead() == 0){ return; }
		var enemy = this.enemies.getFirstDead();
		enemy.anchor.set(0.5,0.5);
		enemy.reset(spawnX, spawnY);
		enemy.totalHealth = baseEnemyHealth+difficulty;
		enemy.currentHealth = enemy.totalHealth;
		enemy._previousHealth = 0;
	},

	// ##############################################
	// Initialization helpers

	initializeInput: function() {},

	initializeState: function() {
		upgradeDropFailures = 0;
		healthDropFailures = 0;
		gunDamage = 1;
		playerCurrentHealth = 10;
		_playerPreviousHealth = 0;
		difficulty = 1;
	},

	initializeSprites: function() {
		//this.tilesprite = game.add.tileSprite(0,0,game.width, game.height, 'background');

		this.herosprite = this.game.add.sprite(240,160, 'hero_down');
		this.herosprite.scale.setTo(heroScale, heroScale);
		this.herosprite.anchor.set(0.5,0.333);
		game.physics.enable(this.herosprite, Phaser.Physics.ARCADE);
		this.herosprite.enableBody = true;
		this.herosprite.physicsBodyType = Phaser.Physics.ARCADE;
		this.initializePlayerHealthbar();
		this.updatePlayerHealthbar();
	},

	initializePlayerHealthbar: function() {
		this._playerHealthbarBackground = game.add.graphics(0,0);
		this.playerHealthbar = game.add.graphics(0,0);
	
		this._playerHealthbarBackground.clear();
		var barSize = 12;

		this._playerHealthbarBackground.beginFill("0x333333");
		this._playerHealthbarBackground.lineStyle(barSize+4, "0x333333", 1);
		this._playerHealthbarBackground.moveTo(barSize/2-4,barSize);
		this._playerHealthbarBackground.lineTo(enemyHealthbarSize * 10 + 4, barSize);
		this._playerHealthbarBackground.endFill();

	},

	initializeGroups: function() {
		this.bullets = game.add.group();
		this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
		this.bullets.createMultiple(500, 'bullet')
		this.bullets.setAll('checkWorldBounds', true);
    this.bullets.setAll('outOfBoundsKill', true);


    this.enemies = game.add.group();
    this.enemies.enableBody = true;
    this.enemies.physicsBodyType = Phaser.Physics.ARCADE;
    
    this.enemies.createMultiple(spawnPoolSize, 'duotone_minimal', 24);
    this.enemies.forEach(this.initializeMonster, this);


    this.healthDrops = game.add.group();
		this.healthDrops.enableBody = true;
    this.healthDrops.physicsBodyType = Phaser.Physics.ARCADE;
    this.healthDrops.createMultiple(healthDropPoolSize, 'potion');

    this.upgradeDrops = game.add.group();
    this.upgradeDrops.enableBody = true;
    this.upgradeDrops.physicsBodyType = Phaser.Physics.ARCADE;
    this.upgradeDrops.createMultiple(upgradeDropPoolSize, 'duotone_minimal', 48);
	},

	initializeMonster: function(m) {
		//var m = game.add.group();
		m.healthbar = game.add.graphics(0,0);
		m.addChild(m.healthbar);
		m.totalHealth = baseEnemyHealth+difficulty;
		m.currentHealth = m.totalHealth;
		m._previousHealth = 0;
		
		this.updateMonsterHealthbar(m);

	},

	initializeTimers: function(){
		this.bulletTimer = this.game.time.events.loop(bulletFireDelay, this.fireBullets, this);
		this.difficultyTimer = this.game.time.events.loop(difficultyBumpDelay, function(){difficulty++;}, this);
		this.spawnTimer = this.game.time.events.loop(spawnDelay, this.spawnEnemies, this);		
	},

	initializeLabels: function(){
		var style = { font: "30px Arial", fill: "#ffffff" };
		this.label_score = this.game.add.text(20,20, "0", style);
		this.label_damage = this.game.add.text(20,game.height-50, "Dmg: 0", style);
	},

	// ##############################
	// Cleanup
	removeTimers: function(){
		this.game.time.events.remove(this.bulletTimer);
		this.game.time.events.remove(this.difficultyTimer);
		this.game.time.events.remove(this.spawnTimer);
	},

	restartGame: function() {
		this.initializeState();
		this.game.state.start('play');
	},

	// ##############################
	// Debug tools
	debugLog: function(msg, level){
		level = typeof level !== 'undefined' ? level : 1;
		if(DEBUG){
			if(level <= DEBUG_LEVEL){
				console.log(msg);
			}
		}
	},
};