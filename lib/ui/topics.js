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

if (window.humane) {
    window.alert = function(msg) {
        window.humane.info(msg);
    }
}



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

    $.ajax({
        url :  'topic/' + id,
        dataType : 'json',
        success : function(data) {
            callback(null, data)
        },
        error : function() {
            callback('error getting topic data');
        }
    });
}

exports.topicSummary = function(topic_id, callback) {
    db.getView('topicflow', 'topicSummary', {
            key: topic_id,
            reduce: true
    }, callback);
}




exports.show = function() {
    $('.main').html(handlebars.templates['topic-summary.html']({}, {}));
    console.log('show me the money');

    exports.findTopics(null, null, function(err, data) {
        var topicIds = [];
        _.each(data.rows, function(row) {
            var topicDoc = row.doc;
            topicIds.push(topicDoc._id);
            topicDoc.timestamp_formatted = moment(topicDoc.timestamp).fromNow();
            topicDoc.gravatar_url = common.getGravatar({name: topicDoc.user}, 32);
            topicDoc.short_text = topicDoc.text.substring(0, 200);
            if (topicDoc.text.length > 200) topicDoc.short_text += '...';

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

exports.createAnswer = function(topicId, user, text, callback) {
    var timestamp = new Date().getTime();
    var answerDoc = {
        type: 'answer',
        topic: topicId,
        text : text,
        user : user,
        timestamp : timestamp
    };
    exports.validateAnswer(answerDoc, function(err) {
        if (err) callback(err, null);
        db.saveDoc(answerDoc, function(err, resp) {
            answerDoc._id = resp.id;
            answerDoc._rev = resp.rev;
            callback(null, answerDoc);
        });
    })
}

exports.validateAnswer = function(answerDoc, callback) {
    if (!answerDoc.user) callback('A user is required');
    callback(null);
}


exports.new = function() {
    $('.main').html(handlebars.templates['topic-new.html']({}, {}));



    var t_render = _.throttle(render, 100);
    $('#topicText').on('keyup change blur', t_render);

    $('form').sisyphus({ customKeyPrefix: 'newTopic', onRestore: t_render});

    session.info(function(err, resp) {
        currentContext = resp.userCtx;
        if (!currentContext || !currentContext.name) {
            $('.login-please').show();
            $('.login-action').on('click', function(){
                var login = $('#dashboard-topbar-session').data('login') + '?redirect=' + encodeURIComponent(window.location) ;
                window.location = login;
                return false;
            });
        } else {
            $('.form-actions').show();
        }

    });


    $('.create').on('click', function() {
        exports.createTopic(
            currentContext.name,
            $('#new-topic-title').val(),
            $('#topicText').val(),
            [],
            {},
            function(err, topicDoc) {
                $('form')[0].reset();
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

function voteAnswer(question_id, answer_id, user, vote_type, callback) {
    var vote_hash = common.voteId(answer_id, user);
    $.ajax({
        url :  '_db/_design/topicflow/_update/voteAnswer/' + vote_hash + '?topic=' + question_id + '&answer=' + answer_id + '&vote_type=' + vote_type,
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

exports.upvoteAnswer = function(question_id, answer_id, user, callback) {
    voteAnswer(question_id, answer_id, user, 'upvote', callback);
}

exports.downvoteAnswer = function(question_id, answer_id, user, callback) {
    voteAnswer(question_id, answer_id, user, 'downvote', callback);
}
exports.removevoteAnswer = function(question_id, answer_id, user, callback) {
    voteAnswer(question_id, answer_id, user, 'removevote', callback);
}


function promptLogin() {
    if (!currentContext || currentContext.name == null) {
        humane.info('Please login');
        return true;
    }
    return false;
}


exports.single = function(id, slug) {
    exports.bumpViews(id, function(newCount) {
        exports.allTopicAssets(id, function(err, data) {
            var topic = data[0];
            topic.views = newCount;
            topic.text_showdown = showdown.convert(topic.text);
            topic.timestamp_date_formatted = moment(topic.timestamp).format("MMM D 'YY \\at HH:MM");
            topic.timestamp_formatted = moment(topic.timestamp).fromNow();
            topic.gravatar_url = common.getGravatar({name: topic.user}, 32);

            $('.main').html(handlebars.templates['topic-show.html'](topic, {}));
            handleDisplay(data, false);

            var summary = data[data.length - 1];
            showSummary(summary.topic_votes);
            showMyVote(summary.topic_votes.myvote);

            showAnswerVotes(summary.answer_votes);



            // subscribe to changes
            db.changes({filter: 'topicflow/topcEvents', topic: id, include_docs: true}, function(err, resp){
                if (err) console.log(err);
                handleDisplay(resp.results, true);
            })



            $('.topic-show .question .upvote').on('click', function() {
                if (promptLogin()) return ;
                if ($('.topic-show .question .upvote').hasClass('myvote')) {
                    exports.removevoteQuestion(id, currentContext.name, function (err, data) {
                        if (err) return alert(err);
                    });
                } else {
                    exports.upvoteQuestion(id, currentContext.name, function (err, data) {
                        if (err) return alert(err);
                    });
                }

            });
            $('.topic-show .question .downvote').on('click', function() {
                if (promptLogin()) return ;
                if ($('.topic-show .question .downvote').hasClass('myvote')) {
                    exports.removevoteQuestion(id, currentContext.name, function (err, data) {
                        if (err) return alert(err);
                    });
                } else {
                    exports.downvoteQuestion(id, currentContext.name, function (err, data) {
                        if (err) return alert(err);
                    });
                }
            });
            $('.help').tooltip();
            var t_render = _.throttle(render, 100);

            $('form')
                .sisyphus({ customKeyPrefix: id  , onRestore: t_render})
                ;
            $('#topicText').on('keyup change blur', t_render);
            $('.topic-show .post-answer').on('click', function(){
                try {
                    if (promptLogin()) return false;
                    exports.createAnswer(id,  currentContext.name, $('#topicText').val(), function(err, resp) {
                        $('.your-answer').hide();
                        $('form')[0].reset();
                    });
                } catch(ignore){}
                return false;
            })
        })
    });
}

function showSummary(summary) {
    var currentQuestionUpvotes   = summary.upvotes;
    var currentQuestionDownvotes = summary.downvotes;
    var votesTotal = currentQuestionUpvotes + (currentQuestionDownvotes * -1);
    $('.question .question_total')
        .data('upvotes', currentQuestionUpvotes)
        .data('downvotes', currentQuestionDownvotes)
        .text(votesTotal);
}

function showAnswerVotes(answer_votes) {
    var answer_ids = _.keys(answer_votes);
    _.each(answer_ids, function(answer_id){
        var currentQuestionUpvotes   = answer_votes[answer_id].upvotes;
        var currentQuestionDownvotes = answer_votes[answer_id].downvotes;
        var votesTotal = currentQuestionUpvotes + (currentQuestionDownvotes * -1);
        $('.answer.'+ answer_id +' .question_total')
               .data('upvotes', currentQuestionUpvotes)
               .data('downvotes', currentQuestionDownvotes)
               .text(votesTotal);
        if (answer_votes[answer_id].myvote) {
            var myvote = answer_votes[answer_id].myvote;
            showMyVoteAnswer(myvote, answer_id);
        }
    });
}


function showVoteChange(assetDoc) {
    exports.topicSummaries([assetDoc.topic], function(err, summaries) {
        var summary = summaries.rows[0].value;
        showSummary(summary);
    });

}

function showAnswerVoteChange(assetDoc) {

    db.getView('topicflow', 'voteSummary', {
        startkey : [assetDoc.answer],
        endkey : [assetDoc.answer, {}],
        group: true,
        group_level : 2
    }, function(err, data) {
        if (err) return console.log('cant update votes');
        var currentQuestionUpvotes   = 0;
        var currentQuestionDownvotes = 0;
        _.each(data.rows, function(row) {
           if(row.key[1] == 'upvote') currentQuestionUpvotes = row.value;
           if(row.key[1] == 'downvote') currentQuestionDownvotes = row.value;
        });
        var votesTotal = currentQuestionUpvotes + (currentQuestionDownvotes * -1);
        $('.answer.'+ assetDoc.answer +' .question_total')
               .data('upvotes', currentQuestionUpvotes)
               .data('downvotes', currentQuestionDownvotes)
               .text(votesTotal);
    });


}

function handleDisplay(topicAssets, fromChangeFeed) {
    var upvotechanges   = 0;
    var downvotechanges = 0;
    _.each(topicAssets, function(asset) {

        var assetDoc = asset;
        if (asset.doc) {
            assetDoc = asset.doc; // in case we have to normalize between inital load and changes
        }
        if (assetDoc.type === 'answer') showAnswer(assetDoc);
        if (assetDoc.type === 'comment') showComment(assetDoc);
        if (assetDoc.type === 'topic-vote') {
            if (fromChangeFeed) showVoteChange(assetDoc);
            if (currentContext && currentContext.name === assetDoc.user) {
               var myvote = null
               if (!assetDoc._deleted) myvote = assetDoc.vote_type;
               showMyVote(myvote);
            }
        }
        if (assetDoc.type === 'answer-vote')  {
            if (fromChangeFeed) showAnswerVoteChange(assetDoc);
            if (currentContext && currentContext.name === assetDoc.user) {
               var myvote = null
               if (!assetDoc._deleted) myvote = assetDoc.vote_type;
               showMyVoteAnswer(myvote, assetDoc.answer);
            }
        }
        if (assetDoc.type === 'comment-vote') {

        }
    });
}

function showMyVote(myvote) {
    $('.question .downvote').removeClass('myvote');
    $('.question .upvote').removeClass('myvote');
    if (myvote === 'upvote') $('.question .upvote').addClass('myvote');
    if (myvote === 'downvote') $('.question .downvote').addClass('myvote');

}

function showMyVoteAnswer(myvote, answer_id) {
    $('.answer.'+ answer_id +'  .downvote').removeClass('myvote');
    $('.answer.'+ answer_id +' .upvote').removeClass('myvote');
    if (myvote === 'upvote') $('.answer.'+ answer_id +'  .upvote').addClass('myvote');
    if (myvote === 'downvote') $('.answer.'+ answer_id +'  .downvote').addClass('myvote');
}


function showAnswer(answer) {

    answer.text_showdown = showdown.convert(answer.text);
    answer.timestamp_date_formatted = moment(answer.timestamp).format("MMM D 'YY \\at HH:MM");
    answer.timestamp_formatted = moment(answer.timestamp).fromNow();
    answer.gravatar_url = common.getGravatar({name: answer.user}, 32);
    $('.answers-section-content ').append(handlebars.templates['topic-answer.html'](answer, {}));

    $('.' + answer._id + ' .upvote').on('click', function() {
        if (promptLogin()) return ;
        if ($('.' + answer._id + ' .upvote').hasClass('myvote')) {
            exports.removevoteAnswer(answer.topic, answer._id, currentContext.name, function (err, data) {
                if (err) return alert(err);
            });
        } else {
            exports.upvoteAnswer(answer.topic, answer._id, currentContext.name, function (err, data) {
                if (err) return alert(err);
            });
        }

    });
    $('.' + answer._id + ' .downvote').on('click', function() {
        if (promptLogin()) return ;
        if ($('.' + answer._id + ' .downvote').hasClass('myvote')) {
            exports.removevoteAnswer(answer.topic, answer._id, currentContext.name, function (err, data) {
                if (err) return alert(err);
            });
        } else {
            exports.downvoteAnswer(answer.topic, answer._id, currentContext.name, function (err, data) {
                if (err) return alert(err);
            });
        }
    });

}

function showComment(comment) {

}