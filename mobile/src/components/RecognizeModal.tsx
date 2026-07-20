import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

interface RecognizeResult {
  name: string;
  confidence: number;
  top5: { name: string; confidence: number }[];
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

  const recognizeImage = async (uri: string) => {
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
    recognizeImage(res.assets[0].uri);
  };

  const pickFromAlbum = async () => {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('需要相册权限才能选择图片');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: false,
    });

    if (res.canceled || !res.assets[0]) return;
    recognizeImage(res.assets[0].uri);
  };

  // 真景区判断：Top-1 足够高 且 与 Top-2 有明显差距（避免各类均分）
  const isRealScenic = (r: RecognizeResult) =>
    r.confidence >= 0.50 && (r.top5.length < 2 || r.confidence - r.top5[1].confidence >= 0.15);

  const askAI = () => {
    onSpotRecognized({ name: result!.name, lat: 0, lng: 0, desc: '', category: '' });
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
              <Text style={styles.placeholderText}>拍摄或选择景点照片{'\n'}自动识别景区位置</Text>
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

          {/* Low confidence result */}
          {result && !recognizing && !isRealScenic(result) && (
            <View style={styles.lowConfCard}>
              <Text style={styles.lowConfIcon}>🔍</Text>
              <Text style={styles.lowConfTitle}>未能识别出景区内容</Text>
              <Text style={styles.lowConfDesc}>
                请尝试拍摄景区内的寺庙、佛像、建筑或自然景观等清晰照片
              </Text>
              <TouchableOpacity style={styles.retryCaptureBtn} onPress={resetState}>
                <Text style={styles.retryCaptureBtnText}>重新拍照</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recognition result */}
          {result && !recognizing && isRealScenic(result) && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>🏛️</Text>
                <Text style={styles.resultName}>{result.name}</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>
                    匹配度 {Math.round(result.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={styles.top5Title}>Top-5 识别结果</Text>
              {result.top5.map((item, i) => (
                <View
                  key={item.name}
                  style={[styles.top5Row, i === 0 && styles.top5RowFirst]}
                >
                  <Text style={[styles.top5Rank, i === 0 && styles.top5RankFirst]}>
                    #{i + 1}
                  </Text>
                  <Text style={[styles.top5Name, i === 0 && styles.top5NameFirst]}>
                    {item.name}
                  </Text>
                  <Text style={styles.top5Conf}>{Math.round(item.confidence * 100)}%</Text>
                  <View style={styles.top5Bar}>
                    <View
                      style={[
                        styles.top5BarFill,
                        { width: `${Math.round(item.confidence * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.locateBtn} onPress={askAI}>
                <Text style={styles.locateBtnText}>🤖 让 AI 讲解 {result.name}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom bar */}
        {!recognizing && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <Text style={styles.captureBtnText}>📸 拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickFromAlbum}>
              <Text style={styles.galleryBtnText}>🖼️ 相册</Text>
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

  // Top-5
  top5Title: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  top5Row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingRight: 4,
  },
  top5RowFirst: { paddingVertical: 8 },
  top5Rank: {
    width: 28, fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
  },
  top5RankFirst: { color: Colors.goldDark, fontSize: 14 },
  top5Name: {
    flex: 1, fontSize: 13, color: Colors.text,
  },
  top5NameFirst: { fontWeight: '700', fontSize: 14, color: Colors.ink },
  top5Conf: {
    width: 42, fontSize: 12, fontWeight: '600', color: Colors.goldDark, textAlign: 'right',
  },
  top5Bar: {
    position: 'absolute', bottom: 0, left: 30, right: 44,
    height: 2, backgroundColor: Colors.surface, borderRadius: 1,
  },
  top5BarFill: {
    height: 2, backgroundColor: Colors.goldLight, borderRadius: 1,
  },

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

  // Low confidence
  lowConfCard: {
    marginTop: Spacing.lg, width: '100%',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.divider,
    alignItems: 'center', ...Shadows.md,
  },
  lowConfIcon: { fontSize: 40, marginBottom: Spacing.md },
  lowConfTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
  lowConfDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  retryCaptureBtn: {
    backgroundColor: Colors.goldDark, borderRadius: BorderRadius.md,
    paddingHorizontal: 32, paddingVertical: 10,
  },
  retryCaptureBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Scenic result
  resultCard: {
    marginTop: Spacing.lg, width: '100%',
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, ...Shadows.md,
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'flex-start',
    alignItems: 'center', marginBottom: Spacing.sm,
    gap: 8,
  },
  resultIcon: { fontSize: 28 },
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
  galleryBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.goldLight,
  },
  galleryBtnText: { color: Colors.goldDark, fontSize: 16, fontWeight: '600' },
  retryBtn: {
    paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md,
    paddingVertical: 14, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
});
