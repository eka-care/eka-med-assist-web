#!/bin/bash

# Configuration - Update these values
ENV="dev"
BUCKET_NAME="m-prod-medassist"
REGION="ap-south-1"
tag="$ENV-1.0.5"

echo "🚀 Deploying Eka Medical Assistant Widget to AWS..."

rm -rf dist/

yarn build

cd dist
aws s3 cp widget.js s3://$BUCKET_NAME/main/apollo/widget-$tag.js
aws s3 cp assets/widget.css s3://$BUCKET_NAME/main/apollo/widget-$tag.css
aws s3 sync assets/ s3://$BUCKET_NAME/main/apollo/assets/

echo "Uploaded widget.js, assets/widget.css and entire assets folder to S3"

# Save S3 URLs in variables
WIDGET_JS_URL="https://med-assist-agent.eka.care/apollo/widget-$tag.js"
WIDGET_CSS_URL="https://med-assist-agent.eka.care/apollo/widget-$tag.css"

echo "widget.js $WIDGET_JS_URL"
echo "assets/widget.css $WIDGET_CSS_URL"

cd ../
# now update the widget-loader.js with the new urls
sed -i '' "s|scriptUrl:.*|scriptUrl: \"$WIDGET_JS_URL\",|g" public/widget-loader.js
sed -i '' "s|cssUrl:.*|cssUrl: \"$WIDGET_CSS_URL\",|g" public/widget-loader.js

yarn build

cd dist
aws s3 cp widget-loader.js s3://$BUCKET_NAME/main/apollo/widget-loader-$tag.js

echo "Uploaded widget-loader.js to S3"


# Update widget-test.html with the latest tag
cd ../
sed -i '' "s|src=\"[^\"]*\"|src=\"https://med-assist-agent.eka.care/apollo/widget-loader-$tag.js\"|g" public/widget-test.html

echo "Updated widget-test.html with latest tag: $tag"

yarn build

echo "✅ Deployment completed successfully!"