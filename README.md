# AddShoppers Tracking Pixel

In order to keep track of various events that occur as shoppers are using the widget, we need an efficient mechanism for sending, recieving, processing, storing, and querying those events.

Meet the AddShoppers Tracking Pixel.

## Architecture
![Imgur](https://storage.googleapis.com/serverless-pixel/architecture.png)

1. **Ingest**

	The ingest starts as an HTTP request for a 1x1 png image. Something like this: http://track.addshoppers.com/pixel.png?user_id=507f1f77bcf86cd799439011&order_id=507f1f77bcf86cd799439011&type=click

	This request is directed to Google Cloud's HTTP load balancer. The 1x1 png is served from the CDN, the request is logged, and the log message is published to a Pub/Sub topic. The entire log message ends up in Pub/Sub but the most important part is the URL since it contains the parameters we are interested in tracking.

2. **Process**

	A Google cloud function is subscribed to the Pub/Sub topic where the log messages are streaming. Every time a log message is published, the cloud function runs with that message as an input.

	This function is simple. It parses the request url, extracts the important parameters, and uploads the result to BigQuery.

3. **Store**

	BigQuery stores all event data. The data is partitioned both by user id and date. When a query is performed against BigQuery, costs will remain low because each of these datasets is much smaller and quicker to query.

4. **Web Application**

	The dashboard backend can query directly against BigQuery to populate reports and power visualizations. [Big Query Views](https://cloud.google.com/bigquery/docs/views) and other measures will be utilized to keep repeat query costs free.


## Usage
Just fire a request to the following URL: http://track.addshoppers.com/pixel.png using tracking parameters as follows:

- user_id `string` - usersite_id or idshopper
- type `string` - type of event we are tracking
- TBD

