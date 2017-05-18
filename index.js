/**
 * This parser is designed to run in a Google cloud function, receiving log messages from
 * Pub/Sub, parsing the log, then uploading the data to BigQuery
 *
 * authored by: Dayne Jones, May 2017
 */
'use strict';

const bigquery = require('@google-cloud/bigquery')();
const url = require('url');
const uuid = require('uuid');

/**
 * Helper method to get a handle on a BigQuery table. Automatically creates the
 * dataset and table if necessary.
 */
function getTable () {
  const dataset = bigquery.dataset('parsedPixel');

  return dataset.get({ autoCreate: true })
    .then(([dataset]) => dataset.table('pixel').get({ autoCreate: true }));
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event The Cloud Functions event.
 */
exports.parse = function parse(event) {
  // The Cloud Pub/Sub Message object.
  const pubsubMessage = event.data;
  const requestData = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
  const requestUrl = requestData.httpRequest.requestUrl;
  const VALID_ATTRIBUTES = ['order_id', 'type', 'user_id'];
  const url_parts = url.parse(requestUrl, true);
  const query = url_parts.query;
  const user_id = query.user_id;

  if (!user_id) {
    console.log('user_id was not passed, pixel data not tracked');
    console.log(`request url was ${requestUrl}`);
    return false;
  }

  for (var key in query) {
    if (VALID_ATTRIBUTES.indexOf(key) === -1) {
      delete query[key];
    }
  }

  return getTable()
    .then(([table]) => {
      const unixTimestamp = new Date().getTime() * 1000;
      const date = new Date();
      const suffix = `_${user_id}_${date.getMonth() + 1}_${date.getDate()}_${date.getFullYear()}`;
      const options = {
        raw: true,
        templateSuffix: suffix
      };
      let row = {
        insertId: suffix,
        json: query
      }
      return table.insert(row, options);
    })
    .then((data) => console.log(data))
    .catch((err, apiResponse) => {
      console.log(`Job failed. Errors: ${err.errors[0].errors}`);
      return Promise.reject(err);
    });
};
