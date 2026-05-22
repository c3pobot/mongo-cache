const log = require('./logger')
const { MongoClient } = require("mongodb");

let mongo, mongo_ready

async function init(){
  try{
    await mongo?.connect()
    let status = await mongo.db('admin').command({ ping: 1 })
    if(status.ok > 0){
      mongo_ready = true
      return log.info(`connection successful...`, 'mongo-shared')
    }
    setTimeout(init, 5000)
  }catch(e){
    log.error(e, 'mongo-shared')
    setTimeout(init, 5000)
  }
}
function connect(connection_string){
  if(!connection_string) return
  mongo = new MongoClient(connection_string)
  init()
}
function status(){
  return mongo_ready
}
class client{
  constructor({ cache_name, db_name }){
    if(!db_name) throw `No db_name provided`
    this.cache_name = cache_name || db_name, this._db = db_name
  }

  async aggregate( collection, matchCondition, data = []){
    try{
      if(matchCondition) data.unshift({$match: matchCondition})
      return await mongo.db( this._db ).collection(collection).aggregate(data, { allowDiskUse: true }).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async all( collection, matchCondition, project ){
    try{
      return await mongo.db( this._db ).collection( collection ).find( matchCondition, { projection: project } ).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async del( collection, matchCondition ){
    try{
      return await mongo.db( this._db ).collection(collection).deleteOne(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async delMany( collection, matchCondition ){
    try{
      return await mongo.db( this._db ).collection(collection).deleteMany(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async count( collection, matchCondition ){
    try{
      return await mongo.db( this._db ).collection( collection ).countDocuments(matchCondition)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async createIndex(collection, indexObj, opts = {}){
    try{
      if(!indexObj) throw('No index provided...')
      //opts = { background: true, expireAfterSeconds: 600 }
      return await mongo.db( this._db ).collection( collection ).createIndex(indexObj, opts)
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async dropIndex( collection, indexName){
    try{
      if(!collection || !indexName) return
      let res = await mongo.db( this._db ).collection( collection ).dropIndex(indexName)
      if(res?.ok) return true
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async get(collection, matchCondition, project){
    try{
      let res = await mongo.db( this._db ).collection( collection ).find( matchCondition, { projection: project } ).toArray()
      if(res?.length > 0) return res[0]
    }catch(e){
      log.error(e, this.cache_name)
    }
  }

  async listIndexes( collection ){
    try{
      return await mongo.db( this._db ).collection( collection ).listIndexes().toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }

  async limit( collection, matchCondition, project, limitCount = 50 ){
    try{
      return await mongo.db( this._db ).collection( collection ).find( matchCondition, { projection: project } ).limit( limitCount ).toArray()
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async push( collection, matchCondition, data){
    try{
      return await mongo.db( this._db ).collection( collection ).updateOne( matchCondition, { $push: data, $set: { TTL: new Date()} }, { upsert:true } )
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async replace( collection, matchCondition, data){
    try{
      if(!data || !matchCondition || !collection) return
      if(!data?.TTL) data.TTL = new Date()
      let res = await mongo.db( this._db ).collection( collection ).replaceOne( matchCondition, data, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async set( collection, matchCondition, data ){
    try{
      if(!data || !matchCondition || !collection) return
      if(!data?.TTL) data.TTL = new Date()
      let res = await mongo.db( this._db ).collection( collection ).updateOne( matchCondition, { $set: data }, { upsert: true } )
      delete data.TTL
      return res?.acknowledged
    }catch(e){
      log.error(e, this.cache_name)
    }
  }
  async updateIndex( collection, keys, opts ){
    try{
      if(!collection || !keys || !opts?.name) return
      let collections = await mongo.db( this._db ).listCollections()?.toArray()
      let indexCollection = collections.find(x=>x.name == collection)
      if(!indexCollection?.name){
        let created = await mongo.db( this._db ).createCollection(collection)
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
    return mongo_ready
  }
}
module.exports = { connect, status, client }
