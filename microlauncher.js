/** 
# microlauncher.js

Node.js Module for lauching microservices.
Applicable for application where "main application" should launch
and control (later shutdown of) these sub-microservices.
Microservices should (at this time):
- reside on the same server host as "main app"
- be launchable as standalone excutable presenting separate process)

## Benefits of microlauncher and microservices in general

- Separate process with potential to run on a separate CPU core
- Separated logging (esp. applicable to PM2)
- Automatic control of startup and stopping of sub-microservices along
  with main app server.

## Microservice Configuration

Example of embedding microservice config into you applications main config:

     {
       "httpport" : 3000,
       "jsonindent": 2,
       ....
       "submicroservices": [
	 {"id" => "loginserv", "script": "login.serv.js", "runmode": "pm2"},
	 {"id" => "DAQ", "script": "datalogging.serv.js", "runmode": "pm2"},
	 {"id" => "cronctrl", "script": "croncontrol.serv.js", "runmode": "pm2"}
       ]
       ...
     }

# Using Module API

Within main app server you'd launch sub-microservices by:

     var ml = require("microlauncher");
     // Per previous example on config ...
     var launcher = new ml.MicroLauncher(cfg.microservices, {"runmode": "pm2", "debug": 1});
     // Launch all non-disabled ones
     launcher.runsubservices();
     

# See Also ...

PM2 Programmatic API:
https://pm2.io/doc/en/runtime/reference/pm2-programmatic/

# Troubleshooting microservice starting problems

## Problems with `Error: listen EADDRINUSE 127.0.0.1:...`

- Port is reserved on the current host
- Track process that is holding it by (e.g. port 3001): `lsof -i tcp:3001`
- Process might will PM2 maintained and get relaunched by PM2 when killed
  - Kill process by `pm2 stop ... ; pm2 delete ...`
*/
"use strict;";
var pm2; // Module global for lazy-loaded pm2

/** Instantiate micro launcher
* # Options in opts:
* - debug - Produce verbose messages to console at various parts of operation (1=off, 1=on)
* - runmode - "pm2"
*/
function MicroLauncher(servcfg, opts) {
  var defopts = {runmode: "spawn"};
  
  opts = opts || {};
  //console.log();
  if (!opts.runmode) { opts.runmode = "spawn"; }
  if (!Array.isArray(servcfg)) { throw "Sub-microservices not in an Array, Got:" + servcfg; }
  // Consider pre-loading pm2 within a try/catch here to also treat var pm2 as pm2 availability flag.
  this.servcfg = servcfg;
  this.opts = opts;
  try { pm2 = require("pm2"); }
  catch(e) { pm2 = null; } // Set to something else than undef to show we tried
}
/** Launch microservices declared in config.
* Skip all servises having a flag "disa" set to true value.
* @return Number of non-disabled services that were (tried to be) launched.
*/
MicroLauncher.prototype.runsubservices = function () {
  var servcfg = this.servcfg;
  // Do we need to use / does it (significantly) benefit to use async.js here ?
  var i = 0;
  servcfg.forEach(function (s) {
    if (s.disa) { return; }
    runsubserver(s, this.opts);
    i++;
  });
  return i;
};
/** Run single subserver.
* TODO: Consider more advanced error handling.
*/
function runsubserver (srvconf, opts) {
  opts = opts || {};
  // Raw 'child_process' way of spawing sub-express (No restart protetction)
  if (opts.runmode != 'pm2') {
    var cproc = require('child_process');
    var examserver = cproc.spawn('node', [srvconf.script]);
    if (opts.debug) { console.log("Spawned " + srvconf.script); }
    // TODO: Can we get the error string (NOT only code, is there a translation available) ?
    // NOTE: Is close handler enough ? Is child implicitly killed as parent is (POSIX convention).
    // The intent here is to have parent exit have the children exited.
    examserver.on('close', function(code) {
      if (opts.debug) { console.log(srvconf.id + " exited (" +code+")"); }
    });
  }
  // PM2 guarded process
  else {
    //try { pm2 = require("pm2"); }
    //catch(e) { throw "Error loading pm2"; }
    if (!pm2) { console.log("PM2 not available (tried to load earlier)");}
    pm2.connect(function(err) {
      if (err) { console.error(err); process.exit(2); }
      console.log("Start "+ srvconf.id+" by pm2"); // TODO: Announce port (for debugging)
      pm2.start(srvconf, function(err, apps) {
        pm2.disconnect();   // Disconnects from PM2
        if (err) { console.error(err); process.exit(2); }
      });
      // Register event handlers like onrestart (?) etc.
  
    });
  } // else
}

module.exports = {
  MicroLauncher: MicroLauncher,
  runsubserver: runsubserver // In case there is use for this
};
