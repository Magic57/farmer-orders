import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, Farm } from '../types';

export const AuthService = {
  // Слушатель состояния входа
  subscribeAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Получить профиль текущего пользователя
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (e) {
      console.error('Ошибка получения профиля:', e);
      return null;
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
    await signOut(auth);
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    await setDoc(doc(db, 'users', uid), { role }, { merge: true });
  },
};
