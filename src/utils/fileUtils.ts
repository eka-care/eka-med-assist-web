import JSZip from "jszip";

/**
 * Zips multiple files into a single zip file
 * @param files Array of files to zip
 * @param zipFileName Name for the zip file (without extension)
 * @returns Promise<Blob> - The zipped file as a blob
 */
export const zipFiles = async (files: File[]): Promise<Blob> => {
  const zip = new JSZip();

  // Add each file to the zip
  files.forEach((file) => {
    zip.file(file.name, file);
  });

  // Generate the zip file as a blob
  const zipBlob = await zip.generateAsync({ type: "blob" });

  return zipBlob;
};

/**
 * Creates a File object from a blob with a specific name
 * @param blob The blob to convert
 * @param fileName The name for the file
 * @returns File object
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};

/**
 * Checks if multiple files should be zipped
 * @param files Array of files
 * @returns boolean - true if files should be zipped
 */
export const shouldZipFiles = (files: File[]): boolean => {
  return files.length > 1;
};

/**
 * Gets the appropriate file name for upload (either zip or single file)
 * @param files Array of files
 * @returns string - the file name to use for upload
 */
export const getUploadFileName = (files: File[]): string => {
  if (shouldZipFiles(files)) {
    return `uploaded_files_${Date.now()}.zip`;
  }
  return files[0]?.name || "file";
};
