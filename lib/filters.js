
exports.topcEvents = function(doc, req) {
    if (doc.topic !== req.query.topic) return false;
    return true;
}
