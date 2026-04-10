
// further fx to come - send all ghosts to home, blow them all up, send pacman to co-ords or to a powerpill 

/* Quick Spin */
function effect_quick_spin(){
	movespeed = speed-20;
	ghostspeed = speed-20;
	effect_mushrooms=1;
	effectTimer=60;
	invincibility=1;
	document.getElementById("pacman-top").style.background="orange";
	document.getElementById("pacman-bottom").style.background="orange";
	wallColour("#6600ff");
	//eval ("document.getElementById('pacman').classList.add('spin')"); 
	eval ("document.getElementById('maze').classList.add('spin')"); 
	for (i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.add('spin')"); 
	}
}

function effect_quick_spin_warn(){
	eval ("document.getElementById('maze').classList.remove('spin')"); 
	eval ("document.getElementById('maze').classList.add('spin')"); 
}

function effect_quick_spin_end(){
	effect_mushrooms=0;
	wallColour("#3300ff");
	eval ("document.getElementById('pacman').classList.remove('spin')"); 
	eval ("document.getElementById('maze').classList.remove('spin')"); 
	for(i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.remove('spin')"); 
	}
	movespeed=speed;
	ghostspeed=speed;
	invincibility=0;
	document.getElementById("pacman-top").style.background="yellow";
	document.getElementById("pacman-bottom").style.background="yellow";
}

/* Long spin */

function effect_long_spin(){
	movespeed = speed-20;
	ghostspeed = speed-20;
	effect_mushrooms=1;
	effectTimer=150;
	invincibility=1;
	document.getElementById("pacman-top").style.background="orange";
	document.getElementById("pacman-bottom").style.background="orange";
	wallColour("#6600ff");
	eval ("document.getElementById('pacman').classList.add('spin')"); 
	eval ("document.getElementById('maze').classList.add('longspin')"); 
	for (i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.add('spin')"); 
	}
}

function effect_long_spin_warn(){
	eval ("document.getElementById('maze').classList.remove('longspin')"); 
	eval ("document.getElementById('maze').classList.add('spin')"); 
}

function effect_long_spin_end(){
	effect_mushrooms=0;
	wallColour("#3300ff");
	eval ("document.getElementById('pacman').classList.remove('spin')"); 
	eval ("document.getElementById('maze').classList.remove('spin')"); 
	for(i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.remove('spin')"); 
	}
	movespeed=speed;
	ghostspeed=speed;
	invincibility=0;
	document.getElementById("pacman-top").style.background="yellow";
	document.getElementById("pacman-bottom").style.background="yellow";
}

function effect_mushrooms(){
	movespeed = speed-20;
	ghostspeed = speed-20;
	effect_mushrooms=1;
	effectTimer=250;
	invincibility=1;
	document.getElementById("pacman-top").style.background="orange";
	document.getElementById("pacman-bottom").style.background="orange";
	wallColour("#6600ff");
	eval ("document.getElementById('pacman').classList.add('spin')"); 
	eval ("document.getElementById('maze').classList.add('spin')"); 
	for (i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.add('fastspin')"); 
	}
}

function effect_mushrooms_warn(){
	eval ("document.getElementById('maze').classList.remove('spin')"); 
	eval ("document.getElementById('maze').classList.add('spin')"); 
	eval ("document.getElementById('pacman').classList.remove('spin')"); 
	for(i=0;i<total_ghosts;i++){
		eval ("document.getElementById('ghost" + i + "').classList.remove('fastspin')"); 
	}
	movespeed=speed;
	ghostspeed=speed;
}

function effect_mushrooms_end(){
	effect_mushrooms=0;
	wallColour("#3300ff");
	eval ("document.getElementById('pacman').classList.remove('spin')"); 
	eval ("document.getElementById('maze').classList.remove('spin')"); 
	invincibility=0;
	document.getElementById("pacman-top").style.background="yellow";
	document.getElementById("pacman-bottom").style.background="yellow";
}
