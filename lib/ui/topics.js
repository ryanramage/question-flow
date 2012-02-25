$ = require('jquery');
var _ = require('underscore')._;
var handlebars = require('handlebars');
var db = require('db').use('_db');
var showdown = require('../showdown-wiki');



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
        console.log(data);
    })
}

function render() {
    console.log(showdown);
     $('.preview').html(showdown.convert($('#topicText').val()));
}

exports.new = function() {
    $('.main').html(handlebars.templates['topic-new.html']({}, {}));

    var t_render = _.throttle(render, 100);
    $('#topicText').on('keyup change blur', t_render);


}

