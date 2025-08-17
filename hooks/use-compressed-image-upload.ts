import { useState, useCallback } from 'react';
import Compressor from 'compressorjs';

export interface CompressedImageFile {
  id: string;
  name: string;
  data: string; // base64 without prefix
  type: string;
  originalSize: number;
  compressedSize: number;
  width?: number;
  height?: number;
  ratio?: number; // compression ratio compressed/original
}

export interface UseCompressedImageUploadOptions {
  maxWidth?: number;        // e.g., 1600
  maxHeight?: number;       // e.g., 1600
  quality?: number;         // 0 - 1 (JPEG/WebP)
  convertSize?: number;     // convert larger than this (MB) to JPEG
  mimeType?: string;        // force output type e.g. 'image/jpeg'
  maxFileSizeMB?: number;   // reject files larger than this BEFORE compression
  maxFiles?: number;        // limit number of images
}

const defaultOptions: Required<UseCompressedImageUploadOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.7,
  convertSize: 1, // MB
  mimeType: 'image/jpeg',
  maxFileSizeMB: 10,
  maxFiles: 10
};

export const useCompressedImageUpload = (opts?: UseCompressedImageUploadOptions) => {
  const options = { ...defaultOptions, ...opts };
  const [images, setImages] = useState<CompressedImageFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressFile = (file: File) => {
    return new Promise<File>((resolve, reject) => {
      new Compressor(file, {
        quality: options.quality,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        convertSize: options.convertSize * 1024 * 1024, // MB to bytes
        mimeType: options.mimeType,
        success(result) { resolve(result as File); },
        error(err) { reject(err); }
      });
    });
  };

  const fileToBase64 = (file: File): Promise<{ base64: string; width?: number; height?: number; }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({ base64: result.split(',')[1], width: img.width, height: img.height });
        };
        img.onerror = () => resolve({ base64: result.split(',')[1] });
        img.src = result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    setError(null);
    const files = Array.from(fileList);
    if (files.length + images.length > options.maxFiles) {
      setError(`Maximum ${options.maxFiles} images allowed.`);
      return;
    }
    setIsCompressing(true);
    try {
      const processed: CompressedImageFile[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed.');
          continue;
        }
        if (file.size > options.maxFileSizeMB * 1024 * 1024) {
          setError(`File ${file.name} exceeds ${options.maxFileSizeMB}MB limit.`);
          continue;
        }
        let compressed: File = file;
        try {
          compressed = await compressFile(file);
        } catch (e) {
          console.warn('Compression failed, using original file', e);
        }
        const { base64, width, height } = await fileToBase64(compressed);
        const img: CompressedImageFile = {
          id: `img-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.jpg'),
          data: base64,
          type: compressed.type || options.mimeType,
          originalSize: file.size,
          compressedSize: compressed.size,
          width,
          height,
          ratio: compressed.size / file.size
        };
        processed.push(img);
      }
      if (processed.length) {
        setImages(prev => [...prev, ...processed]);
      }
    } catch (e: any) {
      setError(e.message || 'Image processing failed');
    } finally {
      setIsCompressing(false);
    }
  }, [images.length, options]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const triggerFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => handleInputChange(e as any);
    input.click();
  }, [handleInputChange]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearImages = useCallback(() => setImages([]), []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    images,
    isCompressing,
    error,
    handleInputChange,
    triggerFileDialog,
    removeImage,
    clearImages,
    formatFileSize
  };
};
