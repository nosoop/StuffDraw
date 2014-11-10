/**
 * Core server script.
 */

var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var http = require('http').Server(app);
var session = require('cookie-session')
var io = require('socket.io')(http);

var fs = require('fs');

var config = JSON.parse(fs.readFileSync("./stuffdraw.config.json", "utf8"));

var gamedata = require('./netdata/gamedata.js');

var bodyparser = require('body-parser');
app.use(bodyparser.urlencoded( { extended: true } ));

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('');

app.use(cookieParser(config.session));
app.use(session(config.session));

var game_channels = { };

var url = require('url');

var alphaNumeric = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

app.post('/generate', function(req, res) {
	// prepare room here
	var uid = randomString(8, alphaNumeric);
	
	db.run('INSERT INTO rooms VALUES ($uid, $title)', uid, req.body['room-name'], function (err) {
		res.redirect('/game#' + uid);
	});
});

// Create random game.
app.get('/game', function (req, res) {
	res.sendFile(__dirname + '/www/game.html');
});


app.use('/netdata', express.static(__dirname + '/netdata'));

app.use(express.static(__dirname + '/www'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/www/index.html');
});

/**
 * Game sockets.
 */
io.on('connection', function(socket){
	console.log('user joined');
	
	// Perform acknowledgement of client connection.
	socket.emit('room-request', { } );
	
	// On received data that client wants to join 
	socket.on('room_join_data', function (data) {
		// Get requested room with settings from database.
		console.log('player joining room ' + data.uid);
		
		// Get game by uid.
		db.get("SELECT uid, title FROM rooms WHERE uid = ?", data.uid, function (err, row) {
			// TODO if undefined redirect to index
			room_init_data = new gamedata.RoomInitData();
			room_init_data.title = row.title;
			room_init_data.uid = row.uid;
			
			socket.emit('room-init', room_init_data);
			socket.join(row.uid);
		});
	});
	
	// Broadcast game data to specified game -- they will do the validation themselves.
	socket.on('game_draw_data', function (data) {
		socket.broadcast.to(data.game).emit('game_draw_data', data);
		
		// TODO render and store a copy for fun?
	});

	socket.on('disconnect', function(){
		console.log('user left');
	});
});

db.serialize(function() {
	db.run("CREATE TABLE rooms (uid TEXT, title TEXT)");

	// db.run("CREATE TABLE rounds (uid TEXT, word TEXT)");
	// once successful, word selection is handled server-side
	// TODO create wordlist storage
});


http.listen(8080, function() {
	console.log('Started service on *:8080');
});
