#!/bin/bash
tag="$1"

# Configuration - Update these values
ENV="dev"
BUCKET_NAME="m-dev-medassist"
REGION="ap-south-1"
WIDGET_CDN_URL="https://dev-cdn.ekacare.co/apollo"
CLOUDFRONT_DISTRIBUTION_ID=E3BJWCYM0A7WQV

set -e
echo "🚀 Deploying Eka Medical Assistant Widget to AWS Dev..."

rm -rf dist/
yarn install
yarn build --mode development


cd dist
aws s3 cp widget.js s3://$BUCKET_NAME/main/apollo/widget.js   --cache-control "public,max-age=31536000,immutable" \
  --content-type "application/javascript"

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
  target_path="${file#assets/}"
  target_path="${target_path#/}"  # Remove any leading slash
  aws s3 cp "$file" "s3://$BUCKET_NAME/main/apollo/assets/$target_path" --content-type "$mime"  --cache-control "public,max-age=31536000,immutable"
done  
#aws s3 sync assets/ s3://$BUCKET_NAME/main/apollo/assets/ --cache-control "public,max-age=31536000,immutable"

echo "Uploaded widget.js, assets/widget.css and entire assets folder to S3"

# Save S3 URLs in variables
WIDGET_JS_URL="$WIDGET_CDN_URL/widget.js"
WIDGET_CSS_URL="$WIDGET_CDN_URL/assets/widget.css"
WIDGET_LOADER_JS_URL="$WIDGET_CDN_URL/widget-loader.js"

cd ../
# now update the widget-loader.js with the new urls
sed -i '' "s|scriptUrl:.*|scriptUrl: \"$WIDGET_JS_URL\",|g" public/widget-loader.js
sed -i '' "s|cssUrl:.*|cssUrl: \"$WIDGET_CSS_URL\",|g" public/widget-loader.js

yarn build

cd dist
aws s3 cp widget-loader.js s3://$BUCKET_NAME/main/apollo/widget-loader.js   --cache-control "public,max-age=30,immutable" \
  --content-type "application/javascript"


echo "Uploaded widget-loader.js to S3"
echo "✅ Deployment completed successfully!"

aws cloudfront create-invalidation  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"

echo "Invalidated CloudFront cache"

echo "widget.js cdn url  -> $WIDGET_JS_URL"
echo "assets/widget.css cdn url -> $WIDGET_CSS_URL"
echo "widget-loader.js cdn url -> $WIDGET_LOADER_JS_URL"
set +e