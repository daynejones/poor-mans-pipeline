# Poor Man's Data Pipeline

## Motivation
Tasked with writing a proof of concept data pipeline, I was overwhelmed with the options on the market. This simple data pipeline sits on Google Cloud Platform, captures events using a simple tracking pixel, processes, and stores the data in near real time, and requires no ops. It was partially inspired by [this project](https://cloud.google.com/solutions/serverless-pixel-tracking-tutorial) on Google's own site.

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
### Prerequisites:
1. A working Google Cloud Platform account that can enable services. You are responsible for whatever charges you incur.

### Instructions:
#### Google cloud storage
Google Cloud Storage holds pixel.png file for us, nothing else.

1. In Google Cloud Storage, create a new bucket and remember the name.
2. Click "edit bucket permissions" and create new read permissions for a user called "allUsers". It will look like this: ![](http://imgur.com/f62uAUF.jpg)
2. Upload the pixel.png from this repository to your new bucket.
3. Click the checkbox under "share publicly" so your image can be served publicly.
![](http://imgur.com/EcKLZjy.jpg)

#### Load Balancer
The Load Balancer sits in front of pixel.png and logs all requests made to it. This is the entrypoint for data collection.

1. In Networking, click "Create Load Balancer".
2. Choose HTTP(S) Load Balancing
3. Setup a backend configuration to use a bucket, enabling cloud CDN like this:
![](http://imgur.com/bC7CscO.png)
4. Leave Host and path as well as the frontend as is unless you know you need further configuration. Here's my complete configuration:
![](http://imgur.com/9ZFh8UG.png)
5. Get the public IP of your load balancer for later use.

### Pub/Sub
Next up, you need to create a Pub/Sub topic that log messages can be published to.

1. Go to Pub/Sub and create a topic
2. Remember the name you chose
3. That's it

### StackDriver (Logs)
The next thing you need is to export logs that come from your load balancer and publish them to your Pub/Sub topic.

1. Go to Logging in the GCP menu.
2. In the filter input, click the dropdown and choose "Convert to advanced filter":
![](http://imgur.com/G2XViOj.png)
3. Add a filter to the input like this: `resource.type = http_load_balancer AND resource.labels.url_map_name = "[YOUR_LOAD_BALANCER_NAME]"`. This catches only logs that come from the load balancer you recently setup.
4. Click "Create Export" at the top of the page.
5. Choose Cloud Pub/Sub as the Sink Service and the topic you recently created.

### Big Query
To prepare for the next step, we need to create a BigQuery Table. This table will be used as a "template" for future tables that will be dynamically created.

1. In the GCP menu, open the BigQuery console.
2. Click Create new dataset and choose a name.
3. Create a new table called 'pixel' and give it a desired schema. Here's what mine looks like:
![](http://imgur.com/cemDPOk.png)

### Cloud Functions
Next up, we need to parse each log message that comes in and send them on to BigQuery.

1. Open up `index.js` from this repository.
2. Customize `DATASET` and `TABLE_NAME` according to the BigQuery dataset and table you just created.
2. Customize `VALID_ATTRIBUTES` according to the data you want to track. Any attribute here must be in the BigQuery schema you just created.
3. Spend a moment looking through the rest of the function. It's quite simple. The only non intuitive part is the `templateSuffix` we pass to BigQuery. This tells BigQuery to create a new table using the schema of the table name we passed but to append the value of `templateSuffix` to the end, thereby partitioning our data by whatever criteria we build into `templateSuffix`.
4. Deploy the function using the command found in `commands.txt`:
	`gcloud beta functions deploy parse --stage-bucket [any-title] --trigger-topic [your-topic]`
	stage-bucket simply tells GCP where to store your code. Just choose any unique name and GCP does the rest.
	

## Usage
At this point, you should have a working pipeline. Using the IP address of the load balancer, you can construct a URL like http://ip-address/pixel.png?param1=123&param2=foobar and send your users to it. It would be wise to setup DNS so you can use a better looking URL.

## Monitoring
GCP gives you an insight into each piece of this pipeline but the information is a bit scattered. There seems to be a basic "StackDriver" logging panel to give you some insight into your services, if you want more detail, you have to use the full StackDriver product or use the API to gather metrics.

Use the logging panel to see raw logs from the Load Balancer, BigQuery, and the Cloud Function. You can also tail your cloud function logs manually from the command line using the command supplied in `commands.txt`.

## License
This project is released under the [MIT License](https://opensource.org/licenses/MIT)