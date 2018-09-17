var cnvas;
var mc;
var initialized = false;
var fullscreen = false;
var fakeLandscape = false;
var originalPortraitMode = null;

function SendPosition(x,y){
	var dataPtr = gameInstance.Module._malloc(8);
	gameInstance.Module.setValue(dataPtr,x,'float');
	gameInstance.Module.setValue(dataPtr+4,y,'float');
	c_position(dataPtr);
	gameInstance.Module._free(dataPtr);
}

function SendStartPan(x, y, z, w) {
    var dataPtr = gameInstance.Module._malloc(16);
    gameInstance.Module.setValue(dataPtr, x, 'float');
    gameInstance.Module.setValue(dataPtr + 4, y, 'float');
	gameInstance.Module.setValue(dataPtr + 8, z, 'float');
	gameInstance.Module.setValue(dataPtr + 12, w, 'float');
    c_startpan(dataPtr);
    gameInstance.Module._free(dataPtr);
}

function SendPan(x, y, z, w) {
	var dataPtr = gameInstance.Module._malloc(16);
	gameInstance.Module.setValue(dataPtr, x, 'float');
	gameInstance.Module.setValue(dataPtr + 4, y, 'float');
	gameInstance.Module.setValue(dataPtr + 8, z, 'float');
	gameInstance.Module.setValue(dataPtr + 12, w, 'float');
	c_pan(dataPtr);
	gameInstance.Module._free(dataPtr);
}

function SendEndPan(x, y, z, w) {
    var dataPtr = gameInstance.Module._malloc(16);
    gameInstance.Module.setValue(dataPtr, x, 'float');
    gameInstance.Module.setValue(dataPtr + 4, y, 'float');
	gameInstance.Module.setValue(dataPtr + 8, z, 'float');
	gameInstance.Module.setValue(dataPtr + 12, w, 'float');
    c_endpan(dataPtr);
    gameInstance.Module._free(dataPtr);
}

function SendPinchRotate(x,y){
	var dataPtr = gameInstance.Module._malloc(8);
	gameInstance.Module.setValue(dataPtr,x,'float');
	gameInstance.Module.setValue(dataPtr+4,y,'float');
	c_pinchrotate(dataPtr);
	gameInstance.Module._free(dataPtr);
}

gameInstance.Module.onRuntimeInitialized = function() 
{	

	initialized = true;
	
	//TODO: Send UnityLoader.SystemInfo to Unity via a Json object if necessary
	
	c_setfullscreenstate = gameInstance.Module.cwrap('call_cb_changedfullscreenstate',null,['number']);

	c_orientationchange = gameInstance.Module.cwrap('call_cb_orientationchange',null,[]);
	
	c_mobiledevice = gameInstance.Module.cwrap('call_cb_mobiledevice',null,[]);

	c_anyinput = gameInstance.Module.cwrap('call_cb_anyinput',null,['number']);
	c_toggledebugmode = gameInstance.Module.cwrap('call_cb_toggledebugmode',null,[]);

	c_position = gameInstance.Module.cwrap('call_cb_position',null,['number']);
	c_singletap = gameInstance.Module.cwrap('call_cb_singletap',null,[]);
	c_doubletap = gameInstance.Module.cwrap('call_cb_doubletap',null,[]);
	c_longtap = gameInstance.Module.cwrap('call_cb_longtap',null,[]);

	c_startpan = gameInstance.Module.cwrap('call_cb_startpan', null, ['number']);
	c_pan = gameInstance.Module.cwrap('call_cb_pan',null,['number']);
	c_endpan = gameInstance.Module.cwrap('call_cb_endpan', null, ['number']);

	c_pinchrotate = gameInstance.Module.cwrap('call_cb_pinchrotate',null,['number']);

	c_startpinchrotate = gameInstance.Module.cwrap('call_cb_startpinchrotate', null, ['number']);	
	
	// New gesture recognizer
	mc = new Hammer.Manager(cnvas);

	//Pan recognizer
	mc.add( new Hammer.Pan() );
	mc.get('pan').set({ direction: Hammer.DIRECTION_ALL });

	//Rotate recognizer
	mc.add( new Hammer.Rotate() );

	//Pinch recognizer
	mc.add( new Hammer.Pinch() );

	// Double tap recogniser
	mc.add( new Hammer.Tap({ event: 'doubletap', taps: 2 , posThreshold: 45 }) );
	// Single tap recognizer
	mc.add( new Hammer.Tap({ event: 'singletap' }) );
	// Long tap recognizer
	mc.add( new Hammer.Press() );

	// Debug long tap recognizer
	mc.add( new Hammer.Press({ event: 'debugpress', threshold: 45 , time: 6000}) );

	// we want to recognize this simulatenous, so a quadrupletap will be detected even while a tap has been recognized.
	mc.get('doubletap').recognizeWith('singletap');
	// we only want to trigger a tap when we haven't detected a doubletap
	mc.get('singletap').requireFailure('doubletap');

	// we want to detect both the same time
	mc.get('pinch').recognizeWith('rotate');

	mc.on("hammer.input", function(ev) {
		if(ev.eventType == 1)
		{
			setFullscreenIfMobile();
		}

		var pos = ValidatePosition(ev.center)
		SendPosition(pos[0],pos[1]);
		c_anyinput(ev.eventType); //Event type is simple the down, up, move... state of the Hammer messaging system
	});	
	

	mc.on("singletap", function(ev) {
		var pos = ValidatePosition(ev.center)
		SendPosition(pos[0],pos[1]);
		c_singletap();
	});

	mc.on("doubletap", function(ev) {
		var pos = ValidatePosition(ev.center)
		SendPosition(pos[0],pos[1]);
		c_doubletap();
	});

	mc.on("press", function(ev) {
		var pos = ValidatePosition(ev.center)
		SendPosition(pos[0],pos[1]);
		c_longtap();
	});

	mc.on("debugpress", function(ev) {
		c_toggledebugmode();
	});

	mc.on("pinchstart rotatestart", function (ev) {
		c_startpinchrotate(ev.rotation);
	});

	mc.on("panstart", function (ev) {
		var pos = ValidatePosition(ev.center)
		var del = ValidateDelta(ev.deltaX, ev.deltaY)
		SendStartPan(del[0], -del[1], pos[0], pos[1]);
	});

	mc.on("panmove", function(ev) {
		var pos = ValidatePosition(ev.center)
		var del = ValidateDelta(ev.deltaX, ev.deltaY)
		SendPan(del[0], -del[1], pos[0], pos[1]);
	});

	mc.on("panend", function (ev) {
		var pos = ValidatePosition(ev.center)
		var del = ValidateDelta(ev.deltaX, ev.deltaY)
		SendEndPan(del[0], -del[1], pos[0], pos[1]);
	});

	mc.on("pinchmove rotatemove", function(ev) {
		SendPinchRotate(ev.scale, ev.rotation);
	});
	
};

window.onload = function() {
//touchDiv = createTouchDiv("touchDiv");

cnvas = document.getElementById("gameContainer");
cnvasParent = document.getElementById("canvasParent");

//fitCanvasToScreen();
}

function setFullscreenIfMobile(){
	
	//Send mobile info to Unity
	if(UnityLoader.SystemInfo.mobile)
	{
		c_mobiledevice();

		//Set fullscreen
		if(!fullscreen)
		{
			gameInstance.Module.SetFullscreen(1);
		}
	}
	
}

function fitCanvasToScreen(){
	
	if(cnvas.clientWidth > window.outerWidth)
	{
		var ratio = cnvas.clientHeight/cnvas.clientWidth;
		cnvas.style.width = window.innerWidth+'px';
		var parsedWidth = parseInt(cnvas.style.width, 10)
		cnvas.style.height = (parsedWidth * ratio)+'px';
	}
}

	
//TODO: Input and output the Hammer.js center object instead	
function ValidatePosition(center)
{		
	//Iframe based touch correction
	if(fullscreen)
	{
		canvasX = center.x;
		canvasY = window.innerHeight - center.y;
	}
	else
	{
		//canvasX = center.x - window.offsetLeft + (window.innerWidth/2);
		canvasX = center.x;
		//canvasY = (window.innerHeight - (center.y - window.offsetTop))-window.scrollY;
		canvasY = (window.innerHeight - center.y) - 16; //- window.frameElement.offsetTop
	}
	
	return [canvasX,canvasY];
}

function ValidateDelta(x,y)
{
	if (fakeLandscape)
	{
		return [y, -x];
	}
	else
	{
		return [x, y];
	}
}

window.addEventListener('resize', resizeInit);

function resizeInit()
{	
	if(!fullscreen)
	{
		screen.orientation.unlock();
	}
	
	if (initialized)
	{
		setTimeout(resize,999); 
	}
}
function resize()
{	
	//Iframe based equivalence
	fullscreen = (window.innerHeight == window.outerHeight);


	if(fullscreen && UnityLoader.SystemInfo.mobile && UnityLoader.SystemInfo.os != "iOS")
	{		
		screen.orientation.lock('landscape');
	}
	
	c_setfullscreenstate(fullscreen);
	SendPosition(0,0); //TODO: Clean up redundant legacy fullscreen code and send dedicated IO
	c_anyinput(1);
}

//This is an alternative touch surface that can be used for debugging fake fullscreen mode
function createTouchDiv(idName)
{
	var div = document.createElement('div');
	document.body.appendChild(div);
	div.id = idName;
	div.style.position = 'fixed';
	div.style.border = '0px';
	div.style.margin = 'auto';
	div.style.padding = '0px';
	//div.style.backgroundColor = 'rgba(256,0,0,0.2)'; //Debug

	div.style.width = window.innerWidth +'px';
	div.style.height = window.innerHeight +'px';

	div.style.top = '0px';
	div.style.left = '0px';
	div.style.zIndex = '-5'; 

	
	div.style.marginTop = '0px';
	div.style.marginLeft = '0px';
	return div;
}

//This is an unfinished fake fullscreen function for iOS. It's ugly and very much WIP.
function RotateDiv(rotatable)
{
	if(fakeLandscape)
	{
		div.style.zIndex = '5'; 
		
		rotatable.style.width = window.innerHeight +'px';
		rotatable.style.height = window.innerWidth +'px';
		  	  
		rotatable.style.top = 50+'%';
		rotatable.style.left = 50+'%';
	
		rotatable.style.marginTop = -(window.innerWidth/2)+'px';
		rotatable.style.marginLeft = -(window.innerHeight/2)+'px';
				
		rotatable.style.transform = 'rotate(90deg)';
	}
	else
	{
		div.style.zIndex = '5'; 
		
		rotatable.style.width = window.innerWidth +'px';
		rotatable.style.height = window.innerHeight +'px';

		rotatable.style.top = 50+'%';
		rotatable.style.left = 50+'%';
	
		rotatable.style.marginTop = -(window.innerHeight/2)+'px';
		rotatable.style.marginLeft = -(window.innerWidth/2)+'px';
		
		rotatable.style.transform = 'rotate(0deg)';
	}
		cnvas.style.width = '100%';
		cnvas.style.height = '100%';

		touchDiv.style.width = window.innerWidth +'px';
		touchDiv.style.height = window.innerHeight +'px';
}

//This is an unfinished fake fullscreen function for iOS. It's ugly and very much WIP.
function CheckIfPortraitMode()
{
	if(initialized)
	{
		if(UnityLoader.SystemInfo.os == "iOS")
		{
			c_orientationchange();
		}
		else
		{
			c_anyinput();	
		}
	}
	if(UnityLoader.SystemInfo.os == "iOS")
	{
		if(window.innerWidth > window.innerHeight)
		{
			fakeLandscape =  false;
		}
		else
		{
			fakeLandscape = true;
		}
	}
}
	

