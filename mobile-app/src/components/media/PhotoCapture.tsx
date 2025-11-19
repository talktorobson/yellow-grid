import React, { useState } from 'react';
import { View, Button, Image, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { MediaService } from '../../services/media/MediaService';

interface PhotoCaptureProps {
  jobId: string;
  onPhotoUploaded?: (url: string) => void;
}

export const PhotoCapture = ({ jobId, onPhotoUploaded }: PhotoCaptureProps) => {
  const [uploading, setUploading] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await MediaService.getInstance().requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission needed', 'Camera and library permissions are required');
        return;
      }

      const asset = await MediaService.getInstance().takePhoto();
      if (asset) {
        await uploadPhoto(asset);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async (asset: any) => {
    setUploading(true);
    try {
      const result = await MediaService.getInstance().uploadMedia(jobId, asset);
      setLastPhoto(result.thumbnailUrl || result.mediaUrl);
      if (onPhotoUploaded) {
        onPhotoUploaded(result.mediaUrl);
      }
      Alert.alert('Success', 'Photo uploaded successfully');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Upload Failed', error.message || 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Job Photos</Text>
      
      {lastPhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: lastPhoto }} style={styles.preview} />
          <Text style={styles.previewText}>Last Upload</Text>
        </View>
      )}

      {uploading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Take Photo" onPress={handleTakePhoto} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
  previewText: {
    fontSize: 12,
    color: '#666',
  },
});
