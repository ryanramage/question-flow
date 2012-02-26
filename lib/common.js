var gravatar = require('gravatar');

exports.getGravatar = function(userCtx, size) {
    if (!size) size = 16

    return gravatar.avatarURL({
        email : userCtx.name,
        size : size,
        default_image : 'mm'
    });
}

exports.userToHash = function(user) {
    return gravatar.hash(user);
}

exports.voteId = function(thing_id, user) {
    var userHash = exports.userToHash(user);
    return thing_id + '-' + userHash;
}

exports.voteSuccessMessage = 'Vote Success.';