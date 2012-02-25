var gravatar = require('gravatar');

exports.getGravatar = function(userCtx, size) {
    if (!size) size = 16

    return gravatar.avatarURL({
        email : userCtx.name,
        size : size,
        default_image : 'mm'
    });
}