
var _ = require('underscore')._;


exports.bumpVotes = function(doc, req) {
    if (!doc) {
        return [null, "Need an existing doc"];
    } else {
        if (!doc.votes) doc.votes = 1;
        else doc.votes++;
        return [doc, doc.votes + ""];
    }
}

exports.bumpViews = function(doc, req) {
    if (!doc) {
        return [null, "Need an existing doc"];
    } else {
        if (!doc.views) doc.views = 1;
        else doc.views++;
        return [doc, doc.views + ""];
    }
}
