const log = require('./logger')

const { MongoClient } = require("mongodb");

module.exports = class MongoCache {
  constructor({ connection_string, db_name, collections, cache_name }){
    if(!db_name) throw `No db_name provided`
    if(cacheName) log.setCacheName(cache_name || db_name)
    this._mongo = new MongoClient(connection_string)
    this._mongo_ready = false, this._collections = collections || [],  this._dbo = this._mongo.db(db_name)
    this._init()
  }
  async _init(){
    try{
      await this._mongo.connect()
      let status = await this._mongo.db('admin').command({ ping: 1 })
      if(status.ok > 0){
        log.info(`mongo-local connection successful...`)
        return this._createTables()
      }
      setTimeout(this._init, 5000)
    }catch(e){
      log.error(e)
      setTimeout(this._init, 5000)
    }
  }
  async _createTables(){
    try{
      if(!this._collections || this._collections?.length == 0) return this._mongo_ready = true
      for(let i in this._collections){
        if(!this._collections[i].expireSeconds) continue
        await this._dbo.collection(this._collections[i].name)?.createIndex({ TTL: 1 }, { name: '_TTL', expireAfterSeconds: this._collections[i].expireSeconds } )
        log.info(`Create TTL index for collection ${this._collections[i].name}`)
      }
      this._mongo_ready = true
      return
      setTimeout(this._createTables, 5000)
    }catch(e){
      log.error(e)
      setTimeout(this._createTables, 5000)
    }
  }

  async aggregate( collection, matchCondition, data = []){
    try{
      if(matchCondition) data.unshift({$match: matchCondition})
      return await this._dbo.collection(collection).aggregate(data, { allowDiskUse: true }).toArray()
    }catch(e){
      log.error(e)
    }
  }
  async all( collection, matchCondition, project ){
    try{
      return await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).toArray()
    }catch(e){
      log.error(e)
    }
  }
  async del( collection, matchCondition ){
    try{
      return await this._dbo.collection(collection).deleteOne(matchCondition)
    }catch(e){
      log.error(e)
    }
  }
  async delMany( collection, matchCondition ){
    try{
      return await this._dbo.collection(collection).deleteMany(matchCondition)
    }catch(e){
      log.error(e)
    }
  }
  async count( collection, matchCondition ){
    try{
      return await this._dbo.collection( collection ).countDocuments(matchCondition)
    }catch(e){
      log.error(e)
    }
  }
  async createIndex(collection, indexObj, opts = {}){
    try{
      if(!indexObj) throw('No index provided...')
      //opts = { background: true, expireAfterSeconds: 600 }
      return await this._dbo.collection( collection ).createIndex(indexObj, opts)
    }catch(e){
      log.error(e)
    }
  }
  async dropIndex( collection, indexName){
    try{
      if(!collection || !indexName) return
      let res = await this._dbo.collection( collection ).dropIndex(indexName)
      if(res?.ok) return true
    }catch(e){
      log.error(e)
    }
  }
  async get(collection, matchCondition, project){
    try{
      let res = await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).toArray()
      if(res?.length > 0) return res[0]
    }catch(e){
      log.error(e)
    }
  }

  async listIndexes( collection ){
    try{
      return await this._dbo.collection( collection ).listIndexes().toArray()
    }catch(e){
      log.error(e)
    }
  }

  async limit( collection, matchCondition, project, limitCount = 50 ){
    try{
      return await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).limit( limitCount ).toArray()
    }catch(e){
      log.error(e)
    }
  }

  async set( collection, matchCondition, data ){
    try{
      if(!data || !matchCondition || !collection) return
      if(!data?.TTL) data.TTL = new Date()
      let res = await this._dbo.collection( collection ).updateOne( matchCondition, { $set: data }, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e)
    }
  }
  async updateIndex( collection, keys, opts ){
    try{
      if(!collection || !keys || !opts?.name) return
      let collections = await this._dbo.listCollections()?.toArray()
      let indexCollection = collections.find(x=>x.name == collection)
      if(!indexCollection?.name){
        let created = await this._dbo.createCollection(collection)
        if(created?.s?.namespace?.collection !== collection) return log.error(`error creating collection ${collection}...`)
        log.debug(`collection ${collection} created...`)
      }
      let indexes = await this.listIndexes( collection )
      let index = indexes?.find(x=>x.name == opts.name)
      if(index?.key && JSON.stringify(index.key) == JSON.stringify(keys)){
        if(!opts.expireAfterSeconds && !index.expireAfterSeconds) return true
        if(opts.expireAfterSeconds && opts.expireAfterSeconds == index.expireAfterSeconds) return true
        if(index.expireAfterSeconds && opts.expireAfterSeconds == index.expireAfterSeconds) return true
      }
      if(index?.name){
        let dropped = await this.dropIndex(collection, opts.name)
        if(!dropped) return log.error(`error dropping index index ${opts.name} for ${collection}...`)
        log.debug(`dropped ${collection} index ${opts.name}...`)
      }
      let indexName = await this.createIndex( collection, keys, opts)
      if(!indexName || indexName !== opts.name) return log.error(`error creating index ${opts.name} for ${collection}`)
      log.debug(`created index ${opts.name} for ${collection}...`)
      return true
    }catch(e){
      log.error(e)
    }
  }
  status(){
    return this._mongo_ready
  }
}
