exports.unfiltered = {
    map : function(doc) {
        if (doc.timestamp)                            emit([0, doc.timestamp], null);
        if (doc.votes)                                emit([1, doc.votes],     null);
        if (doc.views)                                emit([2, doc.views],     null);

        if (doc.discussed) {
          if (doc.discussed == 0 && doc.timestamp)    emit([3, doc.timestamp], null);
          else if (doc.discussed == 0)                emit([3, null],          null);
        }
        if (doc.resolved) {
            if (doc.resolved == false && doc.timestamp) emit([4, doc.timestamp], null);
            else if (doc.resolved == false)             emit([4, null],          null);
        }
    },
    reduce: '_count'
}





exports.byTag = {
    map : function(doc) {
        var preemit = function(tag, tags) {
            if (doc.timestamp)                            emit([tag, 0, doc.timestamp], tags);
            if (doc.votes)                                emit([tag, 1, doc.votes],     tags);
            if (doc.views)                                emit([tag, 2, doc.views],     tags);

            if (doc.discussed) {
              if (doc.discussed == 0 && doc.timestamp)    emit([tag, 3, doc.timestamp], tags);
              else if (doc.discussed == 0)                emit([tag, 3, null],          tags);
            }
            if (doc.resolved) {
                if (doc.resolved == false && doc.timestamp) emit([tag, 4, doc.timestamp], tags);
                else if (doc.resolved == false)             emit([tag, 4, null],          tags);
            }
        };
        if (doc.tags) {
            for (var i in doc.tags) {
                preemit(doc.tags[i], doc.tags);
            }
        } else {
            preemit('/', null);
        }
    },
    reduce : '_count'
}