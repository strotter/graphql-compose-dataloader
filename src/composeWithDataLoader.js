import { TypeComposer } from 'graphql-compose'
import DataLoader from 'dataloader'
import SingleContinous from './singleContinous'

import {
  dataloaderOptions
} from './definitions'

export function composeWithDataLoader(
  typeComposer: TypeComposer,
  options: dataloaderOptions = {}
): TypeComposer {


  // if (!(typeComposer instanceof TypeComposer)) {
  //   throw new Error('You should provide TypeComposer instance to composeWithDataLoader method');
  // }
  // 
  // 
  /**
   * Set defaults
   */
  options ={
    cacheExpiration: options.cacheExpiration || 300,
    removeProjection: options.removeProjection || true,
    debug: options.debug || false,
  } 

  /**
   * Add DataLoader to FindById
   */
  let findByIdResolver = typeComposer.get('$findById')
  let findByIdLoader = new DataLoader( (resolveParamsArray) => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (findById)')
      resolve(resolveParamsArray.map(rp => findByIdResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => {
    let newKey = getHashKey(key)
    return newKey
  } })

  typeComposer.setResolver( 'findById', 
    findByIdResolver.wrapResolve(next => rp => {
      if (options.removeProjection) delete rp.projection
      SingleContinous.run(findByIdLoader, rp, 'findById', options)
      return findByIdLoader.load(rp)
    })
  )


  /**
   * Add DataLoader to FindByIds
   */
  let findByIdsResolver = typeComposer.get('$findByIds')
  let findByIdsLoader = new DataLoader( (resolveParamsArray) => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (findByIds)')
      resolve(resolveParamsArray.map(rp => findByIdResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => getHashKey(key) })

  typeComposer.setResolver(
    'findByIds', 
    findByIdsResolver.wrapResolve(fn => rp => {
      SingleContinous.run(findByIdsLoader, rp, 'findByIds', options)
      return findByIdsLoader.load(rp)
    })
  )
  
  
  /**
   * Add DataLoader to Count
   */
  let countResolver = typeComposer.get('$count')
  let countLoader = new DataLoader( (resolveParamsArray) => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (count)')
      resolve(resolveParamsArray.map(rp => countResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => getHashKey(key) })

  typeComposer.setResolver(
    'count', 
    countResolver.wrapResolve(fn => rp => {
      SingleContinous.run(countLoader, rp, 'count', options)
      return countLoader.load(rp)
    })
  )
  
  
  /**
   * Add DataLoader to FindOne
   */
  let findOneResolver = typeComposer.get('$findOne')
  let findOneLoader = new DataLoader( (resolveParamsArray) => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (findOne)')
      resolve(resolveParamsArray.map(rp => findOneResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => getHashKey(key) })

  typeComposer.setResolver(
    'findOne', 
    findByIdsResolver.wrapResolve(fn => rp => {
      SingleContinous.run(findOneLoader, rp, 'findOne', options)
      return findOneLoader.load(rp)
    })
  )

  /**
   * Add DataLoader to FindMany
   */
  let findManyResolver = typeComposer.get('$findMany')
  let findManyLoader = new DataLoader( resolveParamsArray => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (findMany)')
      resolve(resolveParamsArray.map(rp => findManyResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => getHashKey(key)} )

  typeComposer.setResolver(
    'findMany', 
    findManyResolver.wrapResolve(next => rp => {
      if (options.removeProjection) delete rp.projection
      SingleContinous.run(findManyLoader, rp, 'findMany', options)
      return findManyLoader.load(rp)
    })
  )


  /**
   * Add DataLoader to Connection
   */
  let connectionResolver = typeComposer.get('$connection')
  let connectionFieldNames = typeComposer.getFieldNames()
  let connectionLoader = new DataLoader( resolveParamsArray => 
    new Promise((resolve, reject) => {
      if (options.debug) console.log('New db request (connection)')
      resolve(resolveParamsArray.map(rp => connectionResolver.resolve(rp)))
    }),
  { cacheKeyFn: key => getHashKey(key) })

  typeComposer.setResolver( 'connection', 
    connectionResolver.wrapResolve(next => rp => {
      if(options.removeProjection){
        let projection = { edges: { node: {} } }
        connectionFieldNames.map( field => projection.edges.node[field] = true)
        rp.projection = projection
      }
      SingleContinous.run(connectionLoader, rp, 'connection', options)
      return connectionLoader.load(rp)
    })
  )
    

  const getHashKey = key =>{
    let object = {}
    Object.assign(object, 
      { args: key.args }, 
      { projection: key.projection || {} }, 
      { rawQuery: JSON.stringify(key.rawQuery || {}) }, 
      { context: JSON.stringify(key.context || {}) })
    let hash = JSON.stringify(object).split("").reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
    return hash
  }

  return typeComposer
}
