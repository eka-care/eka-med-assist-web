#!/bin/bash

export AWS_ACCESS_KEY_ID="ASIAYES5P2B2SPTW45KH"
export AWS_SECRET_ACCESS_KEY="GIq8al8sO+Ct75F01lz0kf6xaDpqKN9Y3dV7W3zY"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjEN7//////////wEaCmFwLXNvdXRoLTEiRzBFAiAbJO5F89sYVV16sOOBa7/fqXmATij9VTfevw2eGy8TcAIhAIptw78KaMtLimtYd2aWuMy+X/JRbGrtIxGyrWrlApIzKvgCCFgQARoMNTU5NjE1NTYxODQ1IgyoRoNGAC7HXLmqOX0q1QIUW5rer2k05J9AZd48m9mNk9niFBRvFBbUeYvlCD9jxS3Y8bRFMv1I1Y4PHHX2OwAAtRfeHf63IgMBznGx0WgtVYKQSDLuTSHoHEO2zVOntAz5tV7Rw5Cavg2wVDoGlIqVuFXnXBmJQdJUfnixLwnKCmG3W/N8T+t3lKZDWGjx6FZq6FH+XK9oq7VA5z4KHCIyhNlzwmjpISwGwY6AoXJ9X8KFXSw/+o4NfiQdaP41KPumOC6CmgqIb6C6OmJFLlT+DY3w58K00XbpeZg+ErPTEhQf4X1V96RNSNJbAak2K8Fv/B4yUzilAOGZvZP0fpCcaO9wSqxkQcih2NT+yYnVHGeCVPerq74y4OFb/mPZLhULHlFFmFeSmuT6FqfzgFj5GJrQTt9R8NCVV2Kwge4MJKiPYExKg9Sc+URCCxoeaBqvy1jLfMz1TP6IOduxaR/ylevNqTCLwZnGBjqnAYujtwmx/lqi1Lz+Cu2uwF+396BOXvYuX0atQ3YG76derrdiSzwunlaPBBQn3mGj98YnZ9OZwbmyiFNaLXiyda7SP8P1vvYREXflOce3A1tk3LMepFKdrCrsIF3pp9191BP2eH7KhpyqqLvnAHHzVoXKJ4Vt5b1DANEwagiLcwjkPLcXYF3S3l0p5t4VywtktfQ+uzS9uVP5lc0YH/3yVs6FfycPkTT/"

# Configuration - Update these values
ENV="prod"
BUCKET_NAME="m-prod-medassist"
REGION="ap-south-1"
# tag="$ENV-1.0.18"

echo "🚀 Deploying Eka Medical Assistant Widget to AWS..."

rm -rf dist/

yarn install

yarn build

cd dist
aws s3 cp widget.js s3://$BUCKET_NAME/main/apollo/widget.js
aws s3 cp assets/widget.css s3://$BUCKET_NAME/main/apollo/widget.css
aws s3 sync assets/ s3://$BUCKET_NAME/main/apollo/assets/

echo "Uploaded widget.js, assets/widget.css and entire assets folder to S3"

# Save S3 URLs in variables
WIDGET_JS_URL="https://cdn.ekacare.co/apollo/widget.js"
WIDGET_CSS_URL="https://cdn.ekacare.co/apollo/widget.css"

echo "widget.js $WIDGET_JS_URL"
echo "assets/widget.css $WIDGET_CSS_URL"

cd ../
# now update the widget-loader.js with the new urls
sed -i '' "s|scriptUrl:.*|scriptUrl: \"$WIDGET_JS_URL\",|g" public/widget-loader.js
sed -i '' "s|cssUrl:.*|cssUrl: \"$WIDGET_CSS_URL\",|g" public/widget-loader.js

yarn build

cd dist
aws s3 cp widget-loader.js s3://$BUCKET_NAME/main/apollo/widget-loader.js

echo "Uploaded widget-loader.js to S3"


# Update widget-test.html with the latest tag
cd ../
sed -i '' "s|src=\"[^\"]*\"|src=\"https://cdn.ekacare.co/apollo/widget-loader.js\"|g" public/widget-test.html

echo "Updated widget-test.html with latest tag: $tag"

yarn build

echo "✅ Deployment completed successfully!"

export  CLOUDFRONT_DISTRIBUTION_ID=EFEE4LLA508Q
aws cloudfront create-invalidation  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"