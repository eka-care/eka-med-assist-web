# Build Scripts for CDN Deployment

## Development Build (with logs)
```bash
yarn build --mode development
```
- Logs: **Enabled** (console.log statements preserved)
- Asset URLs: Relative paths (`./assets/`)
- Environment: `development`

## Production Build (no logs)
```bash
VITE_VERSION=1.2.0 yarn build --mode production
```
- Logs: **Disabled** (all console.log removed)
- Asset URLs: CDN paths (`https://cdn.ekacare.co/apollo/production-1.2.0/assets/`)
- Environment: `production`

## Staging Build Example
```bash
VITE_VERSION=1.2.0-rc1 yarn build --mode staging
```
- Asset URLs: `https://cdn.ekacare.co/apollo/staging-1.2.0-rc1/assets/`

## What Changed

### 1. Environment Detection
- ✅ No longer depends on local `.env` files
- ✅ Uses Vite's built-in `MODE` detection
- ✅ Can be overridden at build time: `--mode production`

### 2. Asset URLs
- ✅ Development: Uses relative paths `./assets/`
- ✅ Production: Uses CDN URLs with version: `https://cdn.ekacare.co/apollo/{env}-{version}/assets/`
- ✅ Version controlled via `VITE_VERSION` environment variable

### 3. Logging Strategy
- ✅ Development builds: Console logs preserved
- ✅ Production builds: All console.log statements removed
- ✅ Consistent across both Terser and ESBuild minification

### 4. CDN Deployment Ready
- ✅ All assets reference proper CDN URLs
- ✅ Version-aware URL generation
- ✅ Build output ready for CDN upload to `apollo/{env}-{version}/` directory