var searchDuration = 250;

function a_star(){
	this.startNode = null;
	this.goalNode = null;
};

a_star.prototype.cameFrom = function(current, goal)
{
	var path = new Array();
	path.push(goal);
	while(path[path.length-1].parent != null)
	{
		path.push(path[path.length-1].parent);
	}

	path.pop();

	return path.reverse();
};

// simple manhattan-distance heuristic since we're on a grid.
a_star.prototype.distance = function(ax, ay, bx, by)
{
	return Math.abs(ax-bx) + Math.abs(ay-by);
};

// descending sort by f (f=g+h)
// so we can pop() instead of shift()
a_star.prototype.starSort = function(a, b)
{
	return (b.g+b.h)-(a.g+a.h);
};

a_star.prototype.setFind = function(neighbor, set)
{
	for(var i=0; i<set.length; i++)
	{
		if(neighbor.x == set[i].x)
		{
			if(neighbor.y == set[i].y)
			{
				return set[i];
			}
		}
	}
	return null;
};

a_star.prototype.reachableNeighbors = function(currentNode, map, goal)
{
	var neighbors = new Array();

	var x = currentNode.x;
	var y = currentNode.y;
	var g = currentNode.g;
	
	var gx = goal.x;
	var gy = goal.y;

	var nx = x;
	var ny = y;

	// down
	nx = x;
	ny = y+1;
	if(this.spaceOpen(nx,ny,map))
	{
		neighbors.push({x: nx, y: ny, g: g+1, h: this.distance(nx, ny, gx, gy), parent:currentNode});
	}

	// up
	nx = x;
	ny = y-1;
	if(this.spaceOpen(nx,ny,map))
	{
		neighbors.push({x: nx, y: ny, g: g+1, h: this.distance(nx, ny, gx, gy), parent:currentNode});
	}

	// right
	nx = x+1;
	ny = y;
	if(this.spaceOpen(nx,ny,map))
	{
		neighbors.push({x: nx, y: ny, g: g+1, h: this.distance(nx, ny, gx, gy), parent:currentNode});
	}

	// left
	nx = x-1;
	ny = y
	if(this.spaceOpen(nx,ny,map))
	{
		neighbors.push({x: nx, y: ny, g: g+1, h: this.distance(nx, ny, gx, gy), parent:currentNode});
	}

	return neighbors;
};

a_star.prototype.spaceOpen = function(x, y, map)
{
	if( this.startNode.x == x && this.startNode.y == y){
		return true;
	}
	if( this.goalNode.x == x && this.goalNode.y == y){
		return true;
	}
	if( 	map.getTile(x,y,'dynamicLayer').index != -1
		||	map.getTile(x,y,'bombLayer').index != -1
		||	map.getTile(x,y,'wallLayer').index != -1
		)
	{
		/*
		console.log("D: "+map.getTile(x,y,'dynamicLayer').index)
		console.log("B: "+map.getTile(x,y,'bombLayer').index)
		console.log("W: "+map.getTile(x,y,'wallLayer').index)
		console.log("so: "+x+", "+y);
		*/
		return false;
	}
	return true;
};

a_star.prototype.search = function(start, goal, map)
{
	var expansions = 0;
	var capExpansions = 1000;
	var closedSet = new Array();
	var openSet 	= new Array();

	var currentNode = null;
	var paused = false;

	this.startNode = {x: start.x, y: start.y, g: 0,
		h: this.distance(start.x, start.y, goal.x, goal.y),
		parent: null};
	this.goalNode = {x: goal.x, y: goal.y, g: Number.MAX_VALUE, h: 0, parent:null};
	openSet.push(this.startNode);
	
	while(openSet.length > 0 && expansions < capExpansions)
	{
		expansions++;
		currentNode = openSet.pop();

		if( 	currentNode.x == this.goalNode.x
			&&	currentNode.y == this.goalNode.y)
		{
			// arrived
			this.goalNode.parent = currentNode.parent;
			//console.log("Elapsed: "+ game.time.now);
			//console.log("Started: "+ startTime);
			return this.cameFrom(currentNode, this.goalNode);
		}

		var neighbors = this.reachableNeighbors(currentNode, map, this.goalNode);
		var contains = null;
		for(var i=0; i<neighbors.length; i++)
		{
			// skip if we've got a better node in the list already
			// else update the existing one to the current's values
			contains = this.setFind(neighbors[i], openSet);
			if( contains != null )
			{
				var oldF = contains.g + contains.h;
				var newF = neighbors[i].g + neighbors[i].h;
				if(newF < oldF){
					contains.h = neighbors[i].h; // don't think this is necessary
					contains.g = neighbors[i].g;
					contains.parent = currentNode;
				}
			}

			// skip if we already processed a similar-or-better node
			contains = this.setFind(neighbors[i], closedSet);
			if( contains != null )
			{
				var oldF = contains.g + contains.h;
				var newF = neighbors[i].g + neighbors[i].h;
				if(newF >= oldF){
					continue;
				}
			}

			// else, add neighbor to open list
			openSet.push(neighbors[i]);
		}
		openSet.sort(this.starSort)
		closedSet.push(currentNode);
	}

	//console.log("Couldn't find path");
	//console.log("Couldn't find path start: "+startTime);
	return null;
};
