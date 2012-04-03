var topics = require('lib/ui/topics');
var session = require('session');
var $ = require('jquery');

$(function() {
    var routes = {

      '/topics/new' : topics.new,
      '/topics/:id/:slug' : topics.single,
        '/topics'   : topics.show
    };

    var router = Router(routes);
    router.init('/topics');

    topics.on('route', function(route) {
        router.setRoute(route);
    })

    topics.on('login-show', function() {
        //topbar.showDropDown();
    })



});



function isUser(req) {
    if (!req.userCtx) return false;
    if (!req.userCtx.name) return false;
    return true;
}
