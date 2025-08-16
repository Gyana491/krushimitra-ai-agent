import { useState, useCallback } from 'react';

export interface ImageFile {
  id: string;
  name: string;
  data: string;
  type: string;
  size: number;
}

export const useImageUpload = () => {
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Data = result.split(',')[1]; // Remove data:image/type;base64, prefix
        
        const newImage: ImageFile = {
          id: `img-${Date.now()}-${Math.random()}`,
          name: file.name,
          data: base64Data,
          type: file.type,
          size: file.size
        };

        setSelectedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const clearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleImageUpload({ target } as any);
      }
    };
    input.click();
  }, [handleImageUpload]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    selectedImages,
    handleImageUpload,
    removeImage,
    clearImages,
    triggerImageUpload,
    formatFileSize
  };
};
