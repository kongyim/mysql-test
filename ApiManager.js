var express = require('express');
var mysql = require('mysql');
var log4js = require('log4js');
var _ = require('lodash');
var path = require('path');
var Q = require('q');
var squel = require("squel");
var bodyParser = require('body-parser')

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
        let sql = squel.select()
                    .from("information_schema.tables")
                    .where("table_type = 'BASE TABLE'")
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
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
        let sql = squel.select()
                    .from(req.params.resource)
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
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

  createResource(req, res, next) {
    Q()
      .then(()=>{
        let sql = squel.insert()
                    .into(req.params.resource)
                    .setFields(req.body)
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
        if (!result) return res.sendStatus(404)
        req.body.id = result.insertId;
        res.send(req.body)
      })
      .catch(error=> {
        return res.status(500).send(error);
      })
      .then(()=>{
        req.connection.end();
      })
  }

  updateResource(req, res, next) {
    Q()
      .then(()=>{
        let sql = squel.update()
                    .table(req.params.resource)
                    .setFields(req.body)
                    .where(`id = ${req.params.id}`)
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
        if (!result || !result.affectedRows) return res.sendStatus(404)
      })
      .then(()=>{
        let sql = squel.select()
                    .from(req.params.resource)
                    .where(`id = ${req.params.id}`)
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
        if (!result) return res.sendStatus(404)
        res.send(_.head(result));
      })
      .catch(error=> {
        return res.status(500).send(error);
      })
      .then(()=>{
        req.connection.end();
      })
  }

  removeResource(req, res, next) {
    Q()
      .then(()=>{
        let sql = squel.delete()
                    .from(req.params.resource)
                    .where(`id = ${req.params.id}`)
                    .toString()
        return Q.ninvoke(req.connection, "query", sql);
      })
      .spread(result=>{
        if (!result || !result.affectedRows) return res.sendStatus(404)
        res.sendStatus(200)
      })
      .catch(error=> {
        return res.status(500).send(error);
      })
      .then(()=>{
        req.connection.end();
      })
  }

  initRoutes() {
    this.app.use(bodyParser.json())
    this.app.get(`/`, this.createConnection.bind(this), this.getResourceList.bind(this) )
    this.app.get(`/:resource/:id?`, this.createConnection.bind(this), this.getResource.bind(this) )
    this.app.post(`/:resource`, this.createConnection.bind(this), this.createResource.bind(this) )
    this.app.delete(`/:resource/:id?`, this.createConnection.bind(this), this.removeResource.bind(this) )
    this.app.put(`/:resource/:id`, this.createConnection.bind(this), this.updateResource.bind(this) )
  }
}

exports = module.exports = ApiManager;