let logLevel = process.env.LOG_LEVEL || 'info';
function getTimeStamp(timestamp){
  if(!timestamp) timestamp = Date.now()
  let dateTime = new Date(timestamp)
  return dateTime.toLocaleString('en-US', { timeZone: 'Etc/GMT+5', hour12: false })
}
function error(msg, cache_name){
  try{
    if(msg?.name?.toLowerCase().includes('mongonetworkerror') && logLevel !== 'debug') return
    console.error(`${getTimeStamp(Date.now())} ERROR [${cache_name}] ${msg}`)
    if(msg?.stack && logLevel == 'debug') console.error(msg)
  }catch(e){
    console.error(e)
  }
}
function info(msg, cache_name){
  try{
    console.log(`${getTimeStamp(Date.now())} INFO [${cache_name}] ${msg}`)
  }catch(e){
    console.error(e)
  }
}
function debug(msg, cache_name){
  try{
    if(logLevel == 'debug') console.log(`${getTimeStamp(Date.now())} DEBUG [${cache_name}] ${msg}`)
  }catch(e){
    console.error(e, cache_name)
  }
}

module.exports = { error, debug, info }
