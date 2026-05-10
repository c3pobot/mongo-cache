const log = require('./logger')

const { MongoClient } = require("mongodb");
let mongoReady = false
let mongo, connectionString = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/?compressors=zlib&retryReads=true&retryWrites=true&maxPoolSize=200`
if(process.env.MONGO_AUTH_DB) connectionString += `&authSource=${process.env.MONGO_AUTH_DB}`
if(process.env.MONGO_REPSET) connectionString += `&replicaSet=${process.env.MONGO_REPSET}`

let mongo = MongoClient(connectionString)
async function init(){
  try{
    await mongo.connect()
    let status = await mongo.db('admin').command({ ping: 1 })
    console.log(status)
  }catch(e){
    log.error(e)
    setTimeout(init, 5000)
  }
}
init()
