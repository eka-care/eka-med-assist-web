#!/bin/bash

echo "🚀 Building Eka Medical Assistant Widget..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Build the widget
echo "🔨 Building widget with Vite..."
npm run build

# Copy widget files to dist
echo "📁 Copying widget files..."
cp public/widget-loader.js dist/
cp public/widget.html dist/
cp -r public/assets dist/

# Create a simple demo HTML file
echo "📝 Creating demo HTML..."
cat > dist/demo.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eka Medical Assistant Widget Demo</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 20px; }
        .demo-section { text-align: center; padding: 40px; background: #f8f9fa; border-radius: 12px; margin: 30px 0; }
        .demo-section h2 { color: #2c3e50; margin-bottom: 20px; }
        .demo-section p { color: #6c757d; margin-bottom: 30px; font-size: 1.1rem; }
        pre { background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 Eka Medical Assistant Widget Demo</h1>
        
        <div class="demo-section">
            <h2>🎯 Try It Out!</h2>
            <p>Look for the chat button that will appear on this page.</p>
            <p>Click it to open the medical assistant widget!</p>
        </div>
        
        <div class="demo-section">
            <h2>💻 Implementation Code</h2>
            <p>To add this widget to your website:</p>
            <pre><code>&lt;script src="https://your-cdn-domain.com/widget-loader.js"&gt;&lt;/script&gt;
&lt;script&gt;
  EkaMedAssist.init({
    theme: 'doctor-light',
    widgetUrl: 'https://your-cdn-domain.com/widget.html'
  });
&lt;/script&gt;</code></pre>
        </div>
    </div>

    <!-- Widget Script -->
    <script src="./widget-loader.js"></script>
    <script>
        // Initialize the widget
        EkaMedAssist.init({
            theme: "doctor-light",
            widgetUrl: "./widget.html"
        });
    </script>
</body>
</html>
EOF

echo "✅ Build completed successfully!"
echo "📁 Files created in dist/ folder:"
ls -la dist/

echo ""
echo "🚀 Next steps:"
echo "1. Upload the contents of dist/ to your AWS S3 bucket"
echo "2. Configure CloudFront distribution"
echo "3. Update the widgetUrl in widget-loader.js with your CDN domain"
echo "4. Test the widget with the demo.html file" 