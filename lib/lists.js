
exports.intersection = function (head, req) {
    var row;
    var extraKeys = [];
    if (req.query.key) {
        extraKeys.push(req.query.key);
    }
    if (req.query.extra_keys) {
        extraKeys = extraKeys.concat(JSON.parse(req.query.extra_keys));
    }

    start({'headers' : {'Content-Type' : 'application/json'}});
    send('{ "rows" : [\n');
    var count = 0;
    while ((row = getRow())) {
        var hasAll = true;
        var docTags = row.value;
        if (docTags) {

          for (var i in extraKeys) {
              var hasOne = false;
              for (var j in row.value) {
                  if (row.value[j] == extraKeys[i]) {
                      hasOne = true; break;
                  }
              }
              if (!hasOne) {
                  hasAll = false; break;
              }
          }
        }
        if (hasAll) {
            if (count++ > 0) {
                send (',\n');
            }
            send(JSON.stringify(row));
        }
    }
    send('\n]}');
}