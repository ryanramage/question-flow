# Stew: Relaxed CouchDB reduce functions

Stew is a better way to write CouchDB reduce functions. Use it like so:

1. In your **map** function, emit objects
2. In your **reduce** function, write one line of code to call stew.
3. Stew accumulates all numeric values in your objects

Stew is available as a Kanso package

    $ kanso install stew

## Example

Your map function emits objects. For example, suppose you have documents:

```javascript
{ _id:"my Thinkpad", cores:1, ports:1, mice:2 }
{ _id:"Mom's iMac" , cores:2, ports:2, mice:1, cameras:1 }
{ _id:"Dad's PC"   , cores:4,        , mice:1, cameras:1 }
```

You want to emit objects, so emitting the document is easy enough.

```javascript
function(doc) {
  // Map function
  emit(doc._id, doc)
}
```

To track your total inventory, use stew:

```javascript
function(keys, vals, rereduce) {
  return require('views/lib/stew')
         .reduce(keys, vals, rereduce,
                 'cores', 'ports', 'mice', 'cameras')
}
```

Now Couch has accumulated all your parts, and provided a count of total rows

```javascript
{ "cores":7, "ports":3, "mice":4, "cameras":2, "count":3 }
```

<a name="advanced"></a>
## Advanced Usage

You can define the reduce function before you call it.

```javascript
var stew = require('views/lib/stew')
var reducer = stew.reducer('cores', 'ports', 'mice', 'cameras')

return reducer(keys, values, rereduce)
```

The reducer function allows you to add *conversion functions* to build from other values. For example, if you have `.bytes`, you can also make `.gigs`.

```javascript
var stew = require('views/lib/stew')
var GB = 1024 * 1024 * 1024

return stew.reducer('bytes')
           .convert('bytes', 'gigs', function(val) { return val / GB })
           .reduce(keys, vals, rereduce)
```

The output will provide both values.

```javascript
{ "bytes":5911293777, "gigs":5.505321339704096 }
```

## Tests

Stew uses [node-tap][tap]. If you clone this Git repository, tap is included.

    $ ./node_modules/.bin/tap test
    ok test/reduce.js ..................................... 46/46
    total ................................................. 47/47

    ok

## License

Apache 2.0

[tap]: https://github.com/isaacs/node-tap
