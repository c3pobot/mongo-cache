const log = require('./logger')

const { MongoClient } = require("mongodb");

let connectionString = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/?compressors=zlib&retryReads=true&retryWrites=true&maxPoolSize=200`
if(process.env.MONGO_AUTH_DB) connectionString += `&authSource=${process.env.MONGO_AUTH_DB}`
if(process.env.MONGO_REPSET) connectionString += `&replicaSet=${process.env.MONGO_REPSET}`

let mongo = new MongoClient(connectionString), mongo_ready = false
async function init(){
  try{
    await mongo.connect()
    let status = await mongo.db('admin').command({ ping: 1 })
    if(status.ok > 0){
      mongo_ready = true
      log.info(`mongo connection successful...`)
      return
    }
    setTimeout(init, 5000)
  }catch(e){
    log.error(e)
    setTimeout(init, 5000)
  }
}
init()
module.exports.status = ()=>{
  return mongo_ready
}
module.exports.MongoCache = class{
  constructor(dbName){
    this._dbo = mongo.db(dbName)
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
}
