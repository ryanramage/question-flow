
var _ = require('underscore')._;
var common = require('./common');



exports.bumpViews = function(doc, req) {
    if (!doc) {
        return [null, "Need an existing doc"];
    } else {
        if (!doc.views) doc.views = 1;
        else doc.views++;
        return [doc, doc.views + ""];
    }
}



exports.voteQuestion = function(doc, req) {
    if (!req.query.topic)      return [null, "Provide a topic"];
    if (!req.query.vote_type)  return [null, "Provide a vote type"];
    if (!req.query.vote_type === 'upvote' || !req.query.vote_type ==='downvote' || !req.query.type ==='removevote')  {
        return [null, "Provide a vote type of upvote, downvote, or removevote"];
    }
    if (!req.userCtx.name) return [null, "You must be logged in to vote."];

    var _id = common.voteId(req.query.topic, req.userCtx.name);
    if (_id !== req.id) return [null, "An invalid vote request"];

    if (!doc) {
        log('not doc');
        if (req.id) {
           if (req.query.vote_type === 'removevote') return [null, "A new vote cannot be a removevote"];
           //first vote
            var vote = {
                _id : _id,
                type : 'topic-vote',
                vote_type : req.query.vote_type,
                topic : req.query.topic,
                user : req.userCtx.name,
                timestamp: new Date().getTime()
            };
            log(vote);
            return [vote, common.voteSuccessMessage]
        }
    } else {
        // the id must match
        if (_id !== doc._id) return [null, "An invalid vote request"];
        if (doc.vote_type) doc.vote_type_prev = doc.vote_type;
        if (req.query.vote_type === 'removevote') doc._deleted = true;
        else doc.vote_type = req.query.vote_type;
        log(doc);
        return [doc, common.voteSuccessMessage];
    }
}

exports.voteAnswer = function(doc, req) {
    if (!req.query.topic)      return [null, "Provide a topic"];
    if (!req.query.answer)     return [null, "Provide an answer"];
    if (!req.query.vote_type)  return [null, "Provide a vote type"];
    if (!req.query.vote_type === 'upvote' || !req.query.vote_type ==='downvote' || !req.query.type ==='removevote')  {
        return [null, "Provide a vote type of upvote, downvote, or removevote"];
    }
    if (!req.userCtx.name) return [null, "You must be logged in to vote."];

    var _id = common.voteId(req.query.answer, req.userCtx.name);
    if (_id !== req.id) return [null, "An invalid vote request"];

    if (!doc) {
        log('not doc');
        if (req.id) {
           if (req.query.vote_type === 'removevote') return [null, "A new vote cannot be a removevote"];
           //first vote
            var vote = {
                _id : _id,
                type : 'answer-vote',
                vote_type : req.query.vote_type,
                topic : req.query.topic,
                answer: req.query.answer,
                user : req.userCtx.name,
                timestamp: new Date().getTime()
            };
            log(vote);
            return [vote, common.voteSuccessMessage]
        }
    } else {
        // the id must match
        if (_id !== doc._id) return [null, "An invalid vote request"];
        if (doc.vote_type) doc.vote_type_prev = doc.vote_type;
        if (req.query.vote_type === 'removevote') doc._deleted = true;
        else doc.vote_type = req.query.vote_type;
        log(doc);
        return [doc, common.voteSuccessMessage];
    }
}
