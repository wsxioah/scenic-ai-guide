import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

interface RecognizeResult {
  is_scenic: boolean;
  spot_name: string;
  confidence: number;
  category?: string;
  description?: string;
  ai_description?: string;
  lat?: number;
  lng?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSpotRecognized: (spot: { name: string; lat: number; lng: number; desc?: string; category?: string }) => void;
}

export default function RecognizeModal({ visible, onClose, onSpotRecognized }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [error, setError] = useState('');

  const resetState = () => {
    setPhotoUri(null);
    setRecognizing(false);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const takePhoto = async () => {
    setError('');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('需要相机权限才能拍照识景');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: false,
    });

    if (res.canceled || !res.assets[0]) return;

    const uri = res.assets[0].uri;
    setPhotoUri(uri);
    setRecognizing(true);

    try {
      const data = await api.recognizeScenic(uri);
      setResult(data);
    } catch (e: any) {
      setError('识别失败：' + (e?.message || '未知错误'));
    }
    setRecognizing(false);
  };

  const goToSpot = () => {
    if (result?.lat && result?.lng) {
      onSpotRecognized({
        name: result.spot_name, lat: result.lat, lng: result.lng,
        desc: result.description, category: result.category,
      });
    }
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>拍照识景</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Photo preview or placeholder */}
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>拍摄景点照片{'\n'}自动识别景区位置</Text>
            </View>
          )}

          {/* Recognizing spinner */}
          {recognizing && (
            <View style={styles.recognizingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.recognizingText}>AI 识别中...</Text>
            </View>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Result: Non-scenic */}
          {result && !recognizing && !result.is_scenic && (
            <View style={styles.nonScenicCard}>
              <View style={styles.nonScenicHeader}>
                <Text style={styles.nonScenicIcon}>🤔</Text>
                <Text style={styles.nonScenicTitle}>这好像不是景区相关内容</Text>
              </View>
              {result.ai_description ? (
                <Text style={styles.nonScenicDesc}>
                  照片内容识别：{result.ai_description}
                </Text>
              ) : (
                <Text style={styles.nonScenicDesc}>
                  AI未能识别出照片中的内容，请尝试拍摄更清晰的照片。
                </Text>
              )}
              <Text style={styles.nonScenicHint}>
                请拍摄景区内的寺庙、佛像、古建筑、自然风光等景点照片
              </Text>
            </View>
          )}

          {/* Result: Scenic spot */}
          {result && !recognizing && result.is_scenic && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.spot_name}</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    匹配度 {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              </View>
              {result.category && (
                <Text style={styles.resultCategory}>{result.category}类景点</Text>
              )}
              {result.description && (
                <Text style={styles.resultDesc}>{result.description}</Text>
              )}
              {result.ai_description && (
                <Text style={styles.aiDesc}>AI分析：{result.ai_description}</Text>
              )}
              <TouchableOpacity style={styles.locateBtn} onPress={goToSpot}>
                <Text style={styles.locateBtnText}>📍 在地图上定位</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom actions */}
        {!recognizing && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <Text style={styles.captureBtnText}>📸 拍照识别</Text>
            </TouchableOpacity>
            {photoUri && !result && (
              <TouchableOpacity style={styles.retryBtn} onPress={resetState}>
                <Text style={styles.retryBtnText}>重拍</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#6B7280' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  placeholder: {
    width: '100%', height: 280, borderRadius: 16,
    backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#BFDBFE',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 48, marginBottom: 12 },
  placeholderText: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  preview: { width: '100%', height: 280, borderRadius: 16, backgroundColor: '#E5E7EB' },
  recognizingOverlay: {
    position: 'absolute', top: 16, left: 20, right: 20,
    height: 280, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  recognizingText: { color: '#FFFFFF', marginTop: 12, fontSize: 15, fontWeight: '600' },
  errorBox: {
    marginTop: 12, width: '100%', padding: 12, borderRadius: 8,
    backgroundColor: '#FEF2F2', borderWidth: 0.5, borderColor: '#FECACA',
  },
  errorText: { color: '#991B1B', fontSize: 13 },
  // Non-scenic result
  nonScenicCard: {
    marginTop: 16, width: '100%', backgroundColor: '#FFFBEB',
    borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#FCD34D',
    alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  nonScenicHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8,
  },
  nonScenicIcon: { fontSize: 28 },
  nonScenicTitle: { fontSize: 17, fontWeight: '700', color: '#92400E' },
  nonScenicDesc: { color: '#78350F', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  nonScenicHint: { color: '#A16207', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  // Scenic result
  resultCard: {
    marginTop: 16, width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultName: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  confidenceBadge: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  confidenceText: { color: '#065F46', fontSize: 12, fontWeight: '600' },
  resultCategory: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  resultDesc: { color: '#4B5563', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  aiDesc: { color: '#6366F1', fontSize: 12, lineHeight: 18, marginBottom: 14, fontStyle: 'italic' },
  locateBtn: {
    backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12,
    alignItems: 'center',
  },
  locateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  bottomBar: {
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#E5E7EB',
    flexDirection: 'row', gap: 12,
  },
  captureBtn: {
    flex: 1, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  captureBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: 20, borderRadius: 10, paddingVertical: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
});
