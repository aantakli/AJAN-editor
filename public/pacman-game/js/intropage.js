function kd(e){
	if (document.all && !document.getElementById){key = window.event.keyCode}
	if (document.getElementById){ key = e.keyCode}
	if (key=="90" || key=="122"){
		location='pacman.html'
	}
	if (key=="88" || key=="120"){
		location="settings.html";
	}
}

function init(){
	ns=(navigator.appName.indexOf('Netscape')>=0)? true:false
	if (ns) {
		document.captureEvents(Event.KEYDOWN);
		document.onkeydown=kdns
		document.maintext.visibility='show'; document.loading.visibility='hide'
	} else {
	document.all.maintext.style.visibility='visible'; document.all.loading.style.visibility='hidden'
	}
}

function kdns(evt){
	key=evt.which
	if (key=="90" || key=="122") {
		location='pacman.html'
	}
	if (key=="89" || key=="121") {
		location='pacman_1_fast.html'
	}
	if (key=="88" || key=="120"){
		location="settings.html";
	}
}
