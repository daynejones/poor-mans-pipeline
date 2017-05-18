# Poor Man's Data Pipeline

## Architecture
![Imgur](http://imgur.com/jQi50rm.jpg)

1. **Ingest**

	The ingest starts as an HTTP request for a 1x1 png image. Something like this: http://track.domain.com/pixel.png?user_id=507f1f77bcf86cd799439011&order_id=507f1f77bcf86cd799439011&type=click

	This request is directed to Google Cloud's HTTP load balancer. The 1x1 png is served from the CDN, the request is logged, and the log message is published to a Pub/Sub topic. The entire log message ends up in Pub/Sub but the most important part is the URL since it contains the parameters we are interested in tracking.

2. **Process**

	A Google cloud function is subscribed to the Pub/Sub topic where the log messages are streaming. Every time a log message is published, the cloud function runs with that message as an input.

	This function is simple. It parses the request url, extracts the important parameters, and uploads the result to BigQuery.

3. **Store**

	BigQuery stores all event data. The data is partitioned both by user id and date. When a query is performed against BigQuery, costs will remain low because each of these datasets is much smaller and quicker to query.

## Setup Instructions

## Usage
Just fire a request to the URL as configured in the load balancer, something like: http://track.domain.com/pixel.png using query string parameters that you've setup.
