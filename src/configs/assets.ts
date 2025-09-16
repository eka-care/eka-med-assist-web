// Dynamic asset URL construction for CDN deployment
// URLs: https://cdn.ekacare.co/apollo/{env}-{version}/assets/{filename}

const ENVIRONMENT = import.meta.env.MODE; // 'development' or 'production'
const VERSION = import.meta.env.VITE_VERSION || 'latest';

// Dynamically construct CDN URLs
const buildAssetUrl = (filename: string): string => {
    // For local development, use relative paths
    if (ENVIRONMENT === 'development') {
        return `./assets/${filename}`;
    }

    // For production, construct CDN URL
    return `https://cdn.ekacare.co/apollo/${ENVIRONMENT}-${VERSION}/assets/${filename}`;
};

// Asset URLs - all constructed dynamically
export const ASSETS = {
    POWERED_BY_EKA_CARE: buildAssetUrl('powered-by-eka-care.svg'),
} as const;

// Helper for any additional assets
export const getAssetUrl = (filename: string): string => {
    return buildAssetUrl(filename);
};