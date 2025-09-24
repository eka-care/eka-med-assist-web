#!/bin/bash
tag="$1"

# Configuration - Update these values
ENV="dev"
BUCKET_NAME="m-dev-medassist"
REGION="ap-south-1"
WIDGET_CDN_URL="https://dev-cdn.ekacare.co/apollo"
WIDGET_VERSION_URL="https://dev-cdn.ekacare.co/apollo/$ENV-$tag"
CLOUDFRONT_DISTRIBUTION_ID=EFEE4LLA508Q 

set -e
echo "🚀 Deploying Eka Medical Assistant Widget to AWS Dev..."

rm -rf dist/
yarn install
yarn build --mode stage


cd dist
aws s3 cp widget.js s3://$BUCKET_NAME/apollo/$ENV-$tag/widget.js   --cache-control "public,max-age=31536000,immutable" \
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
  aws s3 cp "$file" "s3://$BUCKET_NAME/apollo/$ENV-$tag/assets/$target_path" --content-type "$mime"  --cache-control "public,max-age=31536000,immutable"
done 

aws s3 cp widget-loader.js s3://$BUCKET_NAME/main/apollo/widget-loader.js   --cache-control "public,max-age=30,immutable" \
  --content-type "application/javascript"
aws s3 cp widget-loader.js s3://$BUCKET_NAME/apollo/$ENV-$tag/widget-loader.js   --cache-control "public,max-age=30,immutable" \
  --content-type "application/javascript"

echo "Uploaded widget.js, assets/ folder and widget.css to S3"

# Save S3 URLs in variables
WIDGET_JS_URL="$WIDGET_VERSION_URL/widget.js"
WIDGET_CSS_URL="$WIDGET_VERSION_URL/assets/widget.css"
WIDGET_LOADER_JS_URL="$WIDGET_CDN_URL/widget-loader.js"


echo "Uploaded widget-loader.js to S3"
echo "✅ Deployment completed successfully!"


aws cloudfront create-invalidation  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"

echo "Invalidated CloudFront cache"
echo "widget.js cdn url  -> $WIDGET_JS_URL"
echo "assets/widget.css cdn url -> $WIDGET_CSS_URL"
echo "widget-loader.js cdn url -> $WIDGET_LOADER_JS_URL"

set +e