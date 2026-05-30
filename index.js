const log = require('./logger')
const { MongoClient } = require("mongodb");
function _fix_match_condition( matchCondition ){
  if(matchCondition?._id) matchCondition._id = matchCondition._id.toString()
}
const MongoCacheShared = require('./shared');
class MongoCache {
  constructor({ connection_string, collections, cache_name, db_name }){
    if(!db_name) throw `No db_name provided`
    this.cache_name = cache_name || db_name, this._mongo_ready = false, this._collections = collections || []
    this._mongo = new MongoClient(connection_string)
    this._dbo = this._mongo.db(db_name)
    this._init()
  }
  async _init(){
    try{
      await this._mongo?.connect()
      let status = await this._mongo?.db('admin')?.command({ ping: 1 })
      if(status.ok > 0){
        log.info(`connection successful...`, this.cache_name)
        return this._createTables()
      }
      setTimeout(()=>this._init(), 5000)
    }catch(e){
      log.error(e, this.cache_name)
      setTimeout(()=>this._init(), 5000)
    }
  }
  async _createTables(){
    try{
      if(!this._collections || this._collections?.length == 0) return this._mongo_ready = true
      for(let i in this._collections){
        if(!this._collections[i].expireSeconds) continue
        await this._dbo.collection(this._collections[i].name)?.createIndex({ TTL: 1 }, { name: '_TTL', expireAfterSeconds: this._collections[i].expireSeconds } )
        log.info(`Created TTL index for collection ${this._collections[i].name}`, )
      }
      this._mongo_ready = true
      return
      setTimeout(this._createTables, 5000)
    }catch(e){
      log.error(e, this.cache_name)
      setTimeout(this._createTables, 5000)
    }
  }
  async aggregate( collection, matchCondition, data = []){
    try{
      if(matchCondition) data.unshift({$match: matchCondition})
      return await this._dbo.collection(collection).aggregate(data, { allowDiskUse: true }).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async all( collection, matchCondition, project ){
    try{
      return await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async del( collection, matchCondition ){
    try{
      _fix_match_condition(matchCondition)
      return await this._dbo.collection(collection).deleteOne(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async delMany( collection, matchCondition ){
    try{
      _fix_match_condition(matchCondition)
      return await this._dbo.collection(collection).deleteMany(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async count( collection, matchCondition ){
    try{
      return await this._dbo.collection( collection ).countDocuments(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async createIndex(collection, indexObj, opts = {}){
    try{
      if(!indexObj) throw('No index provided...')
      //opts = { background: true, expireAfterSeconds: 600 }
      return await this._dbo.collection( collection ).createIndex(indexObj, opts)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async dropIndex( collection, indexName){
    try{
      if(!collection || !indexName) return
      let res = await this._dbo.collection( collection ).dropIndex(indexName)
      if(res?.ok) return true
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async get(collection, matchCondition, project){
    try{
      _fix_match_condition(matchCondition)
      let res = await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).toArray()
      if(res?.length > 0) return res[0]
    }catch(e){
      log.error(e, this.cache_name)
    }
  }

  async listIndexes( collection ){
    try{
      return await this._dbo.collection( collection ).listIndexes().toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }

  async limit( collection, matchCondition, project, limitCount = 50 ){
    try{
      _fix_match_condition(matchCondition)
      return await this._dbo.collection( collection ).find( matchCondition, { projection: project } ).limit( limitCount ).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async push( collection, matchCondition, data){
    try{
      _fix_match_condition(matchCondition)
      let res = await this._dbo.collection( collection ).updateOne( matchCondition, { $push: data, $set: { TTL: new Date()} }, { upsert:true } )
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async pull( collection, matchCondition, data){
    try{
      _fix_match_condition(matchCondition)
      let res = await this._dbo.collection( collection ).updateOne( matchCondition, { $pull: data, $set: { TTL: new Date()} }, { upsert:true } )
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async replace( collection, matchCondition, data){
    try{
      if(!data || !matchCondition || !collection) return
      _fix_match_condition(matchCondition)
      if(!data?.TTL) data.TTL = new Date()
      let res = await this._dbo.collection( collection ).replaceOne( matchCondition, data, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async set( collection, matchCondition, data ){
    try{
      if(!data || !matchCondition || !collection) return
      _fix_match_condition(matchCondition)
      if(!data?.TTL) data.TTL = new Date()
      let res = await this._dbo.collection( collection ).updateOne( matchCondition, { $set: data }, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async setMany( collection, matchCondition, data ){
    try{
      if(!data || !matchCondition || !collection) return
      _fix_match_condition(matchCondition)
      if(!data?.TTL) data.TTL = new Date()
      let res = await this._dbo.collection( collection ).updateMany( matchCondition, { $set: data }, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async updateIndex( collection, keys, opts ){
    try{
      if(!collection || !keys || !opts?.name) return
      let collections = await this._dbo.listCollections()?.toArray()
      let indexCollection = collections.find(x=>x.name == collection)
      if(!indexCollection?.name){
        let created = await this._dbo.createCollection(collection)
        if(created?.s?.namespace?.collection !== collection) return log.error(`error creating collection ${collection}...`, this.cache_name)
        log.debug(`collection ${collection} created...`, this.cache_name)
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
        if(!dropped) return log.error(`error dropping index index ${opts.name} for ${collection}...`, this.cache_name)
        log.debug(`dropped ${collection} index ${opts.name}...`, this.cache_name)
      }
      let indexName = await this.createIndex( collection, keys, opts)
      if(!indexName || indexName !== opts.name) return log.error(`error creating index ${opts.name} for ${collection}`, this.cache_name)
      log.debug(`created index ${opts.name} for ${collection}...`, this.cache_name)
      return true
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  status(){
    return this._mongo_ready
  }
}
module.exports.MongoCache = MongoCache
module.exports.MongoCacheShared = MongoCacheShared
