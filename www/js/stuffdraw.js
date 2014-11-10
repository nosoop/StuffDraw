/**
 * Handles canvas setup.  TODO implement event unhooking when not on turn
 */

// Mouse data in object notation.
var mouseSettings = {
	"MouseDown": false,
	"xPre": 0,
	"yPre": 0,
	"xCurrent": 0,
	"yCurrent": 0
};

// Canvas state.  Controls whether the canvas is enabled or not.
var canvasState = {
	"enabled": true
};

var draw_deltas = [];

// Get mouse position relative to a canvas.
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

var canvas = document.getElementById('drawCanvas');
var context = canvas.getContext('2d');

// Resize the canvas.
function resizeCanvas(width, height) {
	context.canvas.width = width;
	context.canvas.height = height;
}

function setState(enabled) {
	canvasState.enabled = enabled;
}

$(window).resize(function() {
	// #canvasbox is set to fill remaining screen height in game.html
	canvasResizeAndRedraw($("#canvasbox").width(), $("#canvasbox").height(), draw_deltas);
});

canvasResizeAndRedraw($("#canvasbox").width(), $("#canvasbox").height(), draw_deltas);


/**
 * Netplay
 */

var socket = io();
var uid;

// Received request to send room information.  Note that currently, the hash is used.
socket.on('room-request', function (data) {
	if(window.location.hash) {
		var hash = window.location.hash.substring(1);
		
		var room_join_data = new gamedata.RoomJoinData();
		
		room_join_data.uid = hash;
		socket.emit('room_join_data', room_join_data);
	}
});

// Received room information.
socket.on('room-init', function (room_init_data) {
	$("#room-title").text(room_init_data.title);
	uid = room_init_data.uid;
});

// Received draw data from server.
socket.on('game_draw_data', function (data) {
	canvasValidateDataAndDraw(data);

	// TODO worker
	if (uid == data.game) {
		draw_deltas.push(data);
	}
});


/**
 * Canvas functions
 */

$('#drawCanvas').mousemove( function (e) {
	var mousePos = getMousePos(canvas, e);
	mouseSettings.xPre = mouseSettings.xCurrent;
	mouseSettings.yPre = mouseSettings.yCurrent;
	mouseSettings.xCurrent = mousePos.x;
	mouseSettings.yCurrent = mousePos.y;
	
	// We are allowed to transmit our drawing actions
	if (mouseSettings.mouseDown && canvasState.enabled) {

		// Render on local canvas.
		context.beginPath();
		context.moveTo(mouseSettings.xPre, mouseSettings.yPre);
		context.lineTo(mousePos.x, mousePos.y);
		context.strokeStyle = '#000000';
		context.lineWidth = 3;
		context.stroke();
		context.closePath();

		// Prepare coordinates.
		var cFrom = toUnitSqCoords(mouseSettings.xPre, mouseSettings.yPre, $("#drawCanvas").width(), $("#drawCanvas").height());
		var cTo = toUnitSqCoords(mouseSettings.xCurrent, mouseSettings.yCurrent, $("#drawCanvas").width(), $("#drawCanvas").height());
		
		// Server forwards data to all other clients.
		var data = {
			xFrom: cFrom.x,
			yFrom: cFrom.y,
			xTo: cTo.x,
			yTo: cTo.y,
			color: '#000000',
			game: uid
		}
		socket.emit('game_draw_data', data);
		draw_deltas.push(data);
	}
});
$('#drawCanvas').mousedown( function (e) {
	if (e.which == 1) {
		mouseSettings.mouseDown = true;
	}
});
$('#drawCanvas').mouseup( function (e) {
	mouseSettings.mouseDown = false;
});
$('#drawCanvas').mouseout( function (e) {
	mouseSettings.mouseDown = false;
});


/**
 * Helper functions
 */

function canvasResizeAndRedraw(width, height, draw_commands) {
	context.canvas.width = width;
	context.canvas.height = height;
	
	// TODO optimize.  Draw into a back buffer of a large enough resolution and hw scale that?
	// TODO create buffer at 1.5x max(screen.width, screen.height)
	for (data of draw_commands) {
		canvasValidateDataAndDraw(data);
	}
}

/** 
 * Draws on a canvas from networked data, after validating that it is for that
 * game.
 */
function canvasValidateDataAndDraw(data) {
	if (uid == data.game) {
		// TODO do interpolation on line commands
		// TODO draw onto a texture offscreen and scale onto canvas?
		
		var cFrom = coordsFromUnitSq(data.xFrom, data.yFrom, $("#drawCanvas").width(), $("#drawCanvas").height());
		var cTo = coordsFromUnitSq(data.xTo, data.yTo, $("#drawCanvas").width(), $("#drawCanvas").height());
		
		context.beginPath();
		context.moveTo(cFrom.x, cFrom.y);
		context.lineTo(cTo.x, cTo.y);
		context.strokeStyle = data.color;
		context.lineWidth = 3;
		context.stroke();
		context.closePath();
	}
}


/**
 * For the purpose of fitting the drawing onto the client's canvas, we
 * translate the sender's drawing coordinates into a pair of coordinates
 * fitting into a unit square [-1.0, 1.0] bounded by the longest side to send
 * over the network.
 * 
 * The receiving client then gets the pair and converts them to a canvas square
 * with the smallest side.  This way, everything on the drawer's screen is
 * viewable on everyone else's screen, at the expense of not being able of
 * having a one-to-one translation between players.
 */

function coordsFromUnitSq(xi, yi, width, height) {
	var mid_of_min = Math.min(width, height) / 2;
	var result = {
		x: (width / 2) + (mid_of_min * xi),
		y: (height / 2) + (mid_of_min * yi)
	};
	return result;
}

function toUnitSqCoords(xi, yi, width, height) {
	var mid_of_max = Math.max(width, height) / 2;
	var result = {
		x: ((xi - (width / 2)) / mid_of_max).toFixed(6),
		y: ((yi - (height / 2)) / mid_of_max).toFixed(6)
	};
	return result;
}

// For collaborative "waiting for players" whiteboard
function toMappedUnitSqCoords(xi, yi, width, height) {
	var mid_of_min = Math.min(width, height) / 2;
	var result = {
		x: ((xi - (width / 2)) / mid_of_min).toFixed(6),
		y: ((yi - (height / 2)) / mid_of_min).toFixed(6)
	};
	return result
}