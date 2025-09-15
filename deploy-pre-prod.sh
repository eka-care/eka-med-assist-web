#!/bin/bash
tag="$1"

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
aws s3 cp widget.js s3://$BUCKET_NAME/main/pre-prod/apollo/widget-$tag.js   --cache-control "public,max-age=31536000,immutable" \
  --content-type "application/javascript"
#aws s3 cp assets/widget.css s3://$BUCKET_NAME/main/pre-prod/apollo/widget-$tag.css   --cache-control "public,max-age=31536000,immutable" \
#  --content-type "text/css"


find assets/ -type f | while read file; do
  ext="${file##*.}"
  case "$ext" in
    css) mime="text/css" ;;
    js) mime="application/javascript" ;;
    png) mime="image/png" ;;
    jpg|jpeg) mime="image/jpeg" ;;
    svg) mime="image/svg+xml" ;;
    gif) mime="image/gif" ;;
    json) mime="application/json" ;;
    *) mime="application/octet-stream" ;;
  esac
  aws s3 cp "$file" "s3://$BUCKET_NAME/main/pre-prod/apollo/assets/${file#assets/}" --content-type "$mime"  --cache-control "public,max-age=31536000,immutable"
done  
#aws s3 sync assets/ s3://$BUCKET_NAME/main/pre-prod/apollo/assets/ --cache-control "public,max-age=31536000,immutable"

echo "Uploaded widget.js, assets/widget.css and entire assets folder to S3"

# Save S3 URLs in variables
WIDGET_JS_URL="https://cdn.ekacare.co/pre-prod/apollo/widget-$tag.js"
# WIDGET_CSS_URL="https://cdn.ekacare.co/pre-prod/apollo/widget-$tag.css"

echo "widget.js $WIDGET_JS_URL"
# echo "assets/widget.css $WIDGET_CSS_URL"

# cd ../
# now update the widget-loader.js with the new urls
# sed -i '' "s|scriptUrl:.*|scriptUrl: \"$WIDGET_JS_URL\",|g" public/widget-loader.js
# sed -i '' "s|cssUrl:.*|cssUrl: \"$WIDGET_CSS_URL\",|g" public/widget-loader.js

# yarn build

# cd dist
aws s3 cp widget-loader.js s3://$BUCKET_NAME/main/pre-prod/apollo/widget-loader.js   --cache-control "public,max-age=30,immutable" \
  --content-type "application/javascript"

echo "Uploaded widget-loader.js to S3"


# Update widget-test.html with the latest tag
# cd ../
# sed -i '' "s|src=\"[^\"]*\"|src=\"https://cdn.ekacare.co/pre-prod/apollo/widget-loader.js\"|g" public/widget-test.html

# echo "Updated widget-test.html with latest tag: $tag"

# yarn build

echo "✅ Deployment completed successfully!"




export  CLOUDFRONT_DISTRIBUTION_ID=EFEE4LLA508Q
aws cloudfront create-invalidation  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/pre-prod/*"

echo CDN_URL is https://cdn.ekacare.co/pre-prod/apollo/widget-loader.js
echo https://cdn.ekacare.co/pre-prod/apollo/widget-$tag.js
echo https://cdn.ekacare.co/pre-prod/apollo/widget-$tag.css
