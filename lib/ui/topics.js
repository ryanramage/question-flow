$ = require('jquery');
var _ = require('underscore')._;
var handlebars = require('handlebars');
var db = require('db').use('_db');
var showdown = require('../showdown-wiki');
var moment = require('../moment');
var common = require('../common');
var session = require("session");

var events = require('events');
var exports = module.exports = new events.EventEmitter();

var currentContext;

session.on('change', function (userCtx) {
    currentContext = userCtx;
});

function findBestTag(tags) {

    if (!tags || tags.length == 0) return null;
    if (tags.length == 1) return tags[0];
    // in the future, we can query to find the smallest tag set.
    return tags[0];
}
function findExtraKeys(tags, bestTag) {
    if (!tags || tags.length == 0) return null;
    if (tags.length == 1) return null;
    var extraKeys = [];
    for (var i=0; i < tags.length; i++) {
        var tag = tags[i];
        if (tag != bestTag) extraKeys.push(tag);
    }
    return extraKeys;
}

exports.findTopics = function(tags, sort, callback) {
    if (!sort) sort = 0;

    if (!tags) {
        db.getView('topicflow', 'unfiltered', {
            startkey : [sort, {}],
            endkey : [sort],
            descending : true,
            include_docs : true,
            reduce: false
        }, callback);
    } else {

        var tag = findBestTag(tags);
        var options = {
            startkey : [tag, sort, {}],
            endkey : [tag, sort],
            descending : true,
            include_docs : true,
            reduce: false

        };

        var extra_keys = findExtraKeys(tags, tag);
        if (extra_keys) {
            options.extra_keys = JSON.stringify(extra_keys);
        }
        db.getList('topicflow', 'intersection', 'byTag', options, callback);

    }
}
exports.topicSummaries = function(topicIds, callback) {
    db.getView('topicflow', 'topicSummary', {
        keys : topicIds,
        group: true
    }, callback);
}

exports.allTopicAssets = function(id, callback) {
    db.getView('topicflow', 'allTopicAssets', {
        startkey : [id],
        endkey : [id, {}],
        include_docs : true
    }, callback);
}

exports.topicSummary = function(topic_id, callback) {
    db.getView('topicflow', 'topicSummary', {
            key: topic_id,
            reduce: true
    }, callback);
}




exports.show = function() {
    $('.main').html(handlebars.templates['topic-summary.html']({}, {}));
    exports.findTopics(null, null, function(err, data) {
        var topicIds = [];
        _.each(data.rows, function(row) {
            var topicDoc = row.doc;
            topicIds.push(topicDoc._id);
            topicDoc.timestamp_formatted = moment(topicDoc.timestamp).fromNow();
            topicDoc.gravatar_url = common.getGravatar({name: topicDoc.user}, 32);
            $('.topics').append(handlebars.templates['topic-row.html'](topicDoc, {}));
        });
        exports.topicSummaries(topicIds, function(err, summaries) {
            _.each(summaries.rows, function(summary) {

                var upvotes   = summary.value.upvotes;
                var downvotes = summary.value.downvotes;
                var voteTotal = upvotes + (downvotes * -1);
                $('#' + summary.key + ' .votes .mini-counts')
                    .data('upvotes', upvotes)
                    .data('downvotes', downvotes)
                    .text(voteTotal);
                $('#' + summary.key + ' .answers .mini-counts').text(summary.value.answers);
            });
        })
    })
}

function render() {
     $('.preview').html(showdown.convert($('#topicText').val()));
}

exports.createSlug = function(title) {
    return title.toLowerCase().replace(/ /g, '_').replace(/\W/g, '');
}

exports.createTopic = function(user, title, text, tags, topicOptions, callback) {
    var slug = exports.createSlug(title);
    tags = tags || [];
    topicOptions = topicOptions || {};
    var timestamp = new Date().getTime();
    var topicDoc = {
        slug : slug,
        type: 'topic',
        title: title,
        text : text,
        tags : tags,
        user : user,
        topicOptions : topicOptions,
        views : 0,
        timestamp : timestamp
    };
    exports.validateTopic(topicDoc, function(err) {
        if (err) callback(err, null);
        db.saveDoc(topicDoc, function(err, resp) {
            topicDoc._id = resp.id;
            topicDoc._rev = resp.rev;
            callback(null, topicDoc);
        });
    })
}

exports.validateTopic = function(topicDoc, callback) {
    if (!topicDoc.user) callback('A user is required');
    callback(null);
}



exports.new = function() {
    $('.main').html(handlebars.templates['topic-new.html']({}, {}));
    var t_render = _.throttle(render, 100);
    $('#topicText').on('keyup change blur', t_render);

    if (!currentContext || !currentContext.name) {
        $('.login-please').show();
    }
    $('.login-action').on('click', function(){
        exports.emit('login-show');
        return false;
    });

    $('.create').on('click', function() {
        exports.createTopic(
            currentContext.name,
            $('#new-topic-title').val(),
            $('#topicText').val(),
            [],
            {},
            function(err, topicDoc) {
                exports.emit('route', '/topics/' + topicDoc._id + '/' + topicDoc.slug);
                return false;
            }
        );
        return false;
    })
    $('.cancel').on('click', function() {
        exports.emit('route', '/topics');
        return false;
    })
}

exports.bumpViews = function(id, callback, error) {
    $.post('_db/_design/topicflow/_update/bumpViews/' + id, function(result) {
        callback(result);
    })
}

function voteQuestion(id, user, vote_type, callback) {
    var vote_hash = common.voteId(id, user);
    $.ajax({
        url :  '_db/_design/topicflow/_update/voteQuestion/' + vote_hash + '?topic=' + id + '&vote_type=' + vote_type,
        type: 'PUT',
        success : function(result) {
            var err = null;
            if (result !== common.voteSuccessMessage) {
                err = result;
            }
            callback(err, result);
        },
        error : function() {
            callback('Unable to cast vote.')
        }
    });
}

exports.upvoteQuestion = function(id, user, callback) {
    voteQuestion(id, user, 'upvote', callback);
}

exports.downvoteQuestion = function(id, user, callback) {
    voteQuestion(id, user, 'downvote', callback);
}
exports.removevoteQuestion = function(id, user, callback) {
    voteQuestion(id, user, 'removevote', callback);
}

function promptLogin() {
    if (!currentContext || currentContext.name === null) {
        exports.emit('login-show');
        return true;
    }
    return false;
}


exports.single = function(id, slug) {
    exports.bumpViews(id, function(newCount) {
        exports.allTopicAssets(id, function(err, data) {
            var topic = data.rows[0].doc;
            topic.views = newCount;
            topic.text_showdown = showdown.convert(topic.text);
            topic.timestamp_date_formatted = moment(topic.timestamp).format("MMM D 'YY \\at HH:MM");
            topic.timestamp_formatted = moment(topic.timestamp).fromNow();
            topic.gravatar_url = common.getGravatar({name: topic.user}, 32);

            $('.main').html(handlebars.templates['topic-show.html'](topic, {}));
            var topicChanges = _.tail(data.rows);
            handleDisplay(topicChanges, false);

            exports.topicSummaries([id], function(err, summaries) {
                var summary = summaries.rows[0].value;
                showSummary(summary);
            });


            // subscribe to changes
            db.changes({filter: 'topicflow/topcEvents', topic: id, include_docs: true}, function(err, resp){
                if (err) console.log(err);
                handleDisplay(resp.results, true);
            })



            $('.topic-show .upvote').on('click', function() {
                if (!promptLogin()) {
                    if ($('.topic-show .upvote').hasClass('myvote')) {
                        exports.removevoteQuestion(id, currentContext.name, function (err, data) {
                            if (err) return alert(err);
                        });
                    } else {
                        exports.upvoteQuestion(id, currentContext.name, function (err, data) {
                            if (err) return alert(err);
                        });
                    }
                }
            });
            $('.topic-show .downvote').on('click', function() {
                if (!promptLogin()) {
                    if ($('.topic-show .downvote').hasClass('myvote')) {
                        exports.removevoteQuestion(id, currentContext.name, function (err, data) {
                            if (err) return alert(err);
                        });
                    } else {
                        exports.downvoteQuestion(id, currentContext.name, function (err, data) {
                            if (err) return alert(err);
                        });
                    }
                }
            });
            $('.help').tooltip();

        })
    });
}

function showSummary(summary) {
    var currentQuestionUpvotes   = summary.upvotes;
    var currentQuestionDownvotes = summary.downvotes;
    var votesTotal = currentQuestionUpvotes + (currentQuestionDownvotes * -1);
    console.log(currentQuestionUpvotes, currentQuestionDownvotes, votesTotal);
    $('.question_total')
        .data('upvotes', currentQuestionUpvotes)
        .data('downvotes', currentQuestionDownvotes)
        .text(votesTotal);
}

function showVoteChange(assetDoc) {
    exports.topicSummaries([assetDoc.topic], function(err, summaries) {
        var summary = summaries.rows[0].value;
        showSummary(summary);
    });

}

function handleDisplay(topicAssets, fromChangeFeed) {
    var upvotechanges   = 0;
    var downvotechanges = 0;
    _.each(topicAssets, function(asset) {

        var assetDoc = asset.doc; // in case we have to normalize between inital load and changes
        if (assetDoc.type === 'answer') showAnswer(assetDoc);
        if (assetDoc.type === 'comment') showComment(assetDoc);
        if (assetDoc.type === 'topic-vote') {
            console.log(assetDoc, currentContext);
            if (fromChangeFeed) showVoteChange(assetDoc);
            if (currentContext && currentContext.name === assetDoc.user) {
               var myvote = null
               if (!assetDoc._deleted) myvote = assetDoc.vote_type;
               showMyVote(myvote);
            }
        }
        if (assetDoc.type === 'answer-vote')  {

        }
        if (assetDoc.type === 'comment-vote') {

        }
    });
}

function showMyVote(myvote) {
    console.log(myvote);
    $('.topic-show .downvote').removeClass('myvote');
    $('.topic-show .upvote').removeClass('myvote');
    if (myvote === 'upvote') $('.topic-show .upvote').addClass('myvote');
    if (myvote === 'downvote') $('.topic-show .downvote').addClass('myvote');

}


function showAnswer(answer) {

}

function showComment(comment) {

}