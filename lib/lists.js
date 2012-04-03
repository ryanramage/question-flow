


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


function addVote(votearray, id, votetype) {
    var voteholder;
    if (votearray[id]) voteholder = votearray[id];
    else voteholder =  {upvotes: 0, downvotes:0};

    voteholder = addToVoteHolder(voteholder, votetype);
    votearray[id] = voteholder;

    return voteholder;
}

function addToVoteHolder (voteholder, votetype) {
    if (votetype === 'upvote') voteholder.upvotes++;
    else voteholder.downvotes++;
    return voteholder;
}

function checkMyVote(voteholder, req, vote_user, votetype) {
    if (req.userCtx.name == vote_user) {
        voteholder.myvote = votetype;
    }
}

/**
 * this function sums up the votes for answers and comments, so those dont have to
 * go to the client
 * @param head
 * @param req
 */
exports.topicDetails = function(head, req) {
    start({'headers' : {'Content-Type' : 'application/json'}});

    var topicvotes = {upvotes: 0, downvotes:0};
    var answervotes = {};
    var commentvotes = {};

    var first = true;
    var delim = function() {
        var d = '';
        if (!first) d = '\n,';
        else first = false;
        return d;
    }
    send('[\n');
    var row;
    while (row = getRow()) {
        var doc = row.doc;
        if (doc.type === 'topic' || doc.type === 'answer' || doc.type === 'comment')  {
            send( delim() + JSON.stringify(doc)  );
        }
        if (doc.type === 'topic-vote')   {
            addToVoteHolder(topicvotes, doc.vote_type);
            checkMyVote(topicvotes, req, doc.user,  doc.vote_type);
        }
        if (doc.type === 'answer-vote')  {
            var voteholder = addVote(answervotes, doc.answer, doc.vote_type);
            checkMyVote(voteholder, req, doc.user,  doc.vote_type);
        }
        if (doc.type === 'comment-vote') {
            var voteholder = addVote(commentvotes, doc.comment, doc.vote_type);
            checkMyVote(voteholder, req, doc.user,  doc.vote_type);
        }
    }
    send( delim() + JSON.stringify( { topic_votes : topicvotes, answer_votes : answervotes, comment_votes : commentvotes }  ));
    send('\n]');
}