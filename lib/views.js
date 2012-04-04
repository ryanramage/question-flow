

exports.unfiltered = {
    map : function(doc) {
        if (doc.type !== 'topic') return;
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
        if (doc.type !== 'topic') return;
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

exports.allTopicAssets = {
    map : function(doc) {
        if (!doc.type) return;
        if (doc.type === 'topic')       emit ([doc._id, 0], null);
        if (doc.type === 'answer')       emit([doc.topic, doc.timestamp], null);
        if (doc.type === 'comment')      emit([doc.topic, doc.timestamp], null);
        if (doc.type === 'topic-vote')   emit([doc.topic, doc.timestamp], null);
        if (doc.type === 'answer-vote')  emit([doc.topic, doc.timestamp], null);
        if (doc.type === 'comment-vote') emit([doc.topic, doc.timestamp], null);
    }
}

exports.voteSummary = {
    map : function(doc) {
        if (doc.type === 'answer-vote')  {
            emit([doc.answer, doc.vote_type], 1);
        }
        if (doc.type === 'comment-vote')  {
            emit([doc.comment, doc.vote_type], 1);
        }
    },
    reduce : '_sum'

}

exports.topicSummary = {
    map : function(doc) {
        if (!doc.type) return;
        if (doc.type === 'topic') emit (doc._id, {views: doc.views});
        if (doc.type == 'answer')  {
            var res = {answers: 1, accepted: 0};
            if (doc.accepted) res.accepted = 1;
            emit(doc.topic, res);
        }
        if (doc.type == 'topic-vote')  {
            var res = { upvotes: 0, downvotes: 0 };
            if (doc.vote_type === 'upvote') res.upvotes++;
            else res.downvotes++;
            emit(doc.topic, res);
        }
    },
    reduce : function(keys, vals, rereduce) {
        var key_names = ['views', 'answers', 'accepted', 'upvotes', 'downvotes', 'count'];
        var result = {};
        var conversions = [];

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
        return result
    }
}


