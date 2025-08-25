#!/bin/bash

# Configuration - Update these values
BUCKET_NAME="your-widget-bucket-name"
REGION="us-east-1"
CLOUDFRONT_DISTRIBUTION_ID="your-cloudfront-distribution-id"

echo "🚀 Deploying Eka Medical Assistant Widget to AWS..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if bucket name is configured
if [ "$BUCKET_NAME" = "your-widget-bucket-name" ]; then
    echo "❌ Please update the BUCKET_NAME variable in this script first."
    exit 1
fi

# Build the widget first
echo "🔨 Building widget..."
./build-widget.sh

# Sync files to S3
echo "📤 Uploading files to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete --region $REGION

# Set cache headers for different file types
echo "⚙️ Setting cache headers..."
aws s3 cp s3://$BUCKET_NAME/widget.js s3://$BUCKET_NAME/widget.js --cache-control "max-age=31536000,immutable" --metadata-directive REPLACE --region $REGION
aws s3 cp s3://$BUCKET_NAME/widget-loader.js s3://$BUCKET_NAME/widget-loader.js --cache-control "max-age=31536000,immutable" --metadata-directive REPLACE --region $REGION
aws s3 cp s3://$BUCKET_NAME/widget.html s3://$BUCKET_NAME/widget.html --cache-control "max-age=3600" --metadata-directive REPLACE --region $REGION

# Invalidate CloudFront cache if distribution ID is provided
if [ "$CLOUDFRONT_DISTRIBUTION_ID" != "your-cloudfront-distribution-id" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --region $REGION
else
    echo "⚠️  CloudFront distribution ID not configured. Skipping cache invalidation."
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your widget is now available at:"
echo "   - Widget Loader: https://$BUCKET_NAME.s3.$REGION.amazonaws.com/widget-loader.js"
echo "   - Widget HTML: https://$BUCKET_NAME.s3.$REGION.amazonaws.com/widget.html"
echo "   - Demo: https://$BUCKET_NAME.s3.$REGION.amazonaws.com/demo.html"
echo ""
echo "📝 To use the widget on any website, add this code:"
echo "   <script src=\"https://$BUCKET_NAME.s3.$REGION.amazonaws.com/widget-loader.js\"></script>"
echo "   <script>"
echo "     EkaMedAssist.init({"
echo "       theme: 'doctor-light',"
echo "       widgetUrl: 'https://$BUCKET_NAME.s3.$REGION.amazonaws.com/widget.html',"
echo "       apiEndpoint: 'https://matrix.dev.eka.care/med-assist/session'"
echo "     });"
echo "   </script>" 