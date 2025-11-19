import * as ImagePicker from 'expo-image-picker';
import apiClient from '../../api/client';

export interface MediaUploadResult {
  mediaUrl: string;
  thumbnailUrl: string;
  key: string;
}

export class MediaService {
  private static instance: MediaService;

  private constructor() {}

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  /**
   * Request permissions for camera and media library
   */
  async requestPermissions(): Promise<boolean> {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return (
      cameraStatus.status === 'granted' && 
      libraryStatus.status === 'granted'
    );
  }

  /**
   * Take a photo using the camera
   */
  async takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  }

  /**
   * Pick an image from the library
   */
  async pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  }

  /**
   * Upload media to the server (via presigned URL)
   */
  async uploadMedia(
    jobId: string, 
    asset: ImagePicker.ImagePickerAsset
  ): Promise<MediaUploadResult> {
    // 1. Get presigned URL
    const filename = asset.fileName || `photo_${Date.now()}.jpg`;
    const contentType = 'image/jpeg'; // Expo camera usually returns jpegs
    
    // Get file info to get size if not present in asset
    // Note: asset.fileSize might be undefined on some platforms/versions
    const sizeBytes = asset.fileSize || 0; 

    const initResponse = await apiClient.post('/execution/media/upload', {
      serviceOrderId: jobId,
      filename,
      contentType,
      sizeBytes,
      kind: 'photo',
    });

    const { uploadUrl, mediaUrl, thumbnailUrl, key } = initResponse.data;

    // 2. Upload file to GCS/S3 using the presigned URL
    // We need to fetch the file as a blob/buffer to upload it
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: await this.createBlob(asset.uri),
      headers: {
        'Content-Type': contentType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    return { mediaUrl, thumbnailUrl, key };
  }

  /**
   * Helper to create a blob from a URI
   */
  private async createBlob(uri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }
}
