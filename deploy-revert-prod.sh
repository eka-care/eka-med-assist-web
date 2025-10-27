#!/bin/bash
revert_tag="$1"
revert_version="v${revert_tag}"

# verify if the tag is a prod tag by checking if its a valid git tag and that it shouldnt contain - or dev in it
if ! git tag -l | grep -q "^${revert_version}$" || echo "${revert_tag}" | grep -qE 'dev|beta'; then
  echo "Invalid tag: ${revert_tag}"
  exit 1
fi
# check if the tag is of format x.y.z and tag should be > than 0.1.7
if ! echo "${revert_tag}" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' ; then
  echo "Tag should be of format x.y.z and should be > than 0.1.7"
  exit 1
fi

OLD_WIDGET_LOADER_JS_URL="s3://m-prod-medassist/apollo/prod-${revert_tag}/widget-loader.js"
WIDGET_LOADER_JS_URL="s3://m-prod-medassist/main/apollo/widget-loader.js"

aws s3 cp $OLD_WIDGET_LOADER_JS_URL $WIDGET_LOADER_JS_URL

echo "Reverting from $OLD_WIDGET_LOADER_JS_URL to $WIDGET_LOADER_JS_URL"

CLOUDFRONT_DISTRIBUTION_ID=EFEE4LLA508Q 

set -e
echo "🚀 Reverting Eka Medical Assistant Widget in AWS Prod..."
echo "📦 Using version: $revert_tag"

aws cloudfront create-invalidation  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"

echo "Invalidated CloudFront cache"

set +e