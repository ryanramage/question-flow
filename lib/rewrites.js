/**
 * Rewrite settings to be exported from the design doc
 */

module.exports = [
    {from: '/static/*', to: 'static/*'},
    {from: '/modules.js', to: 'modules.js' },

    {"from": "/_db/*", "to": "../../*" },
    {"from": "/_db", "to": "../.." },
    {from: '/', to: 'index.html'},
    {"from" : '/topic/:id', to: '_list/topicDetails/allTopicAssets', query: {include_docs : 'true', startkey : [':id'], endkey : [':id', {}]}},
    {from: '*', to: '_show/not_found'}
];