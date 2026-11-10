const Datastore = require('@seald-io/nedb');
const path      = require('path');

const dir = __dirname;

// One file per collection — auto-created on first use
const visits   = new Datastore({ filename: path.join(dir, 'visits.db'),   autoload: true });
const requests = new Datastore({ filename: path.join(dir, 'requests.db'), autoload: true });
const reports  = new Datastore({ filename: path.join(dir, 'reports.db'),  autoload: true });

// Auto-compact every 10 minutes to keep file sizes trim
visits.setAutocompactionInterval(10 * 60 * 1000);
requests.setAutocompactionInterval(10 * 60 * 1000);
reports.setAutocompactionInterval(10 * 60 * 1000);

module.exports = { visits, requests, reports };
