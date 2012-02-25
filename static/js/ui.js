require('kanso-topbar').init();
var topics = require('lib/ui/topics');



var routes = {
  '/topics'   : topics.show,
  '/topics/new' : topics.new
};

var router = Router(routes);
router.init('/topics');

