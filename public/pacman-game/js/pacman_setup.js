/*
 * File: pacman_setup.js
 * Version: 2.0 beta 2
 *
 * Meta: load the required maze and the main javascript library and start the game.
 */


/* Function: setup
 * Meta: This is the entry point which loads the data and files and starts off the game
 */
function setup(){
	var level = (sessionStorage.level) ? sessionStorage.level : 1;
	mazeDataFile = "js/data/mazedata" + level + ".js";
	loadScriptAndCallback(mazeDataFile,loadLevelOptions);
}

var levelOptions; // this is an optional object of options found in the js for each maze, allowing to specify optional override variables including where pacman and the ghosts start off

/* Generic function to load a script and execute a callback when complete */
function loadScriptAndCallback(url, callback){
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.  There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}

/* Sequence of events to load and start the game:
   1. At the bottom of this file, the loadScriptAndCallback function is called directly as part of this page, with the data for the first level passed in, and the callback function loadLevelOptions.
   2. loadLevelOptions will load any extra options for the level which were in the file of data for the first maze, then loads the script for maze.js (renders maze from the data), and the callback is loadMainScript.
   3. loadMainScript loads pacman.js which is the game code. The callback startLevel is then called.
   4. startLevel calls init() from the main script to set up the level, which returns the sprites var, and finally the game starts with the call to startGame(sprites)
*/

/* Callback 1 : loadLevelOptions */
var loadLevelOptions = function (){
	if (levelOptions){
		if (levelOptions.pacStartTop){
			pacStartTop = levelOptions.pacStartTop;
		}
	}
	loadScriptAndCallback("js/maze.js",loadMainScript);
}

/* Callback 2 : loadMainScript */
var loadMainScript = function(){
	mazedata=renderGrid();
	loadScriptAndCallback("js/pacman.js",startLevel);
}

/* Callback 3 : startLevel */
var startLevel = function(){
	sprites = init(); // calls init function in the game logic script pacman.js
	startGame(sprites); // - off we go!
}

