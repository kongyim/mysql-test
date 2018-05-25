var express = require('express');
var mysql = require('mysql');
var log4js = require('log4js');
var _ = require('lodash');
var path = require('path');

class ApiManager {

  constructor(config) {
    this.config = config;
    this.app = express();
    this.initRoutes();
  }

  createConnection(req, res, next){
    req.connection = mysql.createConnection(this.config);
    req.connection.connect(error=>{
      if (error) return res.status(500).send(err)
      next();
    })
  }

  getResource(req, res, next) {
    let sql = `select * from ${req.params.resource}`
    req.connection.query(sql, (err, result)=> {
      if (err) return res.status(500).send(err);
      if (req.query) {
        result = _.filter(result, req.query )
      }
      if (req.params.id) {
        result = _.find(result, {id: parseInt(req.params.id)} )
      }

      if (!result) return res.sendStatus(404)
      res.send(result)
    });
    req.connection.end();
  }

  initRoutes() {
    this.app.get(`/:resource/:id?`, this.createConnection.bind(this), this.getResource.bind(this) )
  }
}

exports = module.exports = ApiManager;