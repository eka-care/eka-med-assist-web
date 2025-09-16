# Build Scripts & Optimizations for CDN Deployment

## Build Commands

### Development Build (with logs, larger bundle)
```bash
yarn build --mode dev
```
- **Bundle Size**: ~2.6MB (unminified)
- **Logs**: Enabled (console.log preserved for debugging)
- **Asset URLs**: Relative paths (`./assets/`)
- **Minification**: ESBuild (faster builds)

### Production Build (optimized for CDN)
```bash
VITE_VERSION=1.2.0 yarn build --mode prod
```
- **Bundle Size**: ~702KB raw, ~284KB gzipped
- **CSS**: ~116KB raw, ~18KB gzipped
- **Logs**: Disabled (all console.log removed)
- **Asset URLs**: `https://cdn.ekacare.co/apollo/prod-1.2.0/assets/`
- **Minification**: Terser with advanced optimization
- **Tree Shaking**: Enabled with aggressive dead code elimination

### Staging Build
```bash
VITE_VERSION=1.2.0-rc1 yarn build --mode staging
```
- Uses development-like settings but with staging URLs

## Optimizations Implemented

### 1. **Bundle Size Reduction**
- **Before**: 732KB → **After**: 702KB (-30KB)
- **CSS Optimization**: 185KB → 116KB (-69KB)
- **Advanced Terser settings**: Dead code elimination, unused function removal
- **Better tree shaking**: Removes unused React/library code

### 2. **Asset Management**
- ✅ **Version-aware URLs**: Dynamic CDN path generation
- ✅ **Environment detection**: No local .env file dependency
- ✅ **Widget loader synchronization**: Both files use same version system
- ✅ **CDN-ready**: All assets properly referenced for external hosting

### 3. **Build Performance**
- ✅ **Development**: Fast ESBuild minification
- ✅ **Production**: Optimized Terser with advanced compression
- ✅ **Consistent logging**: Proper console removal in production only
- ✅ **Better caching**: Optimized dependency handling

### 4. **Deployment Strategy**
```bash
# Deploy to CDN structure:
apollo/
├── prod-1.2.0/
│   ├── widget.js          (702KB → 284KB gzipped)
│   ├── widget-loader.js   (minified with correct URLs)
│   └── assets/
│       ├── widget.css     (116KB → 18KB gzipped)
│       └── powered-by-eka-care.svg
└── staging-1.3.0-rc1/
    └── ... (same structure)
```

## Key Improvements

### Before vs After
| Metric | Before | After | Improvement |
|--------|---------|--------|-------------|
| **JS Bundle** | 732KB | 702KB | -4% (30KB saved) |
| **CSS Bundle** | 185KB | 116KB | -37% (69KB saved) |
| **Gzipped Total** | ~322KB | ~302KB | -6% (20KB saved) |
| **Build Process** | Manual URLs | Dynamic versioning | Automated |
| **Asset Loading** | Broken on CDN | CDN-ready | Fixed |

### Network Impact
- **Total payload**: 302KB gzipped (down from ~322KB)
- **HTTP requests**: Same (JS + CSS + SVG assets)
- **Caching**: Better with versioned URLs
- **Reliability**: Assets resolve correctly from any domain

## Usage Examples

```bash
# Local development
yarn dev

# Development build (testing)
yarn build --mode dev

# Production release
VITE_VERSION=2.1.0 yarn build --mode prod

# Beta release
VITE_VERSION=2.1.0-beta yarn build --mode prod
```

## CDN Deployment Commands

```bash
# Example deployment flow
VITE_VERSION=2.1.0 yarn build --mode prod

# Upload to CDN (pseudo-command)
aws s3 sync dist/ s3://cdn-bucket/apollo/prod-2.1.0/ --gzip

# Widget can now be loaded from:
# https://cdn.ekacare.co/apollo/prod-2.1.0/widget-loader.js
```