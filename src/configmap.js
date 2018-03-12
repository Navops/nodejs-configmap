import { EventEmitter } from 'events'
import chokidar from 'chokidar'
import fs from 'fs'


export class ConfigStream extends EventEmitter{

  constructor() {
    super()
    this.current_config = {}
  }

  init(settings_list, folder = process.env.CONFIG_PATH || '/etc/config/') {

    // set up file listening and tie any changes to the same handler
    // TODO: only watch requested files
    chokidar.watch(folder, {ignored: /[\/\\]\./,usePolling: true})
    .on('add', this.fileHandler.bind(this))
    .on('change', this.fileHandler.bind(this))
    .on('unlink', this.fileHandler.bind(this))

    //Initialize and use existing evironment
    Object.keys(settings_list).forEach((s)=>{
      if(process.env[s]){
        this.setConfig(s,process.env[s].trim())
      } else {
        this.setConfig(s,settings_list[s].trim())
      }
    })
  }

  fileHandler(path){
    this.readFile(path)
    .then((contents)=>{
      this.setConfig(this.parseKey(path),contents)
    }).catch(()=>{
      this.setConfig(this.parseKey(path),null)
    })
  }

  readFile(path) {
    return new Promise((resolve,reject)=>{
      fs.readFile(path, function(err, buff){
        if (err) reject(err)
        else resolve(buff.toString().trim())
      })
    })
  }

  parseKey(path) {
    return path.split('/').pop().trim()
  }

  get(name) {
    return new Promise((resolve)=>{

      if(this.current_config[name]) {
        // Return existing value
        resolve(this.current_config[name])

      } else {
        // Wait for initial value to exist
        this.once(name,()=>{
          resolve(this.current_config[name])          
        })

      }
    })
  } 

  //Best effort from cache without waiting
  getSync(name) {
    return this.current_config[name]
  }

  setConfig(key, value){
    if(this.current_config[key] === value) return
    
    this.current_config[key] = value
    this.emit(key, value)
  }
}

//Make singleton
export default new ConfigStream()

