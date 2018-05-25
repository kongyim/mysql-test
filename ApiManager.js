var express = require('express');
var mysql = require('mysql');
var log4js = require('log4js');
var _ = require('lodash');
var path = require('path');
var Q = require('q');

class ApiManager {

  constructor(config) {
    this.config = config;
    this.app = express();
    this.initRoutes();
  }

  createConnection(req, res, next){
    req.connection = mysql.createConnection(this.config);
    req.connection.connect(error=>{
      if (error) return res.status(500).send(error)
      next();
    })
  }

  getResourceList(req, res, next) {
    let schema = {}
    Q()
      .then(()=>{
        let sql = `select * from information_schema.tables where table_type = 'BASE TABLE'`
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread((result)=>{
        return Q.all(_.map(result, (item)=>{
          let sql = `desc ${item.TABLE_NAME}`
          return Q.ninvoke(req.connection, "query", sql).spread(list => schema[item.TABLE_NAME] = list );
        }))
        .then(result=>{
          res.send(schema)
        })
      })
      .catch(error=> {
        return res.status(500).send(error);
      })
      .then(()=>{
        req.connection.end();
      })
  }

  getResource(req, res, next) {
    Q()
      .then(()=>{
        let sql = `select * from ${req.params.resource}`
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread((result)=>{
        if (error) return res.status(500).send(error);
        if (req.query) {
          result = _.filter(result, req.query )
        }
        if (req.params.id) {
          result = _.find(result, {id: parseInt(req.params.id)} )
        }

        if (!result) return res.sendStatus(404)
        res.send(result)
      })
      .catch(error=> {
        return res.status(500).send(error);
      })
      .then(()=>{
        req.connection.end();
      })

  }

  initRoutes() {
    this.app.get(`/`, this.createConnection.bind(this), this.getResourceList.bind(this) )
    this.app.get(`/:resource/:id?`, this.createConnection.bind(this), this.getResource.bind(this) )
  }
}

exports = module.exports = ApiManager;