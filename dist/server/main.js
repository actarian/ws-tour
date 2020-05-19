/**
 * @license ws-tour v1.0.0
 * (c) 2020 Luca Zampetti <lzampetti@gmail.com>
 * License: MIT
 */

'use strict';

var environment = {
  appKey: '8b0cae93d47a44e48e97e7fd0404be4e',
  appCertificate: '',
  channelName: 'WsTour',
  port: 5000,
  apiEnabled: false,
  paths: {
    models: 'models/',
    textures: 'textures/'
  }
};

var express = require('express');

var https = require('https');

var fs = require('fs');

var bodyParser = require('body-parser');

var path = require('path');

var _require = require('agora-access-token'),
    RtcTokenBuilder = _require.RtcTokenBuilder,
    RtmTokenBuilder = _require.RtmTokenBuilder,
    RtcRole = _require.RtcRole,
    RtmRole = _require.RtmRole;
var PORT = process.env.PORT || environment.port;
console.log(environment);
var app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, '../../docs/')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(bodyParser.raw()); // app.use(express.favicon());

/*
app.get('/', function(request, response) {
	response.send('Hello World!');
});
*/

/*
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (request, response) => response.render('pages/index'));
*/
// app.set('view engine', 'handlebars');

app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, '../../docs/index.html')); // response.render('docs/index');
});
app.post('/api/token/rtc', function (request, response) {
  var payload = request.body || {};
  var duration = 3600;
  var timestamp = Math.floor(Date.now() / 1000);
  var expirationTime = timestamp + duration;
  var uid = payload.uid ? String(payload.uid) : timestamp.toString();
  var role = RtcRole.PUBLISHER;
  var token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
  response.send(JSON.stringify({
    token: token
  }));
});
app.post('/api/token/rtm', function (request, response) {
  var payload = request.body || {};
  var duration = 3600;
  var timestamp = Math.floor(Date.now() / 1000);
  var expirationTime = timestamp + duration;
  var uid = payload.uid ? String(payload.uid) : timestamp.toString();
  var role = RtmRole.PUBLISHER;
  var token = RtmTokenBuilder.buildToken(environment.appKey, environment.appCertificate, uid, role, expirationTime);
  response.send(JSON.stringify({
    token: token
  }));
});
/*
app.listen(PORT, () => {
	console.log(`Listening on ${ PORT }`);
});
*/

https.createServer({
  key: fs.readFileSync(path.join(__dirname, '../../certs/client-key.pem'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, '../../certs/client-cert.pem'), 'utf8')
}, app).listen(PORT, function () {
  console.log("Example app listening on port " + PORT + "! Go to https://192.168.1.2:" + PORT + "/");
}); // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.
// Build token with uid
// const token = RtcTokenBuilder.buildTokenWithUid(environment.appKey, environment.appCertificate, environment.channelName, uid, role, expirationTime);
// Build token with user account
// const token = RtcTokenBuilder.buildTokenWithAccount(environment.appKey, environment.appCertificate, environment.channelName, account, role, expirationTime);
//# sourceMappingURL=main.js.map
