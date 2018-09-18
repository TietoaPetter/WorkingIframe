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
	
cnvas = document.getElementById("gameContainer");
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
		canvasX = center.x;
		canvasY = (cnvas.clientHeight - center.y); 
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
	

