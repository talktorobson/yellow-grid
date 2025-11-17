import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

interface SignatureCaptureProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title?: string;
}

interface Point {
  x: number;
  y: number;
}

const { width } = Dimensions.get('window');
const CANVAS_HEIGHT = 400;

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  visible,
  onClose,
  onSave,
  title = 'Customer Signature',
}) => {
  const canvasRef = useRef<View>(null);
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        if (currentPath.length > 0) {
          setPaths([...paths, currentPath]);
          setCurrentPath([]);
        }
      },
    })
  ).current;

  const convertPathToSvgPath = (points: Point[]): string => {
    if (points.length === 0) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const handleSave = async () => {
    if (paths.length === 0 && currentPath.length === 0) {
      Alert.alert('Empty Signature', 'Please provide a signature before saving');
      return;
    }

    try {
      if (canvasRef.current) {
        const uri = await captureRef(canvasRef, {
          format: 'png',
          quality: 1,
        });

        onSave(uri);
        handleClear();
      }
    } catch (error) {
      console.error('Error capturing signature:', error);
      Alert.alert('Error', 'Failed to capture signature');
    }
  };

  const handleClose = () => {
    if (paths.length > 0 || currentPath.length > 0) {
      Alert.alert(
        'Discard Signature?',
        'Are you sure you want to discard this signature?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              handleClear();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.instructionsContainer}>
          <Ionicons name="create-outline" size={24} color="#666666" />
          <Text style={styles.instructions}>
            Sign in the box below using your finger
          </Text>
        </View>

        <View style={styles.canvasContainer} ref={canvasRef}>
          <View {...panResponder.panHandlers} style={styles.canvas}>
            <Svg height={CANVAS_HEIGHT} width={width - 32}>
              {paths.map((path, index) => (
                <Path
                  key={`path-${index}`}
                  d={convertPathToSvgPath(path)}
                  stroke="#000000"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath.length > 0 && (
                <Path
                  d={convertPathToSvgPath(currentPath)}
                  stroke="#000000"
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>X</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="refresh" size={24} color="#FF3B30" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  instructions: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
  },
  canvasContainer: {
    margin: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  canvas: {
    height: CANVAS_HEIGHT,
  },
  signatureLine: {
    position: 'absolute',
    bottom: 80,
    left: 50,
    right: 50,
    height: 1,
    backgroundColor: '#CCCCCC',
  },
  signatureLabel: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    fontSize: 20,
    color: '#999999',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
