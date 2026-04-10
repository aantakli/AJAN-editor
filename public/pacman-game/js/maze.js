/* 
 * File: maze.js
 * Meta: functions for creating the maze visual and an array to describe all of the maze cells in terms of possible moves, where pills are etc. 
 *
 * To edit the random maze, render and play on the fly, pause the game then do the following in the console:
 * 1. fromPredefined=1
 * 2. mazeMap.gridMap - then edit this as you see fit
 * 3. mazedata = renderGrid(); - adjusts the screen and loads the data into the array for playing
 * 4. Unpause game and play
 *
*/

var fromPredefined; // only set for testing
var removeAnnexedCorners=1; // probably little use of having this in a var any longer, it should just be done now?

/* 
 * Function: convertTo2d
 * Meta: Convert the original maze data which is a 1d array to a 2d array of rows and columns
 *       This 2d array is stored in the var interim_maze, which is later looped in order to build a bigger array containing every possible move available from each cell.
 *       run convertTo2d(maze) to see the result in the console
 */
function convertTo2d(maze){
	maze = maze.join("");
	var interim_maze = Array();
	x=0;
	y=0;

	//console.log(maze);
	for (i=0;i<maze.length;i++){
		character = maze.charAt(i);
		if (i==19 || x==19){ // maze is 19 blocks wide, drop to next line
			x = 0;
			//console.log("x is now " + x + " at " + i);
			y++;
		}
		if (x==19) {
			y++;
			//console.log("y is now " + y + " - xz is " + x);
			x=0;
		}
		if (typeof (interim_maze[y]) != "object"){
			interim_maze[y]=Array(); // basically just initialising an array each time there isn't one..
		}
		interim_maze[y][x]=character;
		//console.log(typeof(interim_maze[y]) + " Y: " + interim_maze[y] + " == " + "x is " + x + " and y is " + y + " ======" + interim_maze[y][x]);
		x++;
	}
	return interim_maze;
}

/* 
 * Function : renderGrid
 * Meta: takes the 2d grid and builds a data structure from it that we can query easily. 
 * 	bindata - for binary lookups of possible moves where we can use a bitwise and to see if a move is possible from the current cell.. 
 *      Byte 1 - set to U if can go up, X if not
 *	Byte 2 - set to D if can go down, X if not
 *	Byte 3 - set to L if can go left, X if not
 *	Byte 4 - set to R if can go right, X if not
 *	Byte 5 - set to 1 if a pill is in the cell, 2 if a powerpill, 3 if it is the ghosts home, 4 if the cell goes to an offscreen tunnel, 5 indicates the top of the ghosts home.  
 *               which should only allow movement in one direction (out of the ghosts home) and not in unless the ghost has been eaten
 * 	Byte 6 - In the original version this contained one direction character (U, D, L or R) to tell the ghosts how to get back home. This is no longer used. 
 *
 * 	This function also takes care of screen rendering including pills.
*/
function renderGrid(){

	var interim_maze;
	if (fromPredefined){ //  var set to 1 from console only - for testing 
		interim_maze=mazeMap.gridMap;
	} else if (sessionStorage.mazeSource=="random"){
		interim_maze=randomMaze();
	} else {
		interim_maze = convertTo2d(maze);
	}

	//interim_maze= convertTo2d(testmaze); - only for testing
	//interim_maze=removeDiagonalBlocksInTest(testmaze); - further testing
	
	var bindata = Array();
	var binpills = Array();
	var x=0;
	var v_offset=25; // start 25px down, this just leaves some space on the page 
	var innerStr="";
	pillNumber=0; // start with 0 pills 

	for (y=0;y<interim_maze.length;y++){
		var lineMoves = Array();
		h_offset=35; // start a new line 35px in
		bindata[v_offset] = Array();

		for (x=0;x<19;x++){
		
			bit = interim_maze[y][x]; // yeah its a byte not a bit, byte is a reserved word. Ahem..
			binbit = 0;
			var movestring=""; // empty var to take the possible directions. Now we've switched exclusively to the binary do we still need this? I wonder if any of the code actually uses it.

			// populate movestring by scanning the binary array left, right, up and down for more 1's
			if (interim_maze[y-1] && interim_maze[y-1][x] != "0"){
				 movestring="U"; binbit=8;} else { movestring="X";}

			if (interim_maze[y+1] && interim_maze[y+1][x] != "0"){
				 movestring += "D"; binbit += 4; } else { movestring += "X";}

			if (interim_maze[y][x-1] && interim_maze[y][x-1] != "0"){
				 movestring += "L"; binbit += 2;} else { movestring += "X";}

			if (interim_maze[y][x+1] && interim_maze[y][x+1] != "0"){
				 movestring += "R"; binbit += 1; } else { movestring += "X";}

			if (interim_maze[y][x-1] == "3" && interim_maze[y][x+1] == "3"){ binbit = 8;} // stop ghosts L and R in home base - means from the center position they will ALWAYS go up and out

			movestring += bit; // this adds the pill
			lineMoves.push(movestring); // ADD to an array of the whole line

			// This section draws the inner wall of the outer double wall if where x and y are the perimiters
			// The CSS for the mazecells is no longer used, but anticipating I may again in the future, I'm manually altering it here.
			if (y==0 || x==0 || y==14 || x==18 ){

				styles=movestring.substring(0,4); // we add the 4 move positions to a css class in order to draw the correct borders for the maze


				// these replacements relate to the outer walls which do not render correctly with borders on opposite sides.
				// this is not the correct way to fix this, would be better to alter the css, however this retains the css functionality as the css is currently used for another project I am playing with
				// in time none of this code will be required and I will fix the css
				if (y==0){ // upper edge 
					if (x != 0 && x!=18){
						 styles = styles.replace("XXL","XDL");	
						 styles = styles.replace("XXX","XDL");	
						 styles = styles.replace("XDX","XDL");	
						 styles = styles.replace("XDLX","XDLR");	
						 styles = styles.replace("XXXR","XDXR");	
					} else if (x==0){
						 styles = styles.replace("XXXR","XDXR");	
					} else if (x==18){
						 styles = styles.replace("XDXX","XDLX");	
					}
				}
				if (y==14){ // lower edge
					styles = styles.replace("XXXR","UXXR");
					styles = styles.replace("XXLX","UXLX");
					styles = styles.replace("XXLR","UXLR");
				}
				if (x==0){ // left edge
					styles = styles.replace("DXX","DXR");
					styles = styles.replace("XXLR","XDLR");
					styles = styles.replace("XXXR","UDXR");
					styles = styles.replace("UXXX","UXXR"); // added for level 6
					if (y!=0&&y!=14){
						styles = styles.replace("UXXR","UDXR"); // added for level 6
						styles = styles.replace("XDXR","UDXR"); // added for level 6
					}
				}
				if (x==18){ // right edge
					styles = styles.replace("UDX","UDL"); // asasumes can go left (no left border)
					styles = styles.replace("UXXX","UDLX"); // asasumes can go left (no left border)
					if (y!=0&&y!=14){
						styles = styles.replace("XDXX","XDLX"); // asasumes can go left (no left border)
						styles = styles.replace("XDLX","UDLX"); // asasumes can go left (no left border)
						styles = styles.replace("UXLX","UDLX"); // asasumes can go left (no left border)
						styles = styles.replace("XXLX","XDLX"); // asasumes can go left (no left border)
					}
				}

				styles = styles.replace("XXLR","");
				if (bit==4 && i!=0){
						styles = "UDLR";
				}
				if (bit==4 && y==0){
					styles=styles.replace("XXLX","XDLR");
					styles=styles.replace("XXXR","XDLR");
				}
				if (x==18 && y == 14){ // bottom right corner
					styles = "UXLX";
				}
			
			} else {
				styles=""; // only required for the borders now
			}

			wallStyles = movestring.substring(0,4);

			// 4 is the tunnel at the side of the maze
			if (bit==4){
				if (x==0){
					styles = styles.replace("XXXR","XXLR"); 
					movestring = movestring.replace("XXXR","XXOR"); 
				} else {
					styles = styles.replace("XXLX","XXLR"); 
					movestring = movestring.replace("XXLX","XXLO"); 
				}
				styles += " " + movestring;
				styles += " mazeTunnel"; 
				cellInnerHTML = "";

			// 5 is the red barrier at the top of the ghosts home base
			} else if (bit==5){
				styles += " ghostbarrier";
				cellInnerHTML = "";
				ghostHomeBase=Array(h_offset,v_offset); // set the return to base position for the game

			// print the pill if it's a cell with 1 in the binary maze
			} else if (bit==1){
				cellInnerHTML="<img src='graphics/pil.gif' name='pil_" + h_offset + v_offset + "'>";
				pillNumber++;

			// 2 is a powerpill
			} else if (bit==2){
				cellInnerHTML="<div id='p" + v_offset + h_offset + "' ><img src='graphics/powerpil.gif' name='pil_" + h_offset + v_offset + "'></div>";
				pillNumber++;

			// and 0 is a cell within a wall
			} else {
				cellInnerHTML="<div id='p" + v_offset + h_offset + "' ></div>";
			}

			// add further css for creating the left and right walls on the next row down using css before and after selectors. This takes care of the double walls.
			if (y<14){
				if (movestring.charAt(3)=="R"){
					//styles +=" blockLowerRight"; M1 - appears to no longer be used - from old maze gen code
				}
				if (movestring.charAt(2)=="L"){
					//styles += " blockLowerLeft"; M1 - appears to no longer be used
				}
			}

			// Create the lookup array, which contains data about your possible moves, and print the pills whilst looping.. 
			// The lookup array maps to pixels on the screen so you can look up moves from the top and left properties of the sprites.
			// if it's not a zero in the original maze array, add the html to a string, and add this to innerStr. innerStr is built up and used as innerHTML to the maze div.
			if (bit != "0"){
				str='<div id="cell-' + h_offset + '-' + v_offset + '" data-pills="' + bit + '" style="position:absolute; top:' + v_offset + 'px; left:' + h_offset + 'px;" class="mazeCell ' + styles + '">' + cellInnerHTML + '</div>';
				innerStr += str;
				//binbit = (binbit>>>0).toString(2); // only use this to store in binary notation
				bindata[v_offset][h_offset] = binbit;

			} else {

				str='<div id="cell-' + h_offset + '-' + v_offset + '" style="position:absolute; top:' + v_offset + 'px; left:' + h_offset + 'px;" class="wallCell w_' + wallStyles + '">' + cellInnerHTML + '</div>';
				innerStr += str;
			}

			h_offset = h_offset + 30;

		}
		//console.log("Linemoves: " + lineMoves);
		v_offset = v_offset + 30; 
	}
	document.getElementById('mazeinner').innerHTML=innerStr;
	return bindata;
}

/*
 * Function: Maze
 * Meta: This is the maze class, for creating the randomly generated mazes
 */ 
function Maze(w, h){

        this.w = (isNaN(w) || w < 5 || w > 999 ? 20 : w); 
        this.h = (isNaN(h) || h < 5 || h > 999 ? 20 : h); 

        this.map = new Array();
	// mh and mw are map height and map width. Loop through these and set each array point to have no possible directions, set to not visited 
        for(var mh = 0; mh < h; ++mh) { 
		this.map[mh] = new Array();
		for(var mw = 0; mw < w; ++mw) {
			this.map[mh][mw] = {'n':0,'s':0,'e':0,'w':0,'v':0};
		}
	}
	// store the directions in an array
        this.dirs = ['n', 's', 'e', 'w'];

	// Store the x/y shifts for each direction in an array. Each direction has a change in either the x or y axis (not both) and an opposite o
        this.modDir = { 
                'n' : { y : -1, x : 0, o : 's' },
                's' : { y : 1, x : 0, o : 'n' },
                'e' : { y : 0, x : -1, o : 'w' },
                'w' : { y : 0, x : 1, o : 'e' }
        };  

	// These two are used by but set outside of the explore function as they mustn't be initialised on successive repeats 
	this.lastDir="";
	this.moveCount=0;

        this.build(0, 0); 
}

// toGrid plots the map on a grid and allows for the walls which also take up space by multiplying each movement by 2. This effectively doubles the size of the existing grid.
// The maze is called with 10*8 as the size, however we need 19*15.
// This function builds walls as an outside, which returns  21*17. These walls are later removed as I have the outer walls in my own css separately.
Maze.prototype.toGrid = function(){

        var grid = new Array();

	// first populate the full size grid with zeros
        for(var mh = 0; mh < (this.h * 2 + 1); ++mh){// original height of 8 becomes doubled to 16, and +1 = 17. 
                grid[mh] = new Array(); 
                for(var mw = 0; mw < (this.w * 2 + 1); ++mw) { 
                        grid[mh][mw] = 0; } 
                }   

	
        for(var y = 0; y < this.h; ++ y){ 
                var py = (y * 2) + 1; // plot at old y * 2 and plus 1. Thus 0*2+1 plots at 1, 1*2+1 plots at 3, allowing us to fill in cell 2 with a wall.

                for(var x = 0; x < this.w; ++x){
                        var px = (x * 2) + 1; // plot at old x * 2 and plus 1 as well

                        if(this.map[y][x].v==1) {
                                grid[py][px] = 1; // if it's been visited as part of the maze generation, we can write a 1. This puts a 1 in all cells from the original x,y and walls everywhere else which we tunnel through next
                        }   

			// for each direction we went in the original exploration, we can also plot a 1 to tunnel through our wall
                        for(d in this.dirs){
                                if(this.map[y][x][this.dirs[d]]==1) {
                                         grid[(py+this.modDir[this.dirs[d]].y)][(px+this.modDir[this.dirs[d]].x)] = 1;
                                }
                        }
                }   
        }   

        this.gridMap 	= grid;
        this.gridW      = grid.length;
        this.gridH      = grid[0].length;
};




Maze.prototype.build = function(x, y){

	// does not need params, just set x and y to 0 to start. Can experiment with this later.
        var x = 0;
        var y = 0;

        this.explore(x, y); // function called recusrively  - this is the recursive backtracker 
        this.toGrid(); // plots the maze onto a grid allowing for the walls
};




// Explore function, called recusrively with the current starting point x,y
Maze.prototype.explore = function(ex, ey){
	console.warn("exploring from",ex,ey);

	// first, set up which directions we can move in from our current position. Store this in localDirs
	var localDirs = this.dirs; //nsew
	if (ex==0&&ey==0){
	       localDirs = ['s', 'w'];
	}
	if (ex==0&&ey!=0){
		localDirs=['n','s','w'];
	}
	if (ey==0&&ex!=0){
		localDirs=['e','s','w'];
	}
	if (ey==7&&ex==9){
		localDirs=['e','n'];
	}
	if (ey==7&&ex!=9&&ex!=0){
		localDirs=['e','n','w'];
	}
	if (ey!=0&&ey!=7&&ex==9){
		localDirs=['e','n','s'];
	}
	if (ey==7&&ex==0){
		localDirs=['w','n',];
	}
	if (ex==9&&ey==0){
		localDirs=['s','e',];
	}
	
	// 2. Get the possible diretions in a random order 
        localDirs = shuffleArray(localDirs);
	console.warn(localDirs);
	
	// if (this.moveCount && this.lastDir &&  (this.lastDir == 'w' )){ // push towards horizontals
	// if (this.moveCount && this.lastDir &&  (this.lastDir == 's' )){ // push towards verticals
	// The below pushes towards longer going s and w. Very interesting if set localDirs0,1,2 and 3 to this.lastDir! 
	if (this.moveCount && this.lastDir && this.moveCount%2==1 && (this.lastDir == 's' || this.lastDir == 'w' )){ 
		console.log("Last was"+this.lastDir);
		localDirs[0]=this.lastDir;
		localDirs[1]=this.lastDir;
		localDirs[2]=this.lastDir;
		localDirs[3]=this.lastDir;
	}

	// IF WE DONT WANT TO ALLOW DEAD ENDS DO A BREADTH FIRST SEARCH FROM THE CORNERS?
	

        for(d in localDirs){ //each direction is tested in the random order. Note that the recusrion from within this loop may mean that this loop is not completed until substantial portions of the maze are already mapped out by further calls to the explore function
		if(!localDirs[d]){
			console.error("UNDEF ERROR for ",d," at ",ex,",",ey,localDirs);
			alert("ooops");
			return;
		}
		console.warn("From ",ex,ey,": Testing ",d," of ",localDirs,"  gives ",localDirs[d]);

                var nx = ex + this.modDir[localDirs[d]].x; // new X is current explored X + the X change for the direction. Eg. North from a point will show no change in x, east will show a +1
                var ny = ey + this.modDir[localDirs[d]].y; // same operation on Y

		console.log(this.map);

                if(this.map[ny] && this.map[ny][nx] && this.map[ny][nx].v==0){ // if there is a change, and it does not take us off the grid and the point has not been visited
                        this.map[ey][ex][localDirs[d]] = 1; // add the direction change to the directions object of the cell
                        this.map[ey][ex].v = 1; //  set to visited
                        this.map[ny][nx][this.modDir[localDirs[d]].o] = 1; // set the opposite direction to 1 as well
			console.log(localDirs[d],"x:"+nx,"y:"+ny,this.modDir[localDirs[d]].x,this.modDir[localDirs[d]].y," - Yes - adding cell");
			this.lastDir=localDirs[d];
			this.moveCount++;
                        this.explore(nx, ny); // and repeat, recursively calling this function from the new x and y co-ordinates
                } else {
			console.error(localDirs[d],"x:"+nx,"y:"+ny,this.modDir[localDirs[d]].x,this.modDir[localDirs[d]].y," - No - returning to last");
		}
        }
}

// shuffle an array randomly
function shuffleArray(arrayIn){

        var arrayOut = new Array();
        var len      = arrayIn.length;

        for(el in arrayIn){
                do { 
			var ind = Math.floor(Math.random() * (len * 1000)) % len; 
		} while (
			typeof arrayOut[ind]!='undefined'
		);

                arrayOut[ind] = arrayIn[el];
        }

        return arrayOut;
}

/* 
 * Function: randomMaze
 * Meta: Create a random maze using the maze object
 */
function randomMaze(){

        mazeMap = new Maze(10,8);

	// remove top and bottom walls
        mazeMap.gridMap.shift();
        mazeMap.gridMap.pop();
	//  remove left and right walls
        for (i=0;i<mazeMap.gridMap.length;i++){
                mazeMap.gridMap[i].pop();
                mazeMap.gridMap[i].shift();
        }

        // document.getElementById("sourcear").innerHTML=mazeMap.gridMap.toString();
	// remove annexed corners - we don't want any corners with a 0 in them as the mazes look weird like that
	if (removeAnnexedCorners){
		mazeMap.gridMap[1][0]=1;
		mazeMap.gridMap[0][1]=1;
		mazeMap.gridMap[14][17]=1;
		mazeMap.gridMap[13][18]=1;
	}

	// we'd like a nice looking maze please, so in order to get some symmetry, copy the first 7 columns...
	copy0 = mazeMap.gridMap[0].slice();
	copy1 = mazeMap.gridMap[1].slice();
	copy2 = mazeMap.gridMap[2].slice();
	copy3 = mazeMap.gridMap[3].slice();
	copy4 = mazeMap.gridMap[4].slice();
	copy5 = mazeMap.gridMap[5].slice();
	copy6 = mazeMap.gridMap[6].slice();

	// and then replace the last 7 with the reverse of what we copied - suddenly it looks a bit more professional!
	mazeMap.gridMap[14]=copy0.reverse();
	mazeMap.gridMap[13]=copy1.reverse();
	mazeMap.gridMap[12]=copy2.reverse();
	mazeMap.gridMap[11]=copy3.reverse();
	mazeMap.gridMap[10]=copy4.reverse();
	mazeMap.gridMap[9]=copy5.reverse();
	mazeMap.gridMap[8]=copy6.reverse();

	// Remove diagonals, as not only doesn't it look good when we have cells next to each other on the diagonal, 
	// it creates dead ends and annexed areas of the maze you can't get through, so just blow them out.
	removeDiagonalBlocks(); 
	addPowerPills();
        addGhostHome(); // build the ghost home base in the middle of our maze somewhere

	// We need to add tunnels to go off-screen left and right to the random maze. These are done at a random point of 6,8 or 10 lines down the array.
	tPos=[6,8,10];
	t=shuffleArray(tPos)[0];
	if(mazeMap.gridMap[t][0]==1 && mazeMap.gridMap[t][18]==1){
		mazeMap.gridMap[t][0]=4; // a 4 in our data represents a tunnel. These go in at x=0 and x=18 (line below).
		mazeMap.gridMap[t][18]=4;
		mazeMap.gridMap[t][1]=1; // next 4 lines because we need to build a tunnel wall out to identify the tunnel
		mazeMap.gridMap[t][17]=1;
		mazeMap.gridMap[t][2]=1;
		mazeMap.gridMap[t][16]=1;

		mazeMap.gridMap[t-1][0]=0; // if we've got a tunnel going out, we need to ensure there are walls either side of it top and bottom (next few sections)
		mazeMap.gridMap[t+1][0]=0;
		mazeMap.gridMap[t-1][18]=0;
		mazeMap.gridMap[t+1][18]=0;

		mazeMap.gridMap[t-1][1]=0;
		mazeMap.gridMap[t+1][1]=0;
		mazeMap.gridMap[t-1][17]=0;
		mazeMap.gridMap[t+1][17]=0;

		mazeMap.gridMap[t-2][1]=1;
		mazeMap.gridMap[t+2][1]=1;

		mazeMap.gridMap[t-2][17]=1;
		mazeMap.gridMap[t+2][17]=1;

	}

	// swap out 1,0,1,0,1 for 1,0,0,0,1
	mazeMap.gridMap=joinSingleBlocks(mazeMap.gridMap);

        return mazeMap.gridMap;
}

/*
 * Function: joinSingleBlocks
 * Meta: The random generation can sometimes make lots of single squares of wall. These don't look too great, but this function joins two isolated squares on the horizontal only and solves that nicely :) 
 *       Would be worth doing it on the vertical as well perhaps?
 *       Would like to find a better way of looking this data up first however, thats 15 conditions to identify this below! This will be a fun project on it's own!
 */
function joinSingleBlocks(data){

	console.log(data);
	for (y=1;y<data.length-1;y++){
		for (x=0;x<data[x].length-5;x++){
			if (data[y][x]==1 && data[y][x+1]==0 && data[y][x+2]==1 && data[y][x+3]==0 && data[y][x+4]==1){
				if (data[y+1][x]==1 && data[y+1][x+1]==1 && data[y+1][x+2]==1 && data[y+1][x+3]==1 && data[y+1][x+4]==1 && 
				    data[y-1][x]==1 && data[y-1][x+1]==1 && data[y-1][x+2]==1 && data[y-1][x+3]==1 && data[y-1][x+4]==1 ){
					console.log("GOT ONE AT " , y , x);
					data[y][x+2]=0;			
				}
			}
		}
	}
	console.log("Done");
	return data;
}


/*
 * Function: addGhostHome
 * Meta: Draw the ghost's home base into the maze data grid
 */
function addGhostHome(){

	var ghost_home_y = Array(2,4,8,10); // possible start positions for ghost home. Need to adjust where fruit appear (underneath), where the ghosts start and where pacman starts for anything other than 4
	var y=4;
	y=4;
	if (sessionStorage.level==2){
		y=8;
	}
	if (sessionStorage.level==3){
		y=2;
	}
	if (sessionStorage.level==4){
		y=6;
	}

	if (y==2){
		levelOptions.ghostStartTop=145;
		ghostStartTop=145;
		levelOptions.pacStartTop=205;
		pacStartTop=205;
	}
	if (y==4){
		levelOptions.ghostStartTop=205;
		ghostStartTop=205;
		levelOptions.pacStartTop=265;
		pacStartTop=265;
	}
	if (y==6){
		levelOptions.ghostStartTop=265;
		ghostStartTop=265;
		levelOptions.pacStartTop=325;
		pacStartTop=325;
	}
	if (y==8){
		levelOptions.ghostStartTop=325;
		ghostStartTop=325;
		levelOptions.pacStartTop=385;
		pacStartTop=385;
	}

	mazeMap.gridMap[y][7]=1;
	mazeMap.gridMap[y][6]=1;
	mazeMap.gridMap[y][8]=1;
	mazeMap.gridMap[y][9]=1;
	mazeMap.gridMap[y][10]=1;
	mazeMap.gridMap[y][11]=1;
	mazeMap.gridMap[y][12]=1;

	y++;
	mazeMap.gridMap[y][6]=1;
	mazeMap.gridMap[y][7]=0;
	mazeMap.gridMap[y][8]=0;
	mazeMap.gridMap[y][9]=5;
	mazeMap.gridMap[y][10]=0;
	mazeMap.gridMap[y][11]=0;
	mazeMap.gridMap[y][12]=1;
	
	y++;
	mazeMap.gridMap[y][6]=1;
	mazeMap.gridMap[y][7]=0;
	mazeMap.gridMap[y][8]=3;
	mazeMap.gridMap[y][9]=3;
	mazeMap.gridMap[y][10]=3;
	mazeMap.gridMap[y][11]=0;
	mazeMap.gridMap[y][12]=1;

	y++;
	mazeMap.gridMap[y][6]=1;
	mazeMap.gridMap[y][7]=0;
	mazeMap.gridMap[y][8]=0;
	mazeMap.gridMap[y][9]=0;
	mazeMap.gridMap[y][10]=0;
	mazeMap.gridMap[y][11]=0;
	mazeMap.gridMap[y][12]=1;

	y++;
	mazeMap.gridMap[y][6]=1;
	mazeMap.gridMap[y][7]=1;
	mazeMap.gridMap[y][8]=1;
	mazeMap.gridMap[y][9]=1;
	mazeMap.gridMap[y][10]=1;
	mazeMap.gridMap[y][11]=1;
	mazeMap.gridMap[y][12]=1;
}

/*
 * Function: addPowerPills
 * Meta: Draw the powerpills into the maze data grid
 */
function addPowerPills(){
	mazeMap.gridMap[0][0]=2;
	mazeMap.gridMap[14][0]=2;
	mazeMap.gridMap[0][18]=2;
	mazeMap.gridMap[14][18]=2;

}

function removeDiagonalBlocks(){
// This is worth explaining.
// Anywhere there is 0 in the map bounded by 0 on a diagonal corner - change the diagonal corner to a 1 
// we need to scan all diagonals and start second row down which grabs the upper ones, and finish one row up which grabs the lower.

// example data:
// here second row down second value in is a 0. See diagonal top right is also 0 - it is this second 0 which we turn to a 1
//
//
//	2,1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,2,
//	1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,1,
//	1,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,
//	0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,
//	0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,
//	1,0,1,0,0,0,0,0,0,5,0,0,1,0,1,0,0,0,1,
//	1,0,1,1,1,1,1,0,3,3,3,0,1,0,1,1,1,1,1,
//	1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,
//	1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,
//	1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,
//	1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,0,
//	1,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,
//	1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,0,
//	1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,
//	2,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,2
//
//

interim= mazeMap.gridMap;

	for (i=1;i<interim.length;i++){

		for (j=1;j<interim[i].length-1;j++){
			if(interim[i][j]==0){
				if (interim[i-1][j+1]==0){
					interim[i-1][j+1]=1;
				}
				if (i<interim.length-1){
					if (interim[i+1][j-1]==0){
						interim[i+1][j-1]=1;
					}
				}
			}
		}
	}
	mazeMap.gridMap=interim;
}

// I've left this function in as it's interesting to play with and see the code.
// testmaze is defined below. This calls the convertTo2d function on it to turn it into a 2d array
function removeDiagonalBlocksInTest(){

	interim= convertTo2d(testmaze);

		for (i=1;i<interim.length;i++){

			for (j=1;j<interim[i].length-1;j++){
				if(interim[i][j]==0){
					if (interim[i-1][j+1]==0){
						interim[i-1][j+1]=1;
					}
					if (i<interim.length-1){
						if (interim[i+1][j-1]==0){
							interim[i+1][j-1]=1;
						}
					}
				}
			}
		}
	return interim;
}

var testmaze= Array (

	2,1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,2,
	1,0,1,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,1,
	1,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,
	0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,
	0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,
	1,0,1,0,0,0,0,0,0,5,0,0,1,0,1,0,0,0,1,
	1,0,1,1,1,1,1,0,3,3,3,0,1,0,1,1,1,1,1,
	1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,
	1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,
	1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,
	1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,0,
	1,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,
	1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,0,
	1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,
	2,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,2
)
