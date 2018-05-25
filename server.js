var ApiManager = require('./ApiManager');
var express = require('express');
var log4js = require('log4js');
var _ = require('lodash');
var path = require('path');

var fs = require('fs-extra');

var pkg = require('./package.json');

let logger = log4js.getLogger();
logger.level = "debug";

var configFile = path.join(__dirname, "config.json")
var config = {
  host: "localhost",
  user: "root",
  password: "password",
  database : 'testing'
}

if (fs.existsSync(configFile)){
  config = _.extend(config, fs.readJsonSync(configFile));
} else {
  logger.warn(`config file ${configFile} not exists, a default config file is generated`);
  fs.writeJsonSync(configFile, config, {spaces:2});
}

let app = express()
app.use(new ApiManager(config).app);
let server = app.listen(8080, ()=>{
  logger.info(`${pkg.name} started at http://localhost:${server.address().port}`);
})