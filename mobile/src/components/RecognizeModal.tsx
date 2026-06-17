import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

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
    if (result?.lat != null && result?.lng != null) {
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
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderRing}>
                <Text style={styles.placeholderIcon}>📷</Text>
              </View>
              <Text style={styles.placeholderText}>拍摄景点照片{'\n'}自动识别景区位置</Text>
            </View>
          )}

          {recognizing && (
            <View style={styles.recognizingOverlay}>
              <ActivityIndicator size="large" color={Colors.goldLight} />
              <Text style={styles.recognizingText}>AI 识别中...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Non-scenic result */}
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

          {/* Scenic spot result */}
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
                <View style={styles.resultCategoryRow}>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{result.category}</Text>
                  </View>
                </View>
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

        {/* Bottom bar */}
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
  container: { flex: 1, backgroundColor: Colors.paper },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.divider,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: Colors.textSecondary },

  // Content
  content: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },

  // Placeholder
  placeholder: {
    width: '100%', height: 280, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.goldSurface,
    borderWidth: 2, borderColor: Colors.goldLight,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  placeholderRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.goldLight,
  },
  placeholderIcon: { fontSize: 36 },
  placeholderText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  preview: { width: '100%', height: 280, borderRadius: BorderRadius.lg, backgroundColor: Colors.divider },

  // Recognizing overlay
  recognizingOverlay: {
    position: 'absolute', top: Spacing.lg, left: Spacing.xl, right: Spacing.xl,
    height: 280, borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(44,24,16,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  recognizingText: { color: '#FFFFFF', marginTop: 12, fontSize: 15, fontWeight: '600' },

  // Error
  errorBox: {
    marginTop: Spacing.md, width: '100%', padding: Spacing.md, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.vermilionLight, borderWidth: 0.5, borderColor: Colors.vermilionLight,
  },
  errorText: { color: Colors.vermilion, fontSize: 13 },

  // Non-scenic
  nonScenicCard: {
    marginTop: Spacing.lg, width: '100%',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.goldLight,
    alignItems: 'center', ...Shadows.md,
  },
  nonScenicHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 8 },
  nonScenicIcon: { fontSize: 28 },
  nonScenicTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  nonScenicDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: Spacing.md },
  nonScenicHint: { color: Colors.goldDark, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Scenic result
  resultCard: {
    marginTop: Spacing.lg, width: '100%',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, ...Shadows.md,
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  resultName: { fontSize: 18, fontWeight: '700', color: Colors.ink, flex: 1 },
  confidenceBadge: {
    backgroundColor: Colors.jadeLight, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  confidenceText: { color: Colors.jade, fontSize: 12, fontWeight: '600' },
  resultCategoryRow: { marginBottom: Spacing.sm },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.lapisLight,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.sm,
  },
  categoryChipText: { color: Colors.lapis, fontSize: 12, fontWeight: '600' },
  resultDesc: { color: Colors.text, fontSize: 14, lineHeight: 22, marginBottom: Spacing.sm },
  aiDesc: { color: Colors.goldDark, fontSize: 12, lineHeight: 18, marginBottom: Spacing.lg, fontStyle: 'italic' },
  locateBtn: {
    backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  locateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Bottom
  bottomBar: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.white, borderTopWidth: 0.5, borderTopColor: Colors.divider,
    flexDirection: 'row', gap: 12,
  },
  captureBtn: {
    flex: 1, backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  captureBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md,
    paddingVertical: 14, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
