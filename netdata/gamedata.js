/**
 * Node / Browser game data.
 */

(function(exports){

	/**
	 * Room initialization.
	 */
	var room_init_data = function() {};
	room_init_data.prototype = {
		title: null,
		uid: null,
		maxplayers: 6
	};
	exports.RoomInitData = room_init_data;

	/**
	 * Room join
	 */
	var room_join_data = function() {};
	room_join_data.prototype = {
		uid: null
	};
	exports.RoomJoinData = room_join_data;

	/**
	 * 
	 */
	var game_draw_data = function() {};
	game_draw_data.prototype = {
		xFrom: 0,
		yFrom: 0,
		xTo: 0,
		yTo: 0,
		color: '#000000',
		game: ''
	}
	exports.GameDrawData = game_draw_data;



})(typeof exports === 'undefined'? this['gamedata']={}: exports);