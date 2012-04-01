var topics = require('lib/ui/topics');
var session = require('session');
var $ = require('jquery');



var routes = {
  '/topics'   : topics.show,
  '/topics/new' : topics.new,
  '/topics/:id/:slug' : topics.single
};

var router = Router(routes);
router.init('/topics');

topics.on('route', function(route) {
    router.setRoute(route);
})

topics.on('login-show', function() {
    //topbar.showDropDown();
})

session.on('change', function (userCtx) {
    var req = { userCtx : userCtx };
    if (isUser(req)) {
        $('.loggedin').show();
        $('.loggedout').hide();
    } else {
        $('.loggedin').hide();
        $('.loggedout').show();
    }
});



function isUser(req) {
    if (!req.userCtx) return false;
    if (!req.userCtx.name) return false;
    return true;
}
