import React from 'react';
import Image from 'next/image';
import { ImageFile } from '@/hooks/use-image-upload';

interface ImagePreviewProps {
  selectedImages: ImageFile[];
  removeImage: (imageId: string) => void;
  clearImages: () => void;
  formatFileSize: (bytes: number) => string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  selectedImages,
  removeImage,
  clearImages,
  formatFileSize
}) => {
  if (selectedImages.length === 0) return null;

  return (
    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Selected Images ({selectedImages.length})
        </span>
        <button
          onClick={clearImages}
          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
        >
          Clear All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedImages.map((image) => (
          <div key={image.id} className="relative group">
            <Image
              src={`data:${image.type};base64,${image.data}`}
              alt={image.name}
              width={64}
              height={64}
              className="w-16 h-16 object-cover rounded border"
            />
            <button
              onClick={() => removeImage(image.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate">
              {image.name}
            </div>
            <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-t">
              {formatFileSize(image.size)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
