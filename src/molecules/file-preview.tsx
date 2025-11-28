import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";

interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  isPreview?: boolean; // true for before sending, false for after sending
  className?: string;
}

export function FilePreview({
  file,
  onRemove,
  isPreview = true,
  className = "",
}: FilePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");

  const isImage = file?.type?.startsWith("image/") ?? false;
  const isPDF = file?.type === "application/pdf";

  // Create and cleanup blob URL for images
  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  // Reset image error when file changes
  useEffect(() => {
    setImageError(false);
  }, [file]);

  const getFileTypeColor = () => {
    if (isImage) return "text-green-600";
    if (isPDF) return "text-gray-600";
    return "text-gray-600";
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(1);
    return `${size} ${sizes[i]}`.toLowerCase();
  };

  // For non-image files, show as horizontal card with icon, name, and size
  if (!isImage || imageError) {
    return (
      <div
        className={`relative group inline-flex flex-shrink-0 bg-white border border-neutral-300 rounded-lg flex items-center gap-3 px-3 py-2.5 max-w-full ${
          isPreview ? "hover:bg-neutral-50" : ""
        } ${className}`}>
        {/* File Icon */}
        <div className={`flex-shrink-0 ${getFileTypeColor()}`}>
          <FileText className="h-5 w-5" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0 max-w-[200px]">
          {file?.name && (
            <div className="text-sm font-medium text-[var(--color-foreground)] truncate">
              {file.name}
            </div>
          )}
          {file?.size && (
            <div className="text-xs text-[var(--color-muted-foreground)]">
              {formatFileSize(file.size)}
            </div>
          )}
        </div>

        {/* Remove Button (only in preview mode) */}
        {isPreview && onRemove && (
          <button
            onClick={onRemove}
            aria-label={`Remove ${file.name}`}
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // For images, show as thumbnail
  return (
    <div className={`relative group flex-shrink-0 ${className}`}>
      <div
        className={`w-20 h-20 bg-white border border-neutral-300 rounded-lg flex items-center justify-center overflow-hidden ${
          isPreview ? "hover:bg-neutral-100 cursor-pointer" : ""
        }`}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Remove Button (only in preview mode) */}
      {isPreview && onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute top-0 right-0 bg-[var(--color-muted)] text-black rounded-full w-5 h-5 flex items-center justify-center hover:bg-[var(--color-muted-foreground)] transition-colors z-10 transform translate-x-1 -translate-y-1">
          <X className="h-3 w-3 text-black" />
        </button>
      )}
    </div>
  );
}

interface FilePreviewListProps {
  files: File[];
  onRemoveFile?: (index: number) => void;
  isPreview?: boolean;
  className?: string;
}

export function FilePreviewList({
  files,
  onRemoveFile,
  isPreview = true,
  className = "",
}: FilePreviewListProps) {
  if (files.length === 0) return null;

  const imageFiles = files.filter((f) => f.type?.startsWith("image/"));
  const nonImageFiles = files.filter((f) => !f.type?.startsWith("image/"));

  return (
    <div className={`flex flex-wrap gap-2 max-w-full ${className}`}>
      {/* Non-image files as inline cards */}
      {nonImageFiles.map((file) => {
        const originalIndex = files.indexOf(file);
        return (
          <FilePreview
            key={`${file.name}-${file.size}-${originalIndex}`}
            file={file}
            onRemove={
              onRemoveFile ? () => onRemoveFile(originalIndex) : undefined
            }
            isPreview={isPreview}
          />
        );
      })}

      {/* Image files as grid */}
      {imageFiles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto max-w-full p-1 scrollbar-hide">
          {imageFiles.map((file) => {
            const originalIndex = files.indexOf(file);
            return (
              <FilePreview
                key={`${file.name}-${file.size}-${originalIndex}`}
                file={file}
                onRemove={
                  onRemoveFile ? () => onRemoveFile(originalIndex) : undefined
                }
                isPreview={isPreview}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
