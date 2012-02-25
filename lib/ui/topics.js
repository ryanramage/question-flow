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


exports.show = function() {
    $('.main').html(handlebars.templates['topic-summary.html']({}, {}));
    exports.findTopics(null, null, function(err, data) {
        _.each(data.rows, function(row) {
            var topicDoc = row.doc;
            topicDoc.timestamp_formatted = moment(topicDoc.timestamp).fromNow();
            topicDoc.gravatar_url = common.getGravatar({name: topicDoc.user}, 32);
            $('.topics').append(handlebars.templates['topic-row.html'](topicDoc, {}));
        });
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

