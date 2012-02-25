var session = require('session'),
    $ = require('jquery'),
    db = require('db');


exports.init = function () {
    $('#kanso-topbar').html(
        '<a title="Dashboard" class="kanso-topbar-home-icon" href="/">' +
          'Dashboard' +
        '</a>' +
        ($('#kanso-topbar').html() || '') +
        '<div id="kanso-topbar-session">' +
        '</div>'
    );
    session.info(function (err, info) {
        if (err) {
            console.error(err);
        }
        exports.updateSession(info.userCtx);
    });
    exports.checkDashboardURLs();
};


exports.checkDashboardURLs = function () {
    var durl = '/dashboard/_design/dashboard/_rewrite/';
    exports.checkDashboardURL('/', function (err, exists) {
        if (exists) {
            // give dashboard at root url priority
            return;
        }
        exports.checkDashboardURL(durl, function (err, exists) {
            if (exists) {
                $('#kanso-topbar .kanso-topbar-home-icon').attr({
                    href: durl
                });
            }
        });
    });
};


exports.checkDashboardURL = function (url, callback) {
    db.request({
        url: url.replace(/\/$/,'') + '/_info',
    },
    function (err, data) {
        return callback(err, data && data.dashboard)
    });
};


exports.updateSession = function (userCtx) {
    $('#kanso-topbar-session').html(
      (userCtx.name ?
        '<span class="username">' + userCtx.name + '</span>':
        ''
      ) +
      '<ul>' +
      (userCtx.name ?
        '<li class="kanso-topbar-logout"><a href="#">Logout</a></li>':
        '<li class="kanso-topbar-login"><a href="#">Login</a></li>'
      ) +
      '</ul>' +

      '<div id="kanso-topbar-login-dropdown" style="display: none">' +
        '<form action="" method="POST">' +
          '<div class="kanso-topbar-general-errors"></div>' +
          '<div class="kanso-topbar-username kanso-topbar-field">' +
            '<label for="kanso-topbar-login-name">Username</label>' +
            '<input id="kanso-topbar-login-name" name="name" ' +
                    'type="text">' +
            '<div class="kanso-topbar-errors"></div>' +
          '</div>' +
          '<div class="kanso-topbar-password kanso-topbar-field">' +
            '<label for="kanso-topbar-login-password">Password</label>' +
            '<input id="kanso-topbar-login-password" ' +
                   'name="password" type="password">' +
            '<div class="kanso-topbar-errors"></div>' +
          '</div>' +
          '<div class="kanso-topbar-clear kanso-topbar-spinner" ' +
               'style="display: none;"></div>' +
          '<div class="kanso-topbar-actions">' +
            '<input type="submit" id="kanso-topbar-login-login" ' +
                   'value="Login">' +
            '<input type="button" id="kanso-topbar-login-cancel" ' +
                   'value="Cancel">' +
          '</div>' +
          '<div class="kanso-topbar-clear"></div>' +
        '</form>' +
      '</div>'
    );
    exports.bindSession();
};
// re-draw topbar session pane on session change
session.on('change', exports.updateSession);


exports.clearErrors = function (form) {
    $('.kanso-topbar-general-errors', form).text('');
    $('.kanso-topbar-username .kanso-topbar-errors', form).text('');
    $('.kanso-topbar-username', form).removeClass(
        'kanso-topbar-validation-error'
    );
    $('.kanso-topbar-password .kanso-topbar-errors', form).text('');
    $('.kanso-topbar-password').removeClass('kanso-topbar-validation-error');
};


exports.showDropDown = function () {
    $('#kanso-topbar-session .kanso-topbar-login').addClass('active');
    $('#kanso-topbar-login-dropdown').show();
    $('#kanso-topbar-login-dropdown input[name="name"]').focus().select();
};


exports.hideDropDown = function () {
    $('#kanso-topbar-session .kanso-topbar-login').removeClass('active');
    $('#kanso-topbar-login-dropdown').hide();
    exports.clearErrors();
};


exports.toggleDropDown = function () {
    if ($('#kanso-topbar-session .kanso-topbar-login').hasClass('active')) {
        exports.hideDropDown();
    }
    else {
        exports.showDropDown();
    }
};


exports.bindSession = function () {
    $('#kanso-topbar-session .kanso-topbar-logout a').click(function (ev) {
        ev.preventDefault();
        session.logout();
        return false;
    });
    $('#kanso-topbar-session .kanso-topbar-login a').click(function (ev) {
        ev.preventDefault();
        exports.toggleDropDown();
        return false;
    });
    $('#kanso-topbar-login-cancel').click(function (ev) {
        exports.hideDropDown();
    });
    $('#kanso-topbar-login-dropdown form').submit(function (ev) {
        ev.preventDefault();
        var form = this;
        var spinner_elt = $('.kanso-topbar-spinner', form).show();
        var username = $('input[name="name"]', form).val();
        var password = $('input[name="password"]', form).val();
        exports.clearErrors(form);
        if (!username) {
            $('.kanso-topbar-username .kanso-topbar-errors', form).text(
                'Please enter a username'
            );
            $('.kanso-topbar-username').addClass(
                'kanso-topbar-validation-error'
            );
        }
        if (!password) {
            $('.kanso-topbar-password .kanso-topbar-errors', form).text(
                'Please enter a password'
            );
            $('.kanso-topbar-password').addClass(
                'kanso-topbar-validation-error'
            );
        }
        if (username && password) {
            session.login(username, password, function (err) {
                if (err) {
                    $('.kanso-topbar-general-errors', form).text(
                        err.toString()
                    );
                    spinner_elt.hide();
                }
            });
        } else {
            spinner_elt.hide();
        }
        return false;
    });
};
