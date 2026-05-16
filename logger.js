let logLevel = process.env.LOG_LEVEL || 'info';
let cache_name = 'mongo-cache'
function getTimeStamp(timestamp){
  if(!timestamp) timestamp = Date.now()
  let dateTime = new Date(timestamp)
  return dateTime.toLocaleString('en-US', { timeZone: 'Etc/GMT+5', hour12: false })
}
function error(msg){
  try{
    console.error(`${getTimeStamp(Date.now())} ERROR [${cache_name}] ${msg}`)
    if(msg?.stack && logLevel == 'debug') console.error(msg)
  }catch(e){
    console.error(e)
  }
}
function info(msg){
  try{
    console.log(`${getTimeStamp(Date.now())} INFO [${cache_name}] ${msg}`)
  }catch(e){
    console.error(e)
  }
}
function debug(msg){
  try{
    if(logLevel == 'debug') console.log(`${getTimeStamp(Date.now())} DEBUG [${cache_name}] ${msg}`)
  }catch(e){
    console.error(e)
  }
}
function setCacheName(str){
  cache_name = str || 'mongo-cache'
}
module.exports = { error, debug, info, setCacheName }
