function set(coords){
	coords=set.arguments[0].split(",");
	k=0
	
	for (i=0;i<coords.length;i++){
		key = 25 + k;
		string="this.left" + key + "='" + coords[i] + "'";
		console.log(string);
		eval ("this.left" + key + "='" + coords[i] + "'")
		k+=10;
	}
	/*
	for (i=25;i<coords.length-100;i=(i+10)){
		console.log("Doing" + coords[k]);
		//eval ("this.left" + i + "='" + coords[k] + "'")
		k++;
	}
	*/
}

var mazedata = new Array()

var maze = Array(
	2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,
	1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,
	1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,
	1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1,
	1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,
	0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,0,
	1,1,1,1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,1,
	0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,
	1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
	1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1,
	1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,
	0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,1,0,0,
	1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,
	1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1,
	2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2)		
;

/*
var maze = "1111111111111111111
	1000100010100010001
	1111111110111111111
	1000101000001010001
	1111101111111011111
	0000101000001010000
	1111111000001111111
	0000101000001010000
	1111111111111111111
	1000100010100010001
	1110111111111110111
	0010101000001010100
	1111101110111011111
	1000000000100000001
	1111111111111111111";
);
*/


var interim = Array();

// convert 1d array to a 2d array
function convert(maze){
	maze = maze.join("");
	x=0;
	y=0;
	//console.log(maze);
	for (i=0;i<maze.length;i++){
		character = maze.charAt(i);
		if (i==19 || x==19){
			x = 0;
			//console.log("x is now " + x + " at " + i);
			y++;
		}
		if (x==19) {
			y++;
			//console.log("y is now " + y + " - xz is " + x);
			x=0;
		}
		if (typeof (interim[y]) != "object"){
			interim[y]=Array();
		}
		interim[y][x]=character;
		//console.log(typeof(interim[y]) + " Y: " + interim[y] + " == " + "x is " + x + " and y is " + y + " ======" + interim[y][x]);
		x++;
	}
}

convert(maze);
console.log("I 1 0 ", interim[1][0]);

var data = Array();
function renderGrid2(){
	//console.log("rendering!");
	var x=0;
	v_Offset=25; // start 25px down
	innerStr="";
	for (i=0;i<interim.length;i++){
		//console.log("and were off - on loop of i " + i);
		var lineMoves = Array();
		h_Offset=35; // start a new line 35px in
		data[v_Offset] = Array();
		for (x=0;x<19;x++){
		
			bit = interim[i][x];
			var movestring=""; // empty var to take the possible directions
			// populate movestring by scanning the binary array left, right, up and down for more 1's
			if (interim[i-1] && interim[i-1][x] != "0"){
				 movestring="U" } else { movestring="X";}

			if (interim[i+1] && interim[i+1][x] != "0"){
				 movestring += "D" } else { movestring += "X";}

			if (interim[i][x-1] && interim[i][x-1] != "0"){
				 movestring += "L" } else { movestring += "X";}

			if (interim[i][x+1] && interim[i][x+1] != "0"){
				 movestring += "R" } else { movestring += "X";}

			movestring += bit;

			//console.log(movestring);
			lineMoves.push(movestring); // ADD to an array of the whole line

			styles=movestring.substring(0,4); // we add the 4 move positions to a css class in order to draw the correct borders for the maze

			// print the pill if it's a cell with 1 in the binary maze
			if (bit==1){
				cellInnerHTML="<img src='graphics/pil.gif' name='pil_" + h_Offset + v_Offset + "'>";
			} else if (bit==2){
				cellInnerHTML="<div id='p" + v_Offset + h_Offset + "' ><img src='graphics/powerpil.gif' name='pil_" + h_Offset + v_Offset + "'>" + y + "</div>";
			}

			// add further css for creating the left and right walls on the next row down using css before and after selectors
			if (y<14){
				if (movestring.charAt(3)=="R"){
					styles +=" blockLowerRight";
				}
				if (movestring.charAt(2)=="L"){
					styles += " blockLowerLeft";
				}
			}

			// if it's a 1 in the binary array, add the html to a string
			if (bit==1 || bit==2){
				str='<div id="cell-' + h_Offset + '-' + v_Offset + '" style="position:absolute; top:' + v_Offset + 'px; left:' + h_Offset + 'px;" class="mazeCell ' + styles + '">' + cellInnerHTML + '</div>';
				innerStr += str;
				data[v_Offset][h_Offset] = movestring; 

				// if you can go right , populate the next two elements in the full array with left and right options. These are spaces pacman takes up between the main cells. Cells are 30x30 and pacman moves in 10px increments.
				if (movestring.charAt(3)=="R"){
					data[v_Offset][h_Offset+10] = "XXLR";
					data[v_Offset][h_Offset+20] = "XXLR";
				}
				// and the same for down
				if (movestring.charAt(1)=="D"){
					if (typeof(data[v_Offset+10]) != "object"){
						data[v_Offset+10] = Array();
					}
					if (typeof(data[v_Offset+20]) != "object"){
						data[v_Offset+20] = Array();
					}
					
					data[v_Offset+10][h_Offset] = "UDXX";
					data[v_Offset+20][h_Offset] = "UDXX";
					
				}

			} else {
				data[v_Offset][h_Offset] = "0"; 
				data[v_Offset][h_Offset+10] = "0";
				data[v_Offset][h_Offset+20] = "0";
			}


			h_Offset = h_Offset + 30;

		}
		// have all the innards in lineMoves
		//mazedata[v_Offset] = new set(lineMoves.join(","))
		console.log("Linemoves: " + lineMoves);
		v_Offset = v_Offset + 30; 
	}
	console.log(innerStr);
	console.log(data);
	document.getElementById('mazeinner').innerHTML=innerStr;
	var mazedata = data;
	return data;
}
