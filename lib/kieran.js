// lib/kieran.js - torpedo-extension's module
// author: Kieran Jones

/*
SOCKET USAGE INSTRUCTIONS

New socket
-----------

url = 'http://localhost:1337'; //Domain of server
onRead = function(data){};     //This is the default function called
							//each time data is sent to the server
							//data si what ever was sent, text, object, int, etc..

onClose = function(socket){};  //this function is called when the socket closes
								//due to the server decline the connection
								// or the user closing it

callBack = function(result){}; // This function is called when the
								//connection is made or fails
								//result['code'] == 0 == succesfull
								//result['code'] == -1 == connection error
								
var socket = new io(url, onRead, onClose).connect(callBack);

socket.write(obj); //send data the server
					//obj can be anything, int, string, etc, but json is recommeded

socket.setOnRead(function(data){}) //change the function called when data
									//is received from the server

*/
const EXPORTED_SYMBOLS = ["io"];


io.lawl="lawl";

function io(server, read, onClose){
    this.xhr = require("request");
    this.server = server;
    this.writeBuffer = [];
	this.writeXHR = null;
    this.readFunction =  read || function(){};
    this.onClose =  onClose || function(){};
	this.readPoll = null;
	this.running == true;
}

io.prototype.setOnRead = function(func){
	this.readFunction = func;
}

io.prototype.close = function(){
	this.running = false;
    this.onClose();
}


io.prototype.write = function(data){
    socketLogger('Writing to send buffer');
	this.writeBuffer.push(data);
	this.sendWriteData();
}

io.prototype.sendWriteData = function(){

	if(this.running == false)
		return

    var me = this;
	if(this.writeXHR != null || this.writeBuffer.length == 0){
        socketLogger('No data to write');
		return;
	}else{
        socketLogger('Writing data to server');
		this.xhr.Request({
			url:this.server + "/io/write",
			content:{
				sessionId: this.sessionId,
				data: JSON.stringify(this.writeBuffer)
			},
			onComplete: function(response){
                me.sendWriteData();
				socketLogger('Data has been sent!');
			}
		}).post(); 
        this.writeBuffer = [];
	}
}

io.prototype.connect = function(callBack){
	socketLogger('connectiing...');
	callBack = callBack || function(){};
	var me = this;
	this.xhr.Request({
		url: this.server + "/io/handshake",
		onComplete: function(response){
        socketLogger('decoding');
			if(response.json == null){
				callBack({'code':'-1', 'message': 'Error'})
			}else{
				me.sessionId = response.json['sessionId'];
				me.startPolling();
                socketLogger('Connect to server');
				callBack({'code':'0', 'message': 'Success'})
			}
		}
	}).get();
    
    return this;
}

io.prototype.startPolling = function(){
	if(this.readPoll != null)	
		return;
    socketLogger('Polling enabled');
	this.makePoll();
}

io.prototype.makePoll = function(){

	if(this.running == false)
		return

    socketLogger('Openning long poll');
	var me = this;
	this.xhr.Request({
		url:this.server + "/io/read",
		content:{
			sessionId: this.sessionId
		},
		onComplete: function(response){
        socketLogger(JSON.stringify(response));
            
            if(response.json == null){
                return;
                socketLogger('Message body blank');
            }
            
            if(response.json['error'] == -2){
                me.close();
                socketLogger('Key not recognised');
            }
            
			for(var i in response.json['data']){
                socketLogger('Reading data from response.json');
				me.readFunction(response.json['data'][i]);
			}
			me.makePoll();
		}
	}).post();
}

socketLogger = function(text){
	//return;
	console.log(text);
}

exports.socketLogger = socketLogger;
exports.socket=io;