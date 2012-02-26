// Stew reducer
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

exports.reduce = easy_reduce
exports.reducer = define_easy_reducer

function easy_reduce(keys, vals, rereduce) {
  if(!Array.isArray(keys))
    throw new Error('First parameter must be the CouchDB "keys" array')
  if(!Array.isArray(vals))
    throw new Error('Second parameter must be the CouchDB "vals" array')
  if(typeof rereduce !== 'boolean')
    throw new Error('Third parameter must be the CouchDB "rereduce" boolean flag')

  var keys = Array.prototype.slice.call(arguments, 3)
  if(keys.length < 1)
    throw new Error('Must provide at least one key name to accumulate')

  keys.forEach(function(key, i) {
    if(typeof key !== 'string')
      throw new Error('Argument ' + (3+1+i) + ' is not a string: ' + JSON.stringify(key))
  })

  var reducer = define_easy_reducer(keys)
  return reducer(keys, vals, rereduce)
}

function define_easy_reducer(key_names) {
  // Return a CouchDB reduce function which accumulates all the desired keys in
  // an object. The exception is a "count" key which is the count of total objects.

  if(!Array.isArray(key_names))
    key_names = Array.prototype.slice.apply(arguments)

  // Always have a "count" key to count the total rows emitted.
  if(!~ key_names.indexOf('count'))
    key_names.push('count')

  var conversions = []

  var reducer_func = reducer
  reducer_func.convert = add_conversion
  return reducer_func

  function reducer(keys, vals, rereduce) {
    var result = {}

    vals.forEach(function(value) {
      key_names.forEach(function(key) {
        var current_value = result[key] || 0
          , sub_value     = value[key]  || 0

        // Everything always accumulates, with the exception that "count"
        // increments the first time around (before re-reducing).
        if(!rereduce && key === 'count')
          result[key] = current_value + 1

        else
          result[key] = current_value + sub_value
      })
    })

    conversions.forEach(function(conversion) {
      var key     = conversion[0]
        , new_key = conversion[1]
        , func    = conversion[2]
        , value   = result[key]

      result[new_key] = func.call(result, value)
    })
    log(result);
    return result
  }

  function add_conversion(key, new_key, func) {
    if(!~ key_names.indexOf(key))
      throw new Error('Cannot convert unspecified key: ' + key)
    if(~ key_names.indexOf(new_key))
      throw new Error('Cannot convert to existing key: ' + new_key)
    if(typeof func !== 'function')
      throw new Error('Third parameter must be conversion function')

    conversions.push([key, new_key, func])

    return reducer_func
  }
}
