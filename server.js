#!/usr/bin/env node

var express = require('express')
    , app = express()
    , connect = require('express/node_modules/connect')
    , cookie = require('express/node_modules/cookie')
    , jade = require('jade')
    , stylus = require('stylus')
    , nib = require('nib')
    , http = require('http')
    , server = http.createServer(app)
    , sessionStore = new express.session.MemoryStore({ reapInterval: 60000 * 10 })
    , sessionSecret = "/SuperS3cr3t"
    , fs = require('fs');
//    , io = require('socket.io').listen(server);

server.listen(3000);

// Jade
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// Stylus
function compile(str, path) {
    return stylus(str)
            .set('filename', path)
            .use(nib());
}

app.use(stylus.middleware(
    { src: __dirname + '/public' , compile: compile}
));

// Static files
app.use(express.static(__dirname + '/public'));

// Route / as index
app.get('/', function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.render('index', {pageTitle: 'w.IDE'});
});

// Display response
app.use(express.logger('dev'))

app.configure(function() {
  // Allow parsing cookies from request headers
  this.use(express.cookieParser());
  // Session management
this.use(express.session({ "secret": sessionSecret, "store": sessionStore }));
});

/** WebSocket */
var sockets = require('socket.io').listen(server).of('/sock');
sockets.authorization(function (handshakeData, callback) {
  // Read cookies from handshake headers
  console.log(handshakeData.headers);
  if(!handshakeData.headers.cookie) {
    callback('No cookie', false);
    return;
  }
  var cookies = cookie.parse(handshakeData.headers.cookie);
  // We're now able to retrieve session ID
  var sessionID;
  if (cookies['connect.sid']) {
    sessionID = connect.utils.parseSignedCookie(cookies['connect.sid'], sessionSecret);
  }
  // No session? Refuse connection
  if (!sessionID) {
    callback('No session', false);
  } else {
    // Store session ID in handshake data, we'll use it later to associate
    // session with open sockets
    handshakeData.sessionID = sessionID;
    callback(null, true);
    // On récupère la session utilisateur, et on en extrait son username
    /*sessionStore.get(sessionID, function (err, session) {
      if (!err && session && session.username) {
        // On stocke ce username dans les données de l'authentification, pour réutilisation directe plus tard
        handshakeData.username = session.username;
        // OK, on accepte la connexion
        callback(null, true);
      } else {
        // Session incomplète, ou non trouvée
        callback(err || 'User not authenticated', false);
      }
    });*/
  }
});

var connections = {};
sockets.on('connection', function (socket) { // New client
  var sessionID = socket.handshake.sessionID; // Store session ID from handshake
  // this is required if we want to access this data when user leaves, as handshake is
  // not available in "disconnect" event.
  if ('undefined' == typeof connections[sessionID]) {
    connections[sessionID] = { "length": 0 };
  }
  // Add connection to pool
  connections[sessionID][socket.id] = socket;
  connections[sessionID].socket_id = socket.id
  connections[sessionID].length ++;
  // When user leaves
  socket.on('disconnect', function () {
    // Is this socket associated to user session ?
    var userConnections = connections[sessionID];
    if (userConnections.length && userConnections[socket.id]) {
      // Forget this socket
      userConnections.length --;
      delete userConnections[socket.id];
    }
  });
  // New message from client = "write" event
  socket.on('message', function (message) {
    console.log(sessionID+': '+message);

    var msg
    try {
        msg = JSON.parse(message);
    } catch(err) {
        console.log("Received a malformed JSON");
        return;
    } 

    if(msg.file == "jade") {
        var options = { pretty: true, locals: {} };
        jade.render(msg.value, options, function (err, html) {
            console.log(err);
            console.log(html);

            if(typeof html == "undefined") {
                socket.emit('refresh', JSON.stringify({ 
                    "err_jade": err.name+': '+err.message
                }));
            } else {
                connections[sessionID].html_src = msg.value;
                connections[sessionID].html = html;
                socket.emit('refresh', JSON.stringify({ 
                    "ok_jade": true
                }));
            }
        });
    }
    if(msg.file == "stylus") {
        console.log("stylus");
        //console.log(stylus(msg.value).use(nib()));
        var options = { };
        stylus(msg.value, options).use(nib()).render(function(err, css){
            if(typeof css == "undefined") {
                socket.emit('refresh', JSON.stringify({ 
                    "err_stylus": err.name+': '+err.message
                }));
            } else {
                connections[sessionID].css_src = msg.value;
                connections[sessionID].css = css;
                socket.emit('refresh', JSON.stringify({ 
                    "ok_stylus": true
                }));
            }
        });
    }

    if(msg.file == "js") {
        console.log("js");
        connections[sessionID].js = msg.value;
    }

    if(typeof connections[sessionID].html != "undefined") {
        var css = "<style type=\"text/css\">" + connections[sessionID].css + "</style>";
        var js = "<script type=\"text/javascript\">" + connections[sessionID].js + "</script>";

        var cssToken = "<link href=\"style.css\">";
        var jsToken = "<script src=\"main.js\"></script>";
        socket.emit('refresh', JSON.stringify({ 
            "html": connections[sessionID].html.replace(cssToken, css).replace(jsToken, js)
        }));
        

        var jsonString = JSON.stringify({
                            sessionID: sessionID,
                            html_src: connections[sessionID].html_src,
                            html: connections[sessionID].html,
                            css_src: connections[sessionID].css_src,
                            css: connections[sessionID].css,
                            js: connections[sessionID].js,
                        });
        fs.writeFile("./files/"+connections[sessionID].socket_id, jsonString, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log(sessionID+": The session was saved to disk!");
            }
        });

    }

 

  });
});


