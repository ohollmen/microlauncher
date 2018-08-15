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

Example of embedding microservice config into you applications main config
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

Within main app server you'd launch 
     var MicroLauncher = require("microlauncher");
     // Per previous example on config
     var laucher = new MicroLauncher({"runmode": "pm2"});

# See Also ...

PM2 Programmatic API:
https://pm2.io/doc/en/runtime/reference/pm2-programmatic/

# Troubleshooting microservice starting problems

## Problems with `Error: listen EADDRINUSE 127.0.0.1:...`

- Port is reserved on the current host
- Track process that is holding it by (e.g. port 3001): lsof -i tcp:3001
- Process might will PM2 maintained and get relaunched by PM2 when killed
  - Kill process by `pm2 stop ... ; pm2 delete ...`
