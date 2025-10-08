import { useState, useEffect } from "react";
import { X, FileText, Image as ImageIcon } from "lucide-react";

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

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-8 w-8" />;
    if (isPDF) return <FileText className="h-8 w-8" />;
    return <FileText className="h-8 w-8" />;
  };

  const getFileTypeColor = () => {
    if (isImage) return "text-green-600";
    if (isPDF) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className={`relative group flex-shrink-0 ${className}`}>
      <div
        className={`w-20 h-20 bg-gray-800 border border-white rounded-lg flex items-center justify-center ${
          isPreview ? "hover:bg-gray-700 cursor-pointer" : ""
        }`}>
        {/* Image Preview */}
        {isImage && !imageError && imageUrl && (
          <div className="w-full h-full rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={file.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* File Icon */}
        {(!isImage || imageError) && (
          <div className={`${getFileTypeColor()}`}>{getFileIcon()}</div>
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

  return (
    <div
      className={`flex gap-2 overflow-x-auto max-w-full p-1 scrollbar-hide ${className}`}>
      {files.map((file, index) => (
        <FilePreview
          key={`${file.name}-${file.size}-${index}`}
          file={file}
          onRemove={onRemoveFile ? () => onRemoveFile(index) : undefined}
          isPreview={isPreview}
        />
      ))}
    </div>
  );
}
