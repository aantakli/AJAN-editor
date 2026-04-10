/*
 * File: pacman.js
 * Version: 2.0 beta 2
 *
 * Meta: All game logic is here - only the maze rendering and loading/kicking off the levels are done elsewhere.
 *       See ../pacman.html for the kickoff js - it calls loadScriptAndCallback (from pacman.html) with a param of the maze data file for the first level
 *       and a callback function (loadLevelOptions). Another callback from here renders the data (maze.js),
 *       before a third callback calls two fuctions from within this file (pacman.js), which are init() followed by startGame().
 *
 * Author: Matt Platts, mattplatts@gmail.com
 * History: Written 1999-2000. Updated for Netscape 6, June 2001. Tweaks for Google Chrome and Firefox around 2009. Updated to version 2.0 in 2016, and remains in progress..
*/

/* Index of functions

 * Section1 - set up and initialise
 *
 * set-up variables - these are not in a function and run automatically once on script load for the whole game. As much that we can set up immediately is done here.
 * init() - further declaring of variables, these are dependent on the level being rendered which differs them from the above, hence they are in a function. Largely cross browser vars.

 * Section 2 - Game loop functions - there are two loops continually running on timeouts - the reason for two being they must be able to run at different speeds to each other.
 * 	       NB: Most functionality is in gameLoop() - this is the standard loop that runs at a consistent speed throughout the game, including dealing with the timings of switching
 * 	       modes, collision detection and stopping/starting the game after pacman is eaten, as well as switching ghost directions (which is itself related to the game modes)
 * gameLoop()

 * Section 3 - Functions required by the game loops above. All of these relate to gameLoop() bar showFruit which relates to move()
 *
 * gameModes() - shifts the mode of the ghosts at various points (between scatter, chase, random etc)
 * generateGhostDir() - generates the next direction for a ghost who is at a junction or a dead end
 * excludeOppositeDirection() - because we want to keep them moving on and not just going back and forth
 * qtyBits() - how many bits are set in a value? Used for checking how many directions we can choose from
 * randomDir() - converts a random number into a legal random direction
 * headFor() - send a ghost to some specific co-ordinates
 * getBasicVisionDir() - the basic vision function is currently unused, however this was used to move a ghost towards you if it can see you in *any* game mode, and may be useful in the future
 * showFruit() - deals with displaying a fruit. Also when this happens, sets up the criterea for displaying the next one.
 *
 * Section 4 - Key down/up Functions - capturing multiple keypresses and converting them to move codes which are read by the move() function
 *
 * kd() - capture a key down event
 * kdns() - netscape 4 version of the above
 * keyLogic() - translate key press into a direction, storing the previous key press along the way for smooth action
 * ku() - *Deprecated* - fires when a key goes up

 * Section 5 - game resets, level loaders, lambdas and interstetials / messages
 *
 * NB: The order of functions when a level completes is:
 *     levelEnd-> (recursively calls itself to flash the maze after its completed)
 *     loadLevel-> (loads the data for the new maze via loadScriptAndCallback function)
 *     startNewLevel (calls renderGrid , WTF?!) ->
 *     reset (does timers, positions elements) ->
 *     start (displays start message, resets a few other things that we don't want in reset, finally kicks off the game loops on a timeout
 *     This whole functionality needs to be looked at!
 *
 * reset() - reset the sprites to their start positions before kicking the game off on a timer again. Used after losing a life.
 * resetLevel() - this is called from the R key and actually resets a level mid play (used for debugging)
 * levelEnd() - called when you've completed a level.
 * loadScriptAndCallback() - function for dynamically loading a new mazedata file.
 * startNewLevel() - kicks off a new level you've just loaded for the first time
 * loadLevel() - load a new level
 * start() - kick off the game or a new level

 * Section 7 - Classes and objects - finally moving this to OO!
 *
 * class_pacman
 * class_ghost
 * class_maze (still unused)
 * class_level (still unused)
 * makeGhosts - makes the four ghost objects
 * setup_sprites - this is called from the init function which itself is called onload, creates the pacman object and the 4 ghost objects and returns the sprites
*

 * Section Final - Temporary functions unused in normal play and for debugging.
 *
 * binaryLookup
 * wallColour
 * showmode()
 */


/*
 * SECTION 1 - set up variables, and init function to initialise the game.
*/

var sprite_pacman;
var sprites_ghosts;

// initial settings. these should be increased at around 10000 points?
var moveInc = (sessionStorage.moveInc) ? parseInt(sessionStorage.moveInc) : 2;

// time dependent vars
var powerPillLifetime=400; // how many iterations the powerpill lasts for - hard is 120. 200 for moveInc 5, 400 for moveInc 2
var ghostBlinkLifetime=65; // how long the ghosts blink for within the power pill. Hard is 15.
var fruitLifetime=400; // how many iterations a piece of fruit stays on screen - hard is 80 (moved from 95 to 195 as part of moveInc 5, or 295 for moveInc 2, then 395 in 2021 as its too hard)
var messageLifetime=1500; // millisecons for the duration of a message (life lost, get ready etc)
var scatterTime = 600; // how long ghosts remain in scatter mode before switching to chase mode to start (this decrements as the game goes on)
var chaseTime = 50; // how long the ghosts remain in chase mode
var speed = (sessionStorage.speed) ? sessionStorage.speed : 10;
var gameTime = (sessionStorage.gameTime) ? sessionStorage.gameTime : 10000;

if (moveInc==1) { // double these for movement in single pixels, however pacmans speed won't make much difference at moveInc 1, it's already as fast as the processor can manage!
	powerPillLifetime=800;
	ghostBlinkLifetime=130;
	fruitLifetime=800;
	messageLifetime=3000;
	scatterTime = 1200;
	chaseTime = 100;
	gameTime = gameTime*2;
	speed = speed; // IT WON'T GO FAST ENOUGH!!!! LET ALONE WHEN THE POWERUP FUNCTION INCREASES THE SPEED!
}

var basicVision = sessionStorage.basicVision; // turns on whether ghosts move towards you if they can see you in ALL modes or not.
var mode = "scatter" // the initial mode for starting the game
var previousMode = "scatter"; // simply ensures it is set to avoid error if there is no previous mode yet..
var levelOptions; // may contain an array set in each mazedata js file, or may be undefined. This ensures it exists..
var ghosts_names = new Array("Blinky","Pinky","Inky","Clyde");
var ghostSrc = new Array(document.images.gst0,document.images.gst1,document.images.gst2,document.images.gst3);
var total_ghosts=ghosts_names.length; // editable and only really used for debugging - ie set to 1 and read the console logs for one ghost as its easier than deciphering 4..

// pull in session storage vars - these are (to be) all settable from the settins page - the game will be entirely configurable and come in 'flavours' eventually...
var lives = parseInt(sessionStorage.lives);
var score = parseInt(sessionStorage.score);
var exlife1 = sessionStorage.exlife1;
var exlife2 = sessionStorage.exlife2;
var exlife3 = sessionStorage.exlife3;
var exlife4 = sessionStorage.exlife4;
var exlife5 = sessionStorage.exlife5;
var exlife6 = sessionStorage.exlife6;
var level = sessionStorage.level;
var fx = sessionStorage.fx; // standard effects include spin in sprites if pacman is eaten, and maze spin between levels
var extras = sessionStorage.extras; // experimental extra features

// Define timers
var pacTimer; // for the move() loop
var ghostsTimer; // for the gameLoop() loop

// define vars for flashing the maze as part of the game end routine
var mazecount=0;
var mazeNo=0;

// scores
var ghostscore=50;
var nextfruitscore=score+600;

// set up images sources
ghostImgs = new Array(new Image,new Image,new Image, new Image, new Image, new Image);
ghostImgs[0].src = 'graphics/ghost_red.gif';
ghostImgs[1].src = 'graphics/ghost_pink.gif';
ghostImgs[2].src = 'graphics/ghost_blue.gif';
ghostImgs[3].src = 'graphics/ghost_orange.gif';
ghostImgs[4].src = 'graphics/ghost5.gif';
ghostImgs[5].src = 'graphics/ghost6.gif';

eyes = new Image;
eyes.src = 'graphics/eyes.gif';
blank = new Image;
blank.src = 'graphics/blank.gif'; // for replacing an eaten pill with a blank image. How very 1998!

fruitImgs = new Array(new Image, new Image, new Image);
fruitImgs[0].src='graphics/cherry.gif';
fruitImgs[1].src='graphics/strawberry.gif';
fruitImgs[2].src='graphics/mushroom.png';

// Initialise global vars. (have so many global vars.. time for OO!)
var won = false; // true if won the game
var keycount=0; // number of keys currently depressed
var newdatabit = 0; // simply avoiding undefined errors - think this was in debugging only..
var onPause = 0; // game paused by the 'p' key or when displaying messages (eg. lost life)
var pillType = 0; // bool - is there a pill in the current cell?
var pilcount = 0; // number of pills eaten
var ppTimer = "0"; // counts down from 80 back to 0 when a powerpill is eaten
var powerpilon = false; // set to true when powerpill is eaten, back to false when it wears off
var moving = false; // set to true when the movement loop is being repeatedly called. It does stop at times (need to investigate why and if this is still the best way of doing things)
var newkey = 1; // key just pressed
var lastkey = 4; // key previously pressed (I have no idea why it is set to D - again just to avoid undefined errors I think if it is not set)
var movekey = 4; // active key (as above)
var fruitOn=false; // bool telling if a fruit is currently displaying - could simply use css lookups actually..
var fruitTimer=0; // decrements from the int in fruitLifetime when a fruit is on screen, fruit disappears when it reaches 1
var movespeed=speed; // set to the basic speed to start
var ghostspeed=speed; // set to the basic speed to start
var resetModeTime=gameTime; // the time the mode was last reset to the default (scatter). It starts as the game starts, so at gameTime;.
var effect;
var effectTimer=0;
var invincibility = 0;// new feature
var speedball = 0; // new feature
var constrainMovesToCells = 0;

// start positions - still needs to be calculated from the maze data in time
if (!pacStartTop){
	var pacStartTop=265;
} else {
	document.getElementById("pacman").style.top=pacStartTop; // for now just adjust it on the page
}
var pacStartLeft=305;
var ghostStartTop=205;
var ghostStartLeft=305;
if (sessionStorage && sessionStorage.level==2) {
	pacStartTop=265;
	pacStartLeft=305;
	ghostStartTop=205;
	ghostStartLeft=305;
}
var thisfruit=0;
var fruitArray = new Array(true,true,true);
var qty_bits_lookup=Array(0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4); // how many directions are there for each junction? Quick lokup table to avoid calculating number of possible directions at every junction

/* Function: init
 * Meta: init() was originally called from the body onLoad attribute, now it is called after the dynamically loaded javascript maze for the first level.
 *       init() sets up cross-browser pointer variables, defines several and vars arrays for later use, then calls start function to kick off the level itself.
 *       This is only required for the first level of the game.
*/
function init(){

	ns=(navigator.appName.indexOf('Netscape')>=0)? true:false;
	n6=(document.getElementById && !document.all)? true:false;
	if (n6) {ns=false; document.all=document.getElementsByTagName}

	if (n6){
		divPacman  =  (ns)? document.pacman:document.getElementById('pacman').style;
		divFruit   =  (ns)? document.fruit:document.getElementById('fruit').style;
		divMessage =  (ns)? document.message:document.getElementById('message').style;
		divStart   =  (ns)? document.start:document.getElementById('start').style;
		divMessEnd =  (ns)? document.messageEnd:document.getElementById('messageEnd').style;
	} else {
		divPacman   =  (ns)? document.pacman:document.all.pacman.style;
		divFruit    =  (ns)? document.fruit:document.all.fruit.style;
		divMessage  =  (ns)? document.message:document.getElementById('message').style;
		divStart    =  (ns)? document.message:document.all.start.style;
		divMessEnd  =  (ns)? document.messageEnd:document.all.messageEnd.style;
	}

	ghostDiv = new Array(	document.getElementById('ghost0').style,
				document.getElementById('ghost1').style,
				document.getElementById('ghost2').style,
				document.getElementById('ghost3').style,
				);

	fruitsrc = (ns)? divFruit.document.images[0]:document.images.berry;

	scoreform  = (ns)? document.score.document:document.forms[0].elements[0];
	lifeform   = (ns)? document.score.document:document.forms[0].elements[1];
	timeform   = (ns)? document.score.document:document.forms[0].elements[2];
	pilsrc     = (ns)? document:document;

	if (ns) {
		document.captureEvents(Event.KEYDOWN|Event.KEYUP);
		document.onkeydown=kdns;
		document.onkeyup=ku;
	}

	ghostData = new Array (6,7,9,10); // used later to test for if opposite directions are present
	leftG = new Array; topG = new Array; possG = new Array;
	vulnerable = new Array (true, true, true, true); // are the ghosts vulnerable at this point in time? Set to false when eaten and homing..
	onPathHome = new Array (false, false, false, false); // array showing if ghost is on a path (onPathHome means a path to the home base after being eaten)

	if (sessionStorage){
		if (sessionStorage.level>1){
			scoreform.value = sessionStorage.score;
			lifeform.value = sessionStorage.lives;
		}
	}

	ghostDir = new Array; // Array contains directions for each ghost
	//pacLeft = parseInt(divPacman.left)
	//pacTop = parseInt(divPacman.top)
	for(i=0;i<total_ghosts;i++){
		leftG[i] = parseInt(ghostDiv[i].left);
		topG[i] = parseInt(ghostDiv[i].top);
		ghostDir[i] = 8; // Set to 8 (up) to start the game..
	}
	var sprites = setup_sprites();
	console.log(sprites[0]);
	console.log(sprites[1][3]);
	//alert("ooalert returning sprites");
	return sprites;
}

/*
 * Function: startGate
 * Meta: This is purely a wrapper around start(), and called the first time from the callback in pacman.html
 *       There is no different functionality to start() here any longer, but leaving it in as I feel that I may want some in the future
 */
function startGame(sprites){
	start(sprites); // kick off the game timers. This needs to be called for each level and hence is not part of init()
}

/*
 * SECTION 2 - Originally the two main loop functions - ghosts (for running the ghosts) and move (for dealing with all the keypresses etc and moving pacman)
 * 	     - now only contains the gameLoop() function
*/

/*
 * Function: gameLoop
 * Meta: Deals with the ghosts movements on a recurring timer as one of the main game loops.
 *       Collision detection is also a part of this loop and not a part of the 'move' loop..
 *
*/
function gameLoop(){

	gameModes(); // these adjust on a timer

	// The movement functions are run four times in a loop - once for each ghost
	for (wg=0;wg<sprites_ghosts.length;wg++){
		sprites_ghosts[wg].move(wg);
	}

	// Decrement the power pill timer, and change source of ghost images if powerpill nearly over.
	if (ppTimer >0) {
		ppTimer=(ppTimer-1);
	}

	// Random game effect - experimental feature
	if (effectTimer > 0){
		effectTimer--;
		if (effectTimer==40){
			if (effect=="effect_long_spin"){
				effect_long_spin_warn();
			} else if (effect=="effect_quick_spin"){
				effect_quick_spin_warn();
			} else {

				effect_mushrooms_warn();
			}
		}
	}
	if (effectTimer==1){
		if (effect=="effect_long_spin"){
			effect_long_spin_end();
		} else if (effect=="effect_quick_spin"){
			effect_quick_spin_end();
		} else {
			effect_mushrooms_end();
		}
	}

	if (ppTimer == ghostBlinkLifetime) {
		for(i=0;i<total_ghosts;i++){
			if (!sprites_ghosts[i].onPathHome) {
				if (sprites_ghosts[i].vulnerable) { ghostSrc[i].src=ghostImgs[5].src;}
				if (fx){
					divName = "ghost" + i;
					document.getElementById(divName).classList.remove('spin');
				}
			}
		}
	}

	// Return ghost to normal when powerpill wears off.
	if (ppTimer == "0" && powerpilon) {
		powerpilon=false
		mode=previousMode;
		ghostspeed=speed;
		movespeed=speed;
		sprite_pacman.speed=speed; // set pacman speed back to normal
		document.getElementById("maze").classList.remove("spin");
		for(i=0;i<total_ghosts;i++){
			if (!sprites_ghosts[i].onPathHome) {
				ghostSrc[i].src = ghostImgs[i].src;
				onPathHome[i]=false
				sprites_ghosts[i].onPathHome=false;
				divName = "ghost" + i;
				document.getElementById(divName).classList.remove('spin');
				vulnerable[i] = true;
				sprites_ghosts[i].vulnerable=true;
				ghostscore=50;
			}
		}
	}

	// Check to see if a ghost has gone through the channel to the other side of the screen
	for (i=0;i<total_ghosts;i++){
		if (document.getElementById('cell-' + sprites_ghosts[i].posLeft+ '-' + parseInt(sprites_ghosts[i].posTop))){
			if (document.getElementById('cell-' + parseInt(sprites_ghosts[i].posLeft) + '-' + parseInt(sprites_ghosts[i].posTop)).classList.contains('mazeTunnel')){
				if (sprites_ghosts[i].posLeft==35){ sprites_ghosts[i].posLeft = 565+"px";}
				if (sprites_ghosts[i].posLeft==575){ sprites_ghosts[i].posLeft = 35+"px";}
			}
		}
	}

// binary lookup of the above (not yet working)
//for (i=0;i<total_ghosts;i++){
//		if ( mazedata[topG[i]] && mazedata[topG[i]][parseInt(leftG[i])]){
//			ghostPos = mazedata[topG[i]][parseInt(leftG[i])]; // ideally, somehow need to get this from the binary grid
//			if (ghostPos && (ghostPos == "4")){
//			alert("it is four");
//				if (ghostDir[i] ==2) {leftG[i] = 555; }
//				if (ghostDir[i] ==1) {leftG[i] = 35; }
//			}
//		}
//	}

	//checkBasicVision()
	// Game timer on the screen..
	if (!won){ timeform.value--;}
	if (timeform.value==0){
		lives = (lives-1);
		score -= 50;
		scoreform.value = score;
		lifeform.value -= 1;
		gameTime=sessionStorage.gameTime;
		timeform.value=gameTime;
		alert ("OUT OF TIME! One life lost.")
		if (lives==0) {
			locStr = "intropage.html?score=" + score;
			alert ("All lives lost - Game Over!! Your score was " + score + " points"); sessionStorage.score = score; location=locStr; } else {
			reset();
		}

	}

	// And finally, call the function again if the game isn't paused
	if (!onPause){ ghostsTimer = setTimeout("gameLoop()",ghostspeed);}
}


/*
 * SECTION 3
 * Logic to deal with which direction ghosts move in
*/

/*
 * Function gameModes
 * Meta: This is run at the beginning of the ghosts function to both get, and set, the game mode on a timer.
 *       The modes control the movement of the ghosts, which are scatter, chase and random
*/
function gameModes(){

		if (powerpilon){
			if (previousMode != "random") { previousMode=mode;}
			mode="random";
		} else {

			currentTime = timeform.value;
			if (currentTime < parseInt(resetModeTime) - parseInt(scatterTime)){
				showmode("MODE SWITCH from " + mode + " AT !" + currentTime);

				if (mode=="scatter"){
					resetModeTime = currentTime - chaseTime;
					mode="chase";
					showmode("Set mode to chase at " + currentTime + " - next change at " + resetModeTime);
				} else if (mode=="chase"){
					resetModeTime = currentTime - scatterTime;
					scatterTime = scatterTime - 10;
					mode="scatter";
					showmode("Set mode to scatter at " + currentTime + " next change at " + resetModeTime);
				} else {
					if (previousMode != "random"){
						mode=previousMode;
					} else {
						mode="scatter";
						previousMode="scatter";
					}
				}
			}
		}
		if (mode=="random" && !powerpilon){
			mode=previousMode;
		}

		showmode("MODE: " + mode + " next change at " + (parseInt(resetModeTime) - parseInt(scatterTime)));

}


/* Function excludeOppositeDirection
 * Meta: Removes the opposite direction from the list of possible moves - no point in going back where we've just come fron - keeps them moving around
*/
function excludeOppositeDirection(who,dirs){

	if (ghostDir[who]==1){ return  dirs & ~2;}
	if (ghostDir[who]==2){ return  dirs & ~1;}
	if (ghostDir[who]==4){ return  dirs & ~8;}
	if (ghostDir[who]==8){ return  dirs & ~4;}

	/*
	dirs=(dirs >>> 0).toString(2); // binary conversion

	if (ghostDir[who]==1){
		xreturn = dirs.substr(0, 2) + "0" +  dirs.substr(3,4);
	}
	if (ghostDir[who]==2){
		xreturn = dirs.substr(0, 3) + "0";
	}
	if (ghostDir[who]==4){
		xreturn = "0" +  dirs.substr(1,4);
	}
	if (ghostDir[who]==8){
		xreturn = dirs.substr(0, 1) + "0" +  dirs.substr(2,4);
	}
	return parseInt(xreturn,2);
*/
}

/*
 * Function: qtyBits
 * Meta: returns the numbers of set bits in a byte - in this case the number of directions - used at each junction
*/
function qtyBits(bin){
	/*
	count = 0;
	for(i = 0; i < bin.length; i++) { // would use map but creating arrays on the fly is LONG in javascript
		count += (bin >> i) & 0x01;
	}
	    return count;
	*/
	return qty_bits_lookup[bin];
}

/*
 * Function : randomDir
 * Meta: generates a random direction for a ghost by bitshifting the data to find the direction corresponding to the nth set bit
 * Param x - data from the mazedata array
 * Param y - take our random number and use the nth set bit from the right of the x (cell in mazedata)
*/
function randomDir(x,n){
	var sum = 0;
	var random_direction = 1;
	for (var i=0;i<4;i++){
		sum += (x >> i) & 1;
		if (i>0){
			random_direction = random_direction *2;
		}
		if (sum == n){
			return random_direction;
		}
	}
	return -1;
}


/*
 * Function: headFor
 * Param who (string) - index of which ghost we are sending somewhere
 * Param where (array) - 2 item aray of L and R co-ordinates of the cell we are sending the ghost to
 * Return dir (string) - the direction that can be direcly set for that ghost
*/
function headFor(who,where){
	currentCell = mazedata[parseInt([topG[who]])][parseInt(leftG[who])];
	if (!currentCell){
		//console.log("early return:",ghostDir[who]);
		return ghostDir[who]; // Doesnt look like i need to do this...
	}

	var dir=null;

	if (leftG[who] > where[0] && (currentCell & 2) && !(ghostDir[who] & 1) && ghostDir[who] != null){
		dir = 2;
	} else if (leftG[who] <= where[0] && (currentCell & 1) && !(ghostDir[who] & 2) && ghostDir[who] != null){
		dir= 1;
	}

	if (topG[who] > where[1] && (currentCell & 8) && !(ghostDir[who] & 4) && ghostDir[who] != null){
		dir=8;
	} else if (topG[who] <= where[1] && (currentCell & 4) && !(ghostDir[who] & 8) && ghostDir[who] != null){
		if (topG[who]==145 && leftG[who]==305 && !onPathHome[who]){
			// cant go back to ghost house - just send them right, whatever..
			dir=1;
		} else {
			dir=4;
		}
	}
	// ALERT need a new one for this if (currentCell.charAt(4)=="3"){ dir="U";} // for when ghosts are in the pound
	// now catered for separately in "sit" mode
	//if (ghostMode=="sit" && topG[who]==ghostStartTop && leftG[who]==ghostStartLeft) { dir=8; }
	//if (ghostMode=="sit" && topG[who]==ghostStartTop-30 && leftG[who]==ghostStartLeft) { dir=4; }

	//console.log(ghostDir[who],topG[who],leftG[who],ghostHomeBase[0],ghostHomeBase[1],currentCell.charAt[0],currentCell.charAt[1],currentCell.charAt[2],currentCell.charAt[3],dir);

	// not got a direction? Means we can't head there directly, so lets make a decision
	// if there are only two possibilities, try and force a 90 degree angle turn, otherwise just go through some defaults.
	// logic is: if its going R or L, force in this order: U,D,L,R
	// 	     if its going U or D, force in this order: L,R,U,D
	if (!dir) {

		qty_options = qtyBits(currentCell);
		if (qty_options==2){
			if (ghostDir[who]==1 || ghostDir[who]==2){
				if (currentCell & 8){
					dir= 8;
				 } else if (currentCell & 4){
					dir= 4;
				} else if (currentCell & 2){
					dir= 2;
				} else {
					dir= 1;
					alert("This wont even happen");
				}
			} else  if (ghostDir[who]==4 || ghostDir[who]==8){
				if (currentCell & 2) {
					dir= 2;
				 } else if (currentCell & 1){
					dir= 1;
				 } else if (currentCell & 8){
					dir= 8;
				} else {
					dir=4;
					alert("This will never happen");
				}
			}
		} else if (qty_options==1){

				dir = currentCell; // simple - theres only one direction set - the only way we can go!


		} else if ( qty_options==3 || qty_options ==4){
			// just keep going. This really helps when heading somewhere. I may come back to this for some more complex mazes in the future
			dir = ghostDir[who];
		}
	}

	//console.log("Sending " + who + " to " + dir + " from data: " + currentCell + "      at top:" , topG[who], " left:", leftG[who], "Legal: ", currentCell & dir);
	var legal = currentCell & dir;

	if (!legal){
		console.log("PROGRAM GENERATED AN ILLEGAL MOVE"); // one very useful error message when developing!
		onPause=1;
	}
	return dir;
}

function moveTo(what,where){
	what.style.top=parseInt(what.style.top)+30;
	what.style.left=parseInt(what.style.left)-30;
}

/*
 * Function: getBasicVisionDir
 * Meta: Get a direction based on the basic vision feature, used in the checkBasicVision function
 * NB: The lack of checking whether or not the direction can be made is actually what slows down the ghosts when a pill is on and they are in your line of sight
 * Although not programatically brilliant, it worked for the game in an 'off label' kind of way, so it got left in the original in 1999!
*/
function getBasicVisionDir(who,not){
	ghostDir[wg] = Math.floor(Math.random() *3);
	if (ghostDir[wg] == "0") {ghostDir[wg] = 8}
	if (ghostDir[wg] == "1") {ghostDir[wg] = 4}
	if (ghostDir[wg] == "2") {ghostDir[wg] = 2}
	if (ghostDir[wg] == "3") {ghostDir[wg] = 1}
	if (ghostDir[wg] == not) {getBasicVisionDir(wg,not)}
}

/*
 * Function: showFruit
 * Meta: displays a piece of fruit to the screen, sets fruitOn flag and sets up the criterea for the next one appearing
 * 	 NB: This is not called from the ghosts loop but rather the pacman move loop
*/
function showFruit() {
	nextfruitscore+=600;
	thisfruit++;
	fruitArray[thisfruit]=true;
	if (extras=="true"){ var rand_no = 2;; } else { var rand_no = 1;}
	whichFruit = Math.round(Math.random() * rand_no);
	fruitTimer=fruitLifetime;
	if (!fruitOn) {
		fruitsrc.src = fruitImgs[whichFruit].src;
	}
	fruitOn=true;
	divFruit.visibility='visible';

	if (document.getElementById("fruits")){
		document.getElementById("maze").removeChild(document.getElementById("fruits"));
	}

	xScore=document.createElement("div");
	t = document.createTextNode(" ");
	xScore.appendChild(t);
	xScore.setAttribute("style","opacity:1; display:block; position:absolute; top:265px; left:305px; font-weight:bold");
	xScore.setAttribute("class","sprite multiColour ");
	xScore.setAttribute("id","fruits");
	document.getElementById("maze").appendChild(xScore);
}

function createGhostScores(){
	for (var i=0;i<total_ghosts;i++){
		if (document.getElementById("ghostscore"+i)){
			document.getElementById("maze").removeChild(document.getElementById("ghostscore" + i));
		}
		xScore=document.createElement("div");
		t = document.createTextNode(" ");
		xScore.appendChild(t);
		xScore.setAttribute("style","opacity:1; display:block; position:absolute; font-weight:bold; color:cyan");
		xScore.setAttribute("class","sprite ");
		xScore.setAttribute("id","ghostscore"+i);
		document.getElementById("maze").appendChild(xScore);
	}
}


/*
 * SECTION 4
 * Key functions to deal with all the key press logic
*/

/* Function: kd
 * Meta: keydown = invoked if key pressed.
 *       if the game is paused and P has been pressed again to unpause, the unpause happens here by kicking off the game timers.
 *       for any other key logic is more complex and it is passed to keyLogic
*/
function kd(e){

	e.preventDefault();

	if (onPause){
		if (pacTimer){ clearTimeout(pacTimer);}
		if (ghostsTimer){ clearTimeout(ghostsTimer);}
		if (gameTimer){ clearTimeout(gameTimer);}

		if (document.all && !document.getElementById){key = window.event.keyCode}
		if (document.getElementById){ key = e.keyCode}
		if (key == "80" || key == "112"){
			onPause=0;
			sprite_pacman.move(); gameLoop();
		}
		// quit is allowed if the game is paused (q)
		else if (key=="81" || key=="113"){ location="intropage.html";}

	} else {
		if (keycount>=2) {keycount=0; movekey="Q"; if (!moving) sprite_pacman.move();}
		if (document.all && !document.getElementById){key = window.event.keyCode;}
		if (document.getElementById){ key = e.keyCode;}
		keyLogic(key);
	}
}

// netscape 4 version of kd.
function kdns(evt){
	if (keycount>=2) {keycount=0; movekey="Q"; if (!moving) sprite_pacman.move();}
	key = evt.which;
	//status = key
	keyLogic(key);
}

/*
 * Function: keyLogic
 * Meta: First works out which key it is, and translates it to a direction (or performs the pause or reset action).
 *       Four flags are present here - key, newkey, lastkey & movekey.
 *		key - this contains the key that has just been pressed resulting in this funciton being called, which
 * 		is immediately translated to upper case ASCII via it's ord value
 * 		movekey - this is the key which generated the current movement. The movement has the same upper case ASCII
 *  			  char value as the key pressed so it is easily compared.
 * 		newkey - If the key which has been pressed is a movement key but NOT the same direction as pacman is
 * 			 currently heading, newkey is set to the incoming key, and keycount is incremented. This new key
 * 			 *will be* the next direction that pacman takes assuming the move is possible - it is stored for
 * 			 if that occasion arises.
 * 			 No action is taken if it is the same key as the current movement - ther eis no need.
 * 		lastkey - this is the last key to be used which changed the direction of pacman, and consequently indicates
 *			  the direction in which he is currently traelling (which possibly makes this var redundant!
 *
 * 	 All of this data is picked up by the continually looping move function which contains inline explanations of what
 *	 is going on.
 *
 * 	 Some kind of explanation at deciphering my 17 year old logic follows:
 *       If the key that is pressed (key) is not the same as the previously pressed key (newkey - it *was* last time round!),
 *       then that previously pressed key is stored in lastkey. This signifies that a new movement is waiting to happen when it can.
 * 	 Movekey is the current movement, and if it's not the same as the key just pressed (key) the value is stored in newkey,
 * 	 and the move function is called if a flag 'moving' is false. move() itself is on a timer, but we don't wna to wait.
 * 	 The keycount variable is also incremented.
 * 	 Hmm no that didn't really help either did it..
*/
function keyLogic(keyIn){

	var key;
	// movement keys (aznm or cursor keys)
	if (keyIn=="65" || keyIn=="97"  || keyIn == "38") {key=8;} // up
	else if (keyIn=="90" || keyIn=="122" || keyIn == "40") {key=4;} // down
	else if (keyIn=="78" || keyIn=="110" || keyIn == "37") {key=2;} // left
	else if (keyIn=="77" || keyIn=="109" || keyIn == "39") {key=1;} // right

	// game reset key (r)
	else if (keyIn=="82" || keyIn=="114"){ resetLevel();}

	// quit (q)
	else if (keyIn=="81" || keyIn=="113"){ location="intropage.html";}

	// game pause key (p)
	else if (keyIn=="80" || keyIn=="112"){
			onPause=1;
			if (pacTimer){ clearTimeout(pacTimer);}
			if (ghostsTimer){ clearTimeout(ghostsTimer);}
			if (gameTimer){ clearTimeout(gameTimer);}
	}

	if (key && movekey != key) {
		newkey = key;
		if ((!moving && divStart.visibility=="hidden") || (!moving && speedball)) {sprite_pacman.move();}
		keycount++;
	}

}

/*
 * Function : ku
 * Meta: decreases keycount by one as a key goes up
*/
function ku(e){
	keycount--;
}


/*
 * SECTION 5
 * Game resets
*/

/*
 * Function: reset
 * Meta: Resets all positions, image sources and directions if a life is lost
*/
function reset(){

	if (pacTimer){ clearTimeout(pacTimer);}
	if (ghostsTimer){ clearTimeout(ghostsTimer);}
	if (gameTimer){ clearTimeout(gameTimer);}

	divPacman.top=pacStartTop+"px";
	divPacman.left=pacStartLeft+"px";

	document.getElementById("pacman").style.display="block";
	document.getElementById("pacman").classList.remove("pacman_8");
	document.getElementById("pacman").classList.remove("pacman_4");
	document.getElementById("pacman").classList.remove("pacman_2");
	document.getElementById("pacman").classList.add("pacman_1");

	won=false;
	sprite_pacman.posLeft = parseInt(divPacman.left);
	sprite_pacman.posTop = parseInt(divPacman.top);

	for (i=0;i<total_ghosts;i++){
		ghostDiv[i].top = ghostStartTop+"px";
		ghostDiv[i].left = ghostStartLeft+"px";
		leftG[i] = ghostStartLeft+"px";
		topG[i] = ghostStartTop+"px";
		sprites_ghosts[i].posTop=ghostStartTop+"px";
		sprites_ghosts[i].posLeft=ghostStartLeft+"px";
		sprites_ghosts[i].vulnerable=true;
		vulnerable[i] = true;
		ghostSrc[i].src=ghostImgs[i].src;
		ghostDir[i]=8;
	}
	newkey = 1;
	ppTimer="0";
	ghostscore=50;
	mode="scatter";
}

/*
 * Function resetLevel
 * Meta: called to regenerate a random maaze from the R key
 */
function resetLevel(){

	if (sessionStorage.mazeSource=="random"){
		mazedata=renderGrid();
		document.forms[0].elements.score.value = sessionStorage.score;
		score = parseInt(sessionStorage.score);
		pilcount=0; // move to reset func
		reset();
		startNewLevel();
	} else {
		location="intropage.html";
	}
}

/*
 * Function : checkBasicVision (previously called 'intelligence')
 * Meta: Gives the ghosts a bit of thinking power. If there's a clear line between them and you,
 *      this function will change their direction to move towards you, unless a powerpill is
 *      active on them, in which case they go in any direction that is not towards you.
*/

 /*    ************** This feature has been removed as it still needs converting to bitwise *************       */

/*
 * Function: levelEnd
 * Meta: Flash maze at end of level, by repeatedly calling this function on a timer and call the loadLevel function on the 12th flash to load up the next level.
*/
function levelEnd(){

	pilcount=0;
	sessionStorage.score=score;
	sessionStorage.lives = lives;
	sessionStorage.level++;
	if (sessionStorage.level==12){
		sessionStorage.level=1;
		if (speed>=25){speed=speed-1;}
	}

	// flashing maze effect
	if (mazeNo==2) mazeNo=0
	mazeCells = document.getElementsByClassName("wallCell");
	wallCells = document.getElementsByClassName("mazeCell");
	if (mazeNo==0){
		for(var i = 0; i < mazeCells.length; i++) {
		    mazeCells[i].style.borderColor = 'white';
		}
		for (var i=0; i < wallCells.length; i++){
			    wallCells[i].style.borderColor = 'white';

		}
		document.getElementById("mazeinner").style.borderColor="white";
	} else {
		for(var i = 0; i < mazeCells.length; i++) {
		    mazeCells[i].style.borderColor = 'blue';
		}
		for (var i=0; i < wallCells.length; i++){
		    wallCells[i].style.borderColor = 'blue';
		}
		document.getElementById("mazeinner").style.borderColor="blue";
	}
	mazeNo++
	mazecount++
	if (mazecount<12) {
		mazeFlashTimer=setTimeout ("levelEnd()",300);
	} else {
		mazecount=0;
		if (fx){
			document.getElementById("maze").classList.add("spin");
		}
		loadLevel(sessionStorage.level);
	}
}

/*
 * Function: loadScriptAndCallbackDuplicate
 * Meta: for dynamically loading another javascript and following up with a callback. This is a copy of the function in pacman.html
 *       left here as a reminder to try and get everything into one file
*/
function loadScriptAndCallbackDuplicate(url, callback){
    // Adding the script tag to the head
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}

/*
 * Lambda function: startNewLevel
 * Called as: Callback from loadLevel or resetLevel, itself called from loadLevel
 * Meta: Renders the new maze, resets the timer, resets the sprite positions and calls start (to show the next level message and kick off the timers)
*/
var startNewLevel = function (){
	mazedata = renderGrid();
	if (levelOptions != undefined){
		if (levelOptions.pacStartTop){
			pacStartTop=levelOptions.pacStartTop;
		}
		if (levelOptions.ghostStartTop){
			ghostStartTop=levelOptions.ghostStartTop;
		}
	}
	onPause=1;
	timeform.value=gameTime;
	reset();
	start();
}

/*
 * Function: loadLevel
 * Param: level (int) - the number of the level being loaded
 * Meta: Loads the mazedata file from the server, and calls startNewLevel as a callback
*/
function loadLevel(level){
	moving = false;
	dataFile = "js/data/mazedata" + level + ".js";
	loadScriptAndCallback(dataFile,startNewLevel);
}

/*
 * Function: start
 * Meta: At the start of each level, or after losing a life, display the message and kick off the game timers
*/
function start(sprites){
	if (!sprite_pacman){
		sprite_pacman=sprites[0];
	}
	if(!sprites_ghosts){
	sprites_ghosts=sprites[1]; //; this is an array within an array
	}
	console.log(sprite_pacman);
	mode="scatter";
	resetModeTime=gameTime;
	ghostReleaseTime = timeform.value;
	ghostDelayRelease=Array(); // used to delay the release of each ghost
	for (var i=0;i<total_ghosts;i++){
		ghostDelayRelease[i] = ghostReleaseTime - i*47;
		//console.log("START GHOST DELAY RELEASE",ghostDelayRelease[i]);
	}
	onPause=0;
	document.getElementById("levelIndicator").innerHTML = "Level " + sessionStorage.level;
	divStart.visibility="visible";
	gameTimer = setTimeout('document.getElementById("maze").classList.remove("spin"); divStart.visibility=\'hidden\'; sprite_pacman.move(); gameLoop();',messageLifetime);
}

/* Section 6 : Classes and Objects */

// pacman object constructor
var class_pacman = function(startLeft,startTop){

	this.posLeft=startLeft;
	this.posTop=startTop;
	this.direction = 8;
	this.lives = sessionStorage.lives;
	this.speed = sessionStorage.speed;
	this.speed = movespeed;

	this.move = function(){

		//Note: For binary lookup, 1=right, 2=left, 4=down, 8=up
		// 1. Look up the possible moves from the current position
		if (mazedata[this.posTop] && mazedata[parseInt(this.posTop)][parseInt(this.posLeft)]){ // queried as s.part of moveInc
			pac_possibilities = mazedata[parseInt(this.posTop)][parseInt(this.posLeft)];
		} else {
			pac_possibilities = "";

			if (!constrainMovesToCells){
				if (this.direction==1 || this.direction==2){
					pac_possibilities = 3; // allow opposites of L & R if no cell data
				} else if (this.direction== 4 || this.direction == 8){
					pac_possibilities = 12; // allow opposites of D and U if no cell data
				}
			}
		}
		//console.log(pac_possibilities);


		// 2. If the latest key press has generated a character in the possible moves array, set 'engage', set the movekey var to this key, and also the lastkey var
		if (pac_possibilities && (pac_possibilities & newkey)) {

			engage=true; movekey = newkey; lastkey = newkey; // lastkey set to stop constant repetition of last 2 moves without the user touching anything.. see later on.
			//alert("YES to " +  pac_possibilities + " &" + newkey);
		} else if (pac_possibilities && (pac_possibilities & lastkey)){

			// 2.1 If previously pressed key generated a character that exists in the possible moves array then we can use that to continue in that direction
				engage = true;
				movekey = lastkey;

			// 2.2 The latest and last key presses do not match a possible direction - therefore pacman stops. 'engage' and 'moving' set to false
		} else if (!pac_possibilities){
			engage = true;
		} else {
			engage = false;
			moving = false;
		}

		//console.log(this.posTop,this.posLeft,"Mazedata:",pac_possibilities,"Engage:",engage,"movekey:",movekey,"Newkey",newkey,"Moving",moving);
		// 3. Engage is now set if a move can be made. This is either off the new key the previously pressed key, it doesn't matter as we make that move.
		if (engage) {

			if (movekey==newkey) { // 4. This means the latest key press and not the previous one generated this move, so we update the icon to point the right way
				newClass = "pacman_" + newkey;
				document.getElementById("pacman").classList.remove("pacman_1");
				document.getElementById("pacman").classList.remove("pacman_2");
				document.getElementById("pacman").classList.remove("pacman_4");
				document.getElementById("pacman").classList.remove("pacman_8");
				document.getElementById("pacman").classList.add(newClass);
			}

			// 5. Move the sprite on screen to correspond to the direction
			if (movekey==8) {divPacman.top=(parseInt(this.posTop)-moveInc)+"px";  this.posTop=parseInt(this.posTop)-moveInc;}
			if (movekey==4) {divPacman.top=(parseInt(this.posTop)+moveInc)+"px";  this.posTop=parseInt(this.posTop)+moveInc;}
			if (movekey==2) {divPacman.left=(parseInt(this.posLeft)-moveInc)+"px"; this.posLeft=parseInt(this.posLeft)-moveInc;}
			if (movekey==1) {divPacman.left=(parseInt(this.posLeft)+moveInc)+"px"; this.posLeft=parseInt(this.posLeft)+moveInc;}
			this.direction=movekey;
			//alert("Its engaged - just moved");


			//console.log("Top: " + this.posTop + " Left: " + this.posLeft);

			// pills
			if (document.getElementById('cell-' + this.posLeft + '-' + this.posTop) && document.getElementById('cell-' + this.posLeft + '-' + this.posTop).getAttribute('data-pills')){
				pillType = document.getElementById('cell-' + this.posLeft+ '-' + this.posTop).getAttribute('data-pills');
			} else {
				pillType=0;
			}
			if (pillType == "1" || pillType == "2"){
				this.eatPill();
			}

			// Give extra lives at various points. As points may increment considerably on a single cell (although rare) 1000 points leeway for checking is set.
			if (score>=5000 && score <6000 && exlife1) {
				exlife1=0; sessionStorage.exlife1 = 0;
				lives++; sessionStorage.lives = lives; lifeform.value = lives;
			}
			if (score>=10000 && score <10500 && exlife2) {
				exlife2=0; sessionStorage.exlife2=0;
				lives++; sessionStorage.lives++; lifeform.value = lives;
			}
			if (score>=20000 && score <21000 && exlife3) {
				exlife3=0; sessionStorage.exlife3 = 0;
				lives++; sessionStorage.lives = lives; lifeform.value = lives;
			}
			if (score>=30000 && score <31000 && exlife4) {
				exlife4=0; sessionStorage.exlife4 = 0;
				lives++; sessionStorage.lives = lives; lifeform.value = lives;
			}
			if (score>=40000 && score <41000 && exlife5) {
				exlife5=0; sessionStorage.exlife5 = 0;
				lives++; sessionStorage.lives = lives; lifeform.value = lives;
			}
			if (score>=50000 && score <51000 && exlife6) {
				exlife6=0; sessionStorage.exlife6 = 0;
				lives++; sessionStorage.lives = lives; lifeform.value = lives;
			}

			// show a piece of fruit at certain times - based on incrementing score with a length in a decrementing var called fruitTimer
			if (score >= nextfruitscore && score <=nextfruitscore+300 && fruitArray[thisfruit]) {showFruit()}
			if (fruitTimer>0) {fruitTimer--;}
			if (fruitTimer==1) {
				divFruit.visibility='hidden'; fruitOn=false;
			}

			// fruit
			if (fruitOn && this.posLeft == parseInt(divFruit.left) && this.posTop == parseInt(divFruit.top)) {
				this.eatFruit();
			}

			// For the tunnels off the side of the mazes, may need to update location of pacman
			// NB: The tunnel is denoted in the data by a capital O in the movement bit of the data.
			this.checkForTunnel();

			moving = true;
			if (!won && !onPause){
				setTimeout(function(){ sprite_pacman.move(); }, this.speed);
			}
		}
	} // end function move


	this.checkForTunnel = function(){

		if (document.getElementById('cell-' + this.posLeft + '-' + this.posTop)){
			if (document.getElementById('cell-' + this.posLeft + '-' + this.posTop).classList.contains('mazeTunnel')){
				if (this.posLeft==35){
					this.posLeft=555; divPacman.left=this.posLeft;
				} else if (this.posLeft==575){
					this.posLeft=55; divPacman.left=this.posLeft;
				}
			}
		}

	}


	this.eatPill = function(){


		document.getElementById('cell-' + this.posLeft + '-' + this.posTop).setAttribute('data-pills',0); // reset pill to zero

		if (ns) pilsrc = eval("document.p" + this.posLeft + this.posTop + ".document");
		pilName = "pil_" + this.posLeft + this.posTop;
		document.images[pilName].src=blank.src;

		if (pillType==2){
			this.powerUp();
		}

		pilcount++;
		score += 10;
		scoreform.value = score;

		// check if game won
		if (pilcount >= pillNumber) {
			won = true
			onPathHome[0]=true; onPathHome[1]=true; onPathHome[2]=true;onPathHome[3]=true;
			document.getElementById("pacman").style.display="none";
			levelEnd();
		}

	}

	this.eatFruit = function(){

		score=score+250; scoreform.value=score
		fruitOn=false
		divFruit.visibility='hidden';

		document.getElementById("fruits").style.top=(parseInt(document.getElementById("fruits").style.top)-30);
		document.getElementById("fruits").innerHTML="250";
		document.getElementById("fruits").classList.add("trans");
		document.getElementById("fruits").style.opacity=0;

		srcname = fruitsrc.src.substring(fruitsrc.src.lastIndexOf('/')+1);
		if (srcname == "mushroom.png"){
			var effect_no = Math.floor(Math.random() * 3);
			if (effect_no == 1) { effect = "effect_long_spin"; }
			if (effect_no == 2) { effect = "effect_mushrooms"; }
			if (effect_no == 3) { effect = "effect_mushrooms"; }

			if (effect=="effect_long_spin"){
				effect_long_spin();
			} else if (effect=="effect_quick_spin"){
				effect_quick_spin();
			} else {
				effect_mushrooms();
			}
		}
	}

	this.powerUp = function(){

		createGhostScores();
		ppTimer = powerPillLifetime;
		ghostscore=50;
		movespeed = speed-4; // moving to this.speed
		this.speed = this.speed-4;
		powerpilon = true;
		//document.getElementById("maze").classList.add("spin"); // mushrooms
		for(i=0;i<total_ghosts;i++){
			if (!sprites_ghosts[i].onPathHome){
				ghostSrc[i].src = ghostImgs[4].src;
				vulnerable[i]=true;
				sprites_ghosts[i].vulnerable=true;
			}
		}

	}


	this.powerDown = function(){}

}

// ghost constructor
var class_ghost = function(name,number){

	this.name 	= name;
	this.elementId 	= "ghost" + number;
	this.src  	= ghostSrc[number];
	this.posLeft 	= parseInt(document.getElementById(this.elementId).style.left);
	this.posTop 	= parseInt(document.getElementById(this.elementId).style.top);
	this.vulnerable = false;
	this.alive	= 1; // gets rid of the onPathHome global
	this.mode	="scatter"; // mode (chase, scatter, frightened, sit, homing)
	this.leftBase	= 0; // bool for has left home base
	this.direction 	= 8; //  one of the ghosts starts in a position with no moves,it needs to move up to get an 'official' position otherwise it never starts
	this.speed 	= sessionStorage.speed;

	this.homing_stack= [];//{'x':undefined,'y':undefined}; // create stack of direction changes when ghost is homing
	this.homing_loop=0;


	// Below not yet working. Move graphic??
	console.log(levelOptions);
	if (levelOptions.ghostStartTop){
		this.posTop=parseInt(levelOptions.ghostStartTop);
	}
	this.possibleMoves = "";

	ghostReleaseTime = timeform.value;
	this.releaseDelay = ghostReleaseTime - number*47;

	// Exclude opposite direction
	this.excludeOppositeDirection = function(who,dirs){

		if (this.direction==1){ return  dirs & ~2;}
		if (this.direction==2){ return  dirs & ~1;}
		if (this.direction==4){ return  dirs & ~8;}
		if (this.direction==8){ return  dirs & ~4;}
	}

	// Generate Ghost Direction
	this.generateGhostDir= function(who,howMany,ghost_possibilities) {

		currentTime = timeform.value;
		if (this.onPathHome){
			this.mode="homing";
		} else if (this.releaseDelay < currentTime){
			this.mode="sit";
		} else if (powerpilon && !this.vulnerable){
			this.mode="scatter";
		} else {
			this.mode=mode;
		}

		//console.log(mode,resetModeTime);

		dice=Math.round(Math.random() * 6);

		if (this.mode=="scatter" && dice < 7){

			if (!this.onPathHome){
				     if (who==0){ headLeft = 535; headUp=435;} // red
				else if (who==1){ headLeft = 35; headUp=35;} // blue
				else if (who==2){ headLeft = 535; headUp=35;} // pink
				else if (who==3){ headLeft = 35; headUp=435;} // orange
				this.direction = this.headFor(who,Array(headLeft,headUp));
			}

		} else if (this.mode=="chase" && dice < 7){

			if (!this.onPathHome){
				headLeft = parseInt(divPacman.left);
				headUp= parseInt(divPacman.top);
				this.direction = this.headFor(who,Array(headLeft,headUp));
			}

		} else if (this.mode=="homing"){

			currentCell = mazedata[parseInt(this.posTop)][parseInt(this.posLeft)]
			this.direction = this.headFor(who,ghostHomeBase);
			stackData={'x':parseInt(this.posLeft),'y':parseInt(this.posTop),'d':this.direction};
			this.homing_stack.push(stackData);



		} else if (this.mode=="random") { // random

				//possibilities=possibilities.replace(/X/g,"");
				if (mazedata[parseInt(this.posTop)][parseInt(this.posLeft)] == "3" && !this.onPathHome){// ghosts can only re-enter the home base when on a path to regenerate
					ghost_possibilities=ghost_possibilities.replace(/5/g,"");
				}
				if (howMany>2){ // NB: having howmany>2 gives more chances for the ghosts to backtrack on themsleves, making them easier to catch.
					ghost_possibilities=this.excludeOppositeDirection(who,ghost_possibilities);
					howMany--;
				}
				if (!this.onPathHome){

					random_direction = Math.floor(Math.random() *(howMany)) + 1;
					this.direction=randomDir(ghost_possibilities,random_direction);

					//console.log("ghostDir for wg " +who + " = " + ghostDir[who] + " from " + ghost_possibilities + " with a rand of " + random_direction);
					if (!ghost_possibilities & this.direction){
						console.log("ILLEGAL DIRECTION GENERATED FOR !" + who);
					}
				} else {
					this.direction = this.headFor(who,ghostHomeBase);
				}

		} else if (this.mode=="sit"){
			//sit_rand_direction=Math.round(Math.random() * 1);
			//if (sit_rand_direction==0){ sit_rand_direction==2;}
			//if (ghost_possibilities & sit_rand_direction){ ghostDir[who]=sit_rand_direction; }
			//ghostDir[who] = headFor(who,ghostHomeBase);
			if (parseInt(this.posTop)==ghostStartTop && parseInt(this.posLeft)==ghostStartLeft) { this.direction=8; }
			else if (parseInt(this.posTop)==ghostStartTop-60 && parseInt(this.posLeft)==ghostStartLeft) { this.direction=4; }
			else { this.direction = this.headFor(who,ghostHomeBase); }
		}

		//console.log("Returning direction in mode:",mode,this.mode,this.direction);
		return this.direction;

	}

	// headFor
	this.headFor = function(who,where){

		currentCell = mazedata[parseInt(this.posTop)][parseInt(this.posLeft)];
		if (!currentCell){
			//console.log("early return as no cell at:",this.posTop,this.posLeft,this.direction);
			return this.direction; // Doesnt look like i need to do this...
		}

		var dir=null;

		// simple rules first where the opposite direction to where you want to go does not exist
		// note that if there is an U/D it will always superseed a L/R direciton!! This was originally written as when ghoss head for home the last move they need to make is down so /L/R cannot take precedence!
		if (parseInt(this.posLeft) > where[0] && (currentCell & 2) && !(this.direction & 1) && this.direction != null){ // if you should go left and can go left and can't go right
			dir = 2;
		} else if (parseInt(this.posLeft) <= where[0] && (currentCell & 1) && !(this.direction & 2) && this.direction != null){  // if you should go right and can go right and can't go left
			dir= 1;
		}

		if (parseInt(this.posTop) > where[1] && (currentCell & 8) && !(this.direction & 4) && this.direction != null){ // if you should go up and can go up and can't go down
			dir=8;
		} else if (parseInt(this.posTop) <= where[1] && (currentCell & 4) && !(this.direction & 8) && this.direction != null){ // if you should go down and can go down and can't go up
			if (parseInt(this.posTop)==145 && parseInt(this.posLeft==305) && !this.onPathHome){ // This code and comment looks questionable:
				// cant go back to ghost house - just send them right, whatever..
				dir=1;
			} else {
				dir=4;
			}
		}
		// ALERT need a new one for this if (currentCell.charAt(4)=="3"){ dir="U";} // for when ghosts are in the pound
		// now catered for separately in "sit" mode
		//if (ghostMode=="sit" && topG[who]==ghostStartTop && leftG[who]==ghostStartLeft) { dir=8; }
		//if (ghostMode=="sit" && topG[who]==ghostStartTop-30 && leftG[who]==ghostStartLeft) { dir=4; }

		//console.log(ghostDir[who],topG[who],leftG[who],ghostHomeBase[0],ghostHomeBase[1],currentCell.charAt[0],currentCell.charAt[1],currentCell.charAt[2],currentCell.charAt[3],dir);

		// ok, the more complex code now:
		// not got a direction yet? Means we can't head there directly as this direction isn't possible, so lets make a decision:
		// if there are only two possibilities, try and force a 90 degree angle turn, otherwise just go through some defaults.
		// logic is: if its going R or L, force in this order: U,D,L,R
		// 	     if its going U or D, force in this order: L,R,U,D
		if (!dir) {

			qty_options = qtyBits(currentCell); //look up tells us how many directions there are here (how many bits are set)

			if (qty_options==2){ // there are 2 directions
				if (this.direction==1 || this.direction==2){// if currently going left or right
					if (currentCell & 8){
						dir= 8;
					 } else if (currentCell & 4){
						dir= 4;
					} else if (currentCell & 2){
						dir= 2;
					} else {
						dir= 1;
						alert("This wont even happen because the code is called at a junction so the last option can never be used!");
					}
				} else  if (this.direction==4 || this.direction==8){
					if (currentCell & 2) {
						dir= 2;
					 } else if (currentCell & 1){
						dir= 1;
					 } else if (currentCell & 8){
						dir= 8;
					} else {
						dir=4;
						alert("This will never happen");
					}
				}
			} else if (qty_options==1){

					dir = currentCell; // simple - theres only one direction set - the only way we can go!


			} else if ( qty_options==3 || qty_options ==4){
				// just keep going. This, it turns out, really helps when heading somewhere. I may come back to this for some more complex mazes in the future
				dir = this.direction;
			}
		}

		// Final question - are we homing and have we been here before?  If so we are stuck in a loop so need to choose a different directions this time!
		// Loopbreaker
		if (this.mode=="homing" && this.homing_stack.length>1){
			for (pastMove in this.homing_stack){
				if (parseInt(this.posLeft)==this.homing_stack[pastMove]['x'] && parseInt(this.posTop)==this.homing_stack[pastMove]['y'] && dir == this.homing_stack[pastMove]['d']){
					this.homing_loop=1;
					console.error("Stuck in a loop!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
					console.log(this.homing_stack);
					console.log(this.name);
					console.log(dir);
					if (dir==8||dir==4){
						if (currentCell & 1){ dir=1; } else if (currentCell & 2) { dir=2;}
					}
					if (dir==1 || dir==2){
						if (currentCell & 8){ dir=8; } else if (currentCell & 4) { dir=4;}
					}
				}
			}
		}

		//console.log("Sending " + who + " on dir " + dir + " from current cell data: " + currentCell + " at top:" , this.posTop, " left:", this.posLeft, "Legal: ", currentCell & dir);
		var legal = currentCell & dir;

		if (!legal){
			console.log("PROGRAM GENERATED AN ILLEGAL MOVE ",currentCell,dir); // one very useful error message when developing!
			onPause=1;
		}
		return dir;
	}

	this.move = function(wg){


		//console.log("position for " + wg + ":",this.posTop,this.posLeft);
		// 1. Load the possible moves from the mazedata array into the possG array.
		//   All the data for all the ghosts is used later (collision detection) hence the array.
		if (mazedata[parseInt(this.posTop)] && mazedata[parseInt(this.posTop)][parseInt(this.posLeft)]) { // queried as part of moveInc
			this.possibleMoves = mazedata[parseInt(this.posTop)][parseInt(this.posLeft)];
		} else {
			this.possibleMoves = ""; // set as part of moveInc
		}

		//console.log("possible moves for " + wg + ":",this.possibleMoves);
		// 2. Check possibile moves. The ghostData array contains info on which moves are possible.
		//    If more than 2 directions are present, or only 1 (ie backwards, so dead end) - a new direction must be generated...
		totalDirections=qtyBits(this.possibleMoves);
		if (totalDirections>2 || totalDirections==1) {  this.direction = this.generateGhostDir(wg,totalDirections,this.possibleMoves);}

		// 3. if there's 2 directions only, need to ascertain if they are 180 or 90 degrees.
		if (totalDirections==2) {
			if (this.possibleMoves != 12 && this.possibleMoves != 3){ // 12 is Up and Down, 3 is Left and Right - no need to recalc
				 this.direction = this.generateGhostDir(wg,totalDirections,this.possibleMoves);  // don't have any pairs so it's right angles
			}
		}

		// 4. if basicVision is set, and ghost is not onPathHome to home, compare ghost positions to your position & if it can see you, adjust direction.
		if (!this.onPathHome && basicVision === true) { checkBasicVision(wg) }

		// update position variable, and then position
		myDir=this.direction;
		if (myDir == 8) {this.posTop=(parseInt(this.posTop)-moveInc)+"px"; 	topG[wg] = (topG[wg]-moveInc); 	 ghostDiv[wg].top = this.posTop; }
		if (myDir == 4) {this.posTop=(parseInt(this.posTop)+moveInc)+"px"; 	topG[wg] = (topG[wg]+moveInc); 	 ghostDiv[wg].top = this.posTop; }
		if (myDir == 2) {this.posLeft=(parseInt(this.posLeft)-moveInc)+"px"; 	leftG[wg] = (leftG[wg]-moveInc); ghostDiv[wg].left = this.posLeft; }
		if (myDir == 1) {this.posLeft=(parseInt(this.posLeft)+moveInc)+"px";	leftG[wg] = (leftG[wg]+moveInc); ghostDiv[wg].left = this.posLeft; }

		// For the path stuff... if it goes off the maze (er.. this means there is an error somehow int the mazedata array!), then immediately return to home.
		if (this.onPathHome){
			// if it's home, reset it to not vulnerable and back to correct image
			if (parseInt(this.posLeft) == ghostHomeBase[0] && parseInt(this.posTop) == ghostHomeBase[1]){
				if (!won){ this.onPathHome = false; }
				this.vulnerable = false;
				ghostSrc[wg].src=ghostImgs[wg].src;
				ghostDir[wg] = 8;
				sprites_ghosts[wg].direction = 8;
				sprites_ghosts[wg].homing_stack=[]; //reset the stack for directions taken to get home
			}
		}

		// Collision detection
		// If so, either send the ghost home, or lose a life, depending whether a powerpill is currently active.
		if (ppTimer > 1){
			closeness=20;
		} else {
			closeness=10;
		}

		// detect collision
		if (parseInt(sprite_pacman.posLeft) > parseInt(this.posLeft)-closeness && parseInt(sprite_pacman.posLeft) < parseInt(this.posLeft)+closeness && parseInt(sprite_pacman.posTop) > parseInt(this.posTop)-closeness && parseInt(sprite_pacman.posTop) < parseInt(this.posTop)+closeness &&
			(parseInt(sprite_pacman.posLeft) == parseInt(this.posLeft) || parseInt(sprite_pacman.posTop) == parseInt(this.posTop) || this.vulnerable)) // this ensures not on a corner, as the closeness is not correct - pacman makes a move down and the ghost goes accross and therefore matches with the rest of the equation - which we don't want - it means you can't get away. If the ghost is vulnerable, i've decided to let this through though..
			{

			// if no Powerpill and game not won and ghost not on path, you've lost a life
			// or pill is on but ghost is not vulnerable then same
			if ((ppTimer=="0" && !won && !this.onPathHome && !invincibility) || (ppTimer>="1" && !this.vulnerable && !this.onPathHome && !invincibility)) {
				lives = (lives-1);
				score -= 50;
				scoreform.value = score;
				lifeform.value -= 1;
				resetModeTime = timeform.value;

				// reset ghost release time and mode
				mode="scatter";
				//showmode("Set mode to " + mode + " for scatterTime " + scatterTime);
				ghostReleaseTime = timeform.value;
				ghostDelayRelease=Array(); // used to delay the release of each ghost
				for (i=0;i<total_ghosts;i++){
					ghostDelayRelease[i] = ghostReleaseTime - i*15;
					if (fx){
						document.getElementById("ghost" + i).classList.add("spin");
					}
				}
				divMessage.visibility='visible';
				if (fx){
					document.getElementById("pacman").classList.add("spin");
				}
				onPause=1;
				setTimeout('divMessage.visibility=\'hidden\'; onPause=0;   document.getElementById("pacman").classList.remove("spin"); for (i=0;i<total_ghosts;i++){ document.getElementById("ghost" + i).classList.remove("spin"); } pacTimer = setTimeout(sprite_pacman.move(),movespeed); ghostsTimer = setTimeout("gameLoop()",ghostspeed)',messageLifetime);


				 if (lives==0) {
					divMessEnd.visibility='visible';
					onPause=1;
					divMessage.display="none";
					if (fx){
						for (i=0;i<total_ghosts;i++){
							document.getElementById("ghost" + i).classList.add("negspin");
						}
					}
					reset();
					locStr = "intropage.html?score=" + score;
					won=true;
					setTimeout('won=true; sessionStorage.score=score; location=locStr;',messageLifetime);
				} else {
					reset();
				}
			//if powerpill is on and ghost is vulnerable, turns ghost to eyes, sets first possible direction, and makes path true
			} else if (ppTimer>="1" && this.vulnerable) {
				ghostSrc[wg].src=eyes.src;
				this.vulnerable = false;
				this.onPathHome = true;

				document.getElementById("ghostscore" + wg).style.top=(parseInt(document.getElementById("ghost" + wg).style.top))+"px";
				document.getElementById("ghostscore" + wg).style.left=(parseInt(document.getElementById("ghost" + wg).style.left))+"px";
				document.getElementById("ghostscore" + wg).innerHTML=ghostscore;
				document.getElementById("ghostscore" + wg).classList.add("trans");
				document.getElementById("ghostscore" + wg).style.opacity=0;
				document.getElementById("ghostscore" + wg).style.top=(parseInt(document.getElementById("ghostscore" + wg).style.top-30))+"px";

				score += ghostscore;
				ghostscore+=50;
				scoreform.value = score;

		      }
		}
	}


	// modes
	function chase(){}
	function scatter(){}
	function sit(){}
	function homing(){}

	function frightened(){}
	function eaten(){}

}

var class_maze = function(mazedata){

	function populate(){}
	function removePill(){}
}

var class_level = function(){

	function load(){} // load a new level
	function start(){} // start the level off
	function reset(){} // reset all sprites
}

// make four ghosts to start
function makeGhosts(){
	var all_ghosts = new Array();
	for (i=0;i<ghosts_names.length;i++){
		all_ghosts[i] = new class_ghost(ghosts_names[i],i);
	}
	return all_ghosts;
}

function setup_sprites(){
	var pacman = new class_pacman(pacStartLeft,pacStartTop);
	var all_ghosts = makeGhosts();
	console.log(all_ghosts);
	var total_ghosts = ghosts_names.length;
	var level = new class_level(level);

	return Array(pacman,all_ghosts);

	//pacman.move();

}

/*
 * Function binaryLookup
 * Meta; just experimenting
*/
function binaryLookup(direction,data) {

	// assume our movements UDLR are 8,4,2,1
	// would give us the foolowing
	var moves = Array ();
	moves[0] = 0;
	moves[1] = "R"; // Right only
	moves[2] = "L"; // Left only
	moves[3] = "LR"; // Left and right
	moves[4] = "D"; // Left only
	moves[5] = "DR"  // Down and right
	moves[6] = "DL"; // Down and left
	moves[7] = "DLR"; // Down, left, right
	moves[8] = "U"; // Up only
	moves[9] = "UR"; // Up and right
	moves[10] = "UL"; // Up and left
	moves[11] = "ULR"; // Up, left and right
	moves[12] = "UD" ; // Up and down
	moves[13] = "UDR"; // UP down right
	moves[14] = "UDL"; // UP down loeft
	moves[15] = "UDLR"; // All directions

	// by storing the possible positions instead of as UDLR but as a key of the array, can & the current direction to the number to work out if the move is possible

	// example input 1,12 (wher 1 is Right and 12 is the value stored in the data
	// 12 & 1 = 0 - move not possible
	// example input 1,13
	// 13 & 1 = 1 - move possible
	// should mean less bytes to store and quicker lookup

	// convert dec to bin: (15 >>> 0).toString(2); // gives 1111
	// convert bin to dec: parseInt(1111,2); // gives 15

	// to get random direction for all possible directions
	// 1 << Math.floor(Math.random() * 4) // returns 1,2,4 or 8

	// get random direction for pre-existing set x
	// 1 << Math.floor(Math.random() * moves[x].length) // returns 1,2,4 or 8 (which are R,L,D U)

	// to remove the reverse direction from the existing set (we don't want to go backwards)
	// reverse = current == 1 ? 2 : current==2 ? 1 : current==4 ? 8 : 4;
	// possibles = x & ~reverse

	// thus to generate a new direction but not the way we have come would be:
	// 1 << Math.floor(Math.random() * (x ^ current).toString().length)

	x = 13; // "UDR"
	current = 8; // right
	console.log("Current:",current,moves[current]);

	reverse = current == 1 ? 2 : current==2 ? 1 : current==4 ? 8 : 4;
	console.log("Reverse direction is:",reverse,moves[reverse]);
	console.log("X:",x,moves[x]);

	removed = x & ~reverse; // we are bitwise anding the nibble with a bitwise not on the reverse direction - moves[removed] gives the new data, removed the index.
	console.log("Possible directions with the reverse removed:", removed, (removed >>> 0).toString(2), moves[removed]);

	// 3 ways of getting the length
	console.log("no_of_bits:",qtyBits((removed>>>0).toString(2)));
	qty_bits_lookup=Array(0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4);
	console.log("lookup len: ", qty_bits_lookup[removed]);
	len = moves[removed].toString().length;
	console.log("len:",len);

	random = Math.floor(Math.random() * len);
	result = 1 << random;
	//result = 1 << Math.floor(Math.random() * (x & ~ reverse).toString().length)
	console.log("RESULT:", result, moves[removed] & result, moves[removed].charAt(result-1), " FROM RAND " + random);

}

/*
 * Function wallColour
 * Meta: allows recolouring of the walls of the maze to a colour of your choosing
*/
function wallColour(col){

		mazeCells = document.getElementsByClassName("wallCell");
		wallCells = document.getElementsByClassName("mazeCell");
		for(var i = 0; i < mazeCells.length; i++) {
		    mazeCells[i].style.borderColor = col;
		}
		for (var i=0; i < wallCells.length; i++){
		    wallCells[i].style.borderColor = col;
		}
		document.getElementById("mazeinner").style.borderColor=col;
}

 /* FINAL SECTION 8? */

/* Temnporary function for debugging and adjusting mode timers
 * -  lots of console logs seems to slow things down, at least if the console is open so I can turn it on and off here
*/
function showmode(input){
	return;
	console.log(input);
}

/*
 * Section JSON Publish
 * Meta: Periodic publication of the game state in JSON format to the console.
 */

function publishGameState() {
	if (typeof sprite_pacman === 'undefined' || typeof sprites_ghosts === 'undefined') return;

	var gameState = {
		timestamp: new Date().toISOString(),
		game: {
			score: typeof score !== 'undefined' ? score : 0,
			lives: typeof lives !== 'undefined' ? lives : 0,
			level: parseInt(sessionStorage.level || 1),
			status: getGameStatus(),
			totalPills: typeof pillNumber !== 'undefined' ? pillNumber : 0,
			pillsEaten: typeof pilcount !== 'undefined' ? pilcount : 0,
			powerPillActive: typeof powerpilon !== 'undefined' ? powerpilon : false,
			powerPillTimer: typeof ppTimer !== 'undefined' ? ppTimer : 0
		},
		pacman: {
			x: sprite_pacman.posLeft,
			y: sprite_pacman.posTop,
			gridX: (sprite_pacman.posLeft - 35) / 30,
			gridY: (sprite_pacman.posTop - 25) / 30,
			direction: getDirectionName(sprite_pacman.direction)
		},
		ghosts: sprites_ghosts.map(function(ghost) {
			return {
				name: ghost.name,
				x: ghost.posLeft,
				y: ghost.posTop,
				gridX: (ghost.posLeft - 35) / 30,
				gridY: (ghost.posTop - 25) / 30,
				direction: getDirectionName(ghost.direction),
				status: getGhostStatus(ghost)
			};
		}),
		remainingPills: getRemainingPills(),
		walls: getWalls()
	};
	console.log("PACMAN_GAME_STATE:" + JSON.stringify(gameState));
}

function getDirectionName(dir) {
	switch(dir) {
		case 1: return "R";
		case 2: return "L";
		case 4: return "D";
		case 8: return "U";
		default: return "None";
	}
}

function getGhostStatus(ghost) {
	if (typeof ghost.alive !== 'undefined' && !ghost.alive) return "eyes";
	if (ghost.vulnerable) return "vulnerable";
	return "normal";
}

function getGameStatus() {
	if (typeof won !== 'undefined' && won) return "won";
	if (typeof lives !== 'undefined' && lives <= 0) return "game_over";
	if (typeof onPause !== 'undefined' && onPause) return "paused";
	return "playing";
}

function getRemainingPills() {
	var pills = [];
	var cells = document.querySelectorAll('[data-pills]');
	for (var i = 0; i < cells.length; i++) {
		var pType = parseInt(cells[i].getAttribute('data-pills'));
		if (pType > 0) {
			var idParts = cells[i].id.split('-');
 		if (idParts.length >= 3) {
 			var px = parseInt(idParts[1]);
 			var py = parseInt(idParts[2]);
 			pills.push({
 				x: px,
 				y: py,
 				gridX: (px - 35) / 30,
 				gridY: (py - 25) / 30,
 				type: pType === 2 ? "powerpill" : "pill"
 			});
 		}
		}
	}
	return pills;
}

function getWalls() {
	var walls = [];
	var wallElements = document.querySelectorAll('.wallCell');
	for (var i = 0; i < wallElements.length; i++) {
		var idParts = wallElements[i].id.split('-');
		if (idParts.length >= 3) {
			var px = parseInt(idParts[1]);
			var py = parseInt(idParts[2]);
			walls.push({
				x: px,
				y: py,
				gridX: (px - 35) / 30,
				gridY: (py - 25) / 30
			});
		}
	}
	return walls;
}

// Start periodic publication
setInterval(publishGameState, 1000);

