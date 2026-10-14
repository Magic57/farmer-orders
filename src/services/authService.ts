import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, Farm } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_USER_KEY = '@farmer_cached_user';

export const AuthService = {
  // Слушатель состояния входа
  subscribeAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Получить профиль из локального кеша (работает мгновенно и без интернета)
  async getCachedProfile(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(CACHED_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Сохранить профиль в локальный кеш
  async saveCachedProfile(profile: UserProfile | null): Promise<void> {
    try {
      if (profile) {
        await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
      } else {
        await AsyncStorage.removeItem(CACHED_USER_KEY);
      }
    } catch (e) {
      console.error('Ошибка сохранения кеша пользователя:', e);
    }
  },

  // Получить профиль текущего пользователя
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        await this.saveCachedProfile(profile);
        return profile;
      }
      // Если snap не существует на сервере, проверяем кеш
      return await this.getCachedProfile();
    } catch (e) {
      console.warn('Сетевая ошибка получения профиля, используем локальный кеш:', e);
      return await this.getCachedProfile();
    }
  },

  // Регистрация с созданием НОВОГО хозяйства
  async registerWithNewFarm(
    email: string,
    pass: string,
    name: string,
    farmName: string,
    role: UserRole
  ): Promise<UserProfile> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;

    // Генерируем 6-значный читаемый код хозяйства (например: FERMA-4912)
    const codeDigits = Math.floor(1000 + Math.random() * 9000);
    const inviteCode = `FARM-${codeDigits}`;
    const farmId = doc(collection(db, 'farms')).id;

    const newFarm: Farm = {
      id: farmId,
      name: farmName.trim(),
      inviteCode,
      createdAt: Date.now(),
      ownerUid: uid,
    };
    await setDoc(doc(db, 'farms', farmId), newFarm);

    const profile: UserProfile = {
      uid,
      email: email.trim(),
      name: name.trim(),
      role,
      farmId,
      farmName: farmName.trim(),
      inviteCode,
    };
    await setDoc(doc(db, 'users', uid), profile);

    return profile;
  },

  // Регистрация с присоединением к СУЩЕСТВУЮЩЕМУ хозяйству по коду
  async registerJoinFarm(
    email: string,
    pass: string,
    name: string,
    inviteCode: string,
    role: UserRole
  ): Promise<UserProfile> {
    const codeClean = inviteCode.trim().toUpperCase();

    // Ищем хозяйство по коду
    const q = query(collection(db, 'farms'), where('inviteCode', '==', codeClean));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Хозяйство с кодом "${codeClean}" не найдено. Проверьте код у владельца.`);
    }

    const farmDoc = snap.docs[0];
    const farm = farmDoc.data() as Farm;

    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;

    const profile: UserProfile = {
      uid,
      email: email.trim(),
      name: name.trim(),
      role,
      farmId: farm.id,
      farmName: farm.name,
      inviteCode: farm.inviteCode,
    };
    await setDoc(doc(db, 'users', uid), profile);

    return profile;
  },

  // Обычный вход по Email и паролю
  async login(email: string, pass: string): Promise<UserProfile> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const profile = await this.getUserProfile(cred.user.uid);
    if (!profile) {
      throw new Error('Профиль пользователя не найден.');
    }
    return profile;
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } finally {
      await this.saveCachedProfile(null);
    }
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    await setDoc(doc(db, 'users', uid), { role }, { merge: true }).catch(() => {});
    const cached = await this.getCachedProfile();
    if (cached && cached.uid === uid) {
      await this.saveCachedProfile({ ...cached, role });
    }
  },

  // Получить список всех пользователей хозяйства
  async getFarmUsers(farmId: string): Promise<UserProfile[]> {
    if (!farmId) return [];
    try {
      const q = query(collection(db, 'users'), where('farmId', '==', farmId));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      return list;
    } catch (e) {
      console.error('Ошибка получения пользователей фермы:', e);
      return [];
    }
  },

  // Удалить пользователя из хозяйства (удаляет документ из базы)
  async removeUserFromFarm(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid));
  },

  // Полное удаление своего аккаунта из базы и из Firebase Auth (освобождает email для повторной регистрации)
  async deleteCurrentAccount(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      const uid = user.uid;
      // 1. Удаляем профиль пользователя из Firestore
      await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      // 2. Удаляем аккаунт из Firebase Auth
      await deleteUser(user);
    }
  },
};
