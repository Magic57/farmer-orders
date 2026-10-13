import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Product, UnitType } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const EditProductScreen = () => {
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const existingProduct: Product | undefined = route.params?.product;

  const [name, setName] = useState(existingProduct?.name || '');
  const [unit, setUnit] = useState<UnitType>(existingProduct?.unit || 'kg');
  const [price, setPrice] = useState(existingProduct ? existingProduct.pricePerUnit.toString() : '');
  const [imageUri, setImageUri] = useState<string | undefined>(existingProduct?.imageUri);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Доступ запрещен', 'Требуются права на чтение галереи для загрузки фото.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Укажите название товара');
      return;
    }
    const cleanPrice = price.replace(',', '.');
    const parsedPrice = parseFloat(cleanPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Ошибка', 'Введите корректную цену (больше 0)');
      return;
    }

    try {
      const productToSave: Product = {
        id: existingProduct?.id || Date.now().toString(),
        name: name.trim(),
        unit,
        pricePerUnit: parsedPrice,
        imageUri,
        farmId: user?.farmId || '',
        createdAt: existingProduct?.createdAt || Date.now(),
      };

      await StorageService.saveProduct(productToSave, user?.farmId);
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Ошибка сохранения', e.message || 'Не удалось сохранить товар');
    }
  };

  const handleDelete = () => {
    if (!existingProduct) return;
    Alert.alert('Удаление', 'Вы действительно хотите удалить этот товар?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await StorageService.deleteProduct(existingProduct.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Название товара</Text>
      <TextInput
        style={styles.input}
        placeholder="Например: Сыр козий домашний"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Единица измерения</Text>
      <View style={styles.unitSelector}>
        <TouchableOpacity
          style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
          onPress={() => setUnit('kg')}
        >
          <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>
            За килограмм (кг)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitBtn, unit === 'piece' && styles.unitBtnActive]}
          onPress={() => setUnit('piece')}
        >
          <Text style={[styles.unitBtnText, unit === 'piece' && styles.unitBtnTextActive]}>
            За штуку (шт)
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Цена за единицу (₽)</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Фотография товара</Text>
      <View style={styles.photoContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <View style={[styles.imagePreview, styles.emptyPhoto]}>
            <Text style={styles.emptyPhotoText}>Фото не выбрано</Text>
          </View>
        )}
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Text style={styles.photoBtnText}>
            {imageUri ? 'Изменить фото' : 'Прикрепить фото'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Сохранить</Text>
      </TouchableOpacity>

      {existingProduct && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Удалить товар</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  unitBtn: {
    flex: 1,
    backgroundColor: theme.colors.cardBg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginRight: 6,
    borderRadius: theme.radius.sm,
  },
  unitBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitBtnText: {
    color: theme.colors.textMain,
    fontWeight: '600',
  },
  unitBtnTextActive: {
    color: theme.colors.white,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  imagePreview: {
    width: 130,
    height: 130,
    borderRadius: theme.radius.md,
    backgroundColor: '#EBE5D8',
    marginBottom: 10,
  },
  emptyPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyPhotoText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  photoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
  },
  photoBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
