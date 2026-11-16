import { deleteApp, initializeApp } from 'firebase/app';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  deleteUser,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'Admin' | 'Registrar' | 'Teacher' | 'Student' | 'Parent' | 'Business Office';

export function normalizeUserRole(role: unknown): UserRole {
  if (typeof role !== 'string') {
    throw new Error('The Firestore profile is missing a top-level role field stored as text.');
  }

  const normalizedRole = role.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

  switch (normalizedRole) {
    case 'admin':
      return 'Admin';
    case 'registrar':
      return 'Registrar';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    case 'parent':
      return 'Parent';
    case 'business office':
    case 'businessoffice':
      return 'Business Office';
    default:
      throw new Error(`Unsupported account role "${role}". Please contact an administrator.`);
  }
}

function getUserRole(profile: { role?: unknown }, uid: string): UserRole {
  if (typeof profile.role !== 'string') {
    throw new Error(
      `The Firestore document users/${uid} must have a top-level role field stored as text (for example, "Admin").`
    );
  }

  return normalizeUserRole(profile.role);
}

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: any;
  lastLogin?: any;
  // Student-specific fields
  program?: string;
  yearLevel?: string;
  semester?: string;
  studentId?: string;
  enrollmentType?: string;
  status?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  // Teacher-specific fields
  employeeId?: string;
  department?: string;
  // Parent-specific fields
  parentId?: string | null;
  linkedStudentId?: string;
  children?: string[];
}

export type ManagedUserProfile = Omit<UserData, 'uid' | 'createdAt' | 'lastLogin'> & {
  status: string;
};

export async function createManagedUser(
  profile: ManagedUserProfile,
  password: string
): Promise<string> {
  if (!password) {
    throw new Error('A password is required to create a user account.');
  }

  if (!auth || !db) {
    throw new Error('Your admin session expired. Please sign in again.');
  }

  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw new Error('Your admin session expired. Please sign in again.');
  }

  const secondaryApp = initializeApp(auth.app.options, `user-creation-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser: FirebaseUser | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, profile.email, password);
    createdUser = credential.user;

    await setDoc(doc(db, 'users', createdUser.uid), {
      uid: createdUser.uid,
      ...profile,
      createdBy: adminUser.email || adminUser.uid,
      createdAt: serverTimestamp(),
    });

    return createdUser.uid;
  } catch (error) {
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      } catch (cleanupError) {
        console.error('Failed to remove the Auth account after profile creation failed:', cleanupError);
      }
    }
    throw error;
  } finally {
    try {
      if (secondaryAuth.currentUser) {
        await signOut(secondaryAuth);
      }
    } catch (cleanupError) {
      console.error('Failed to sign out the temporary account:', cleanupError);
    }

    try {
      await deleteApp(secondaryApp);
    } catch (cleanupError) {
      console.error('Failed to clean up the temporary Firebase app:', cleanupError);
    }
  }
}

async function updateLastLogin(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastLogin: serverTimestamp(),
    });
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;

    if (errorCode === 'permission-denied') {
      console.warn('Signed in, but Firestore did not allow updating the last-login timestamp.', error);
      return;
    }

    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<UserData> {
  try {
    console.log('🔐 Step 1: Authenticating with Firebase Auth...', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ Step 1 Success: User authenticated. UID:', user.uid);

    // Get user data from Firestore
    console.log('📄 Step 2: Fetching user document from Firestore...');
    console.log('   Collection: users');
    console.log('   Document ID:', user.uid);
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    console.log('📄 Step 2 Result: Document exists?', userDoc.exists());
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found in Firestore!');
      console.error('   User exists in Firebase Authentication but NOT in Firestore Database');
      console.error('   UID:', user.uid);
      console.error('   Email:', user.email);
      console.error('   To fix: Admin must create this user in Firestore with the same UID');
      
      // Sign out the user since they don't have Firestore data
      await signOut(auth);
      
      throw new Error('User data not found. Please contact administrator.');
    }

    const userData = userDoc.data() as UserData;
    console.log('✅ Step 2 Success: User data retrieved:', {
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role
    });

    // Update last login
    console.log('🔄 Step 3: Updating last login timestamp...');
    await updateLastLogin(user.uid);
    console.log('✅ Step 3 Success: Last login updated');

    console.log('🎉 Login successful!');
    return {
      uid: user.uid,
      email: user.email || '',
      name: userData.name,
      role: getUserRole(userData, user.uid),
      // Student-specific fields
      program: userData.program,
      yearLevel: userData.yearLevel,
      semester: userData.semester,
      studentId: userData.studentId,
      enrollmentType: userData.enrollmentType,
      // Teacher-specific fields
      employeeId: userData.employeeId,
      department: userData.department,
      // Parent-specific fields
      parentId: userData.parentId,
      linkedStudentId: userData.linkedStudentId,
    };
  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Check if it's a Firestore permission error
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore security rules.');
    }
    
    throw new Error(error.message || 'Failed to sign in');
  }
}

/**
 * Sign in with Google
 */
export async function loginWithGoogle(): Promise<UserData> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('Account not found. Please contact administrator to create your account first.');
    }

    const userData = userDoc.data() as UserData;

    // Update last login
    await updateLastLogin(user.uid);

    return {
      uid: user.uid,
      email: user.email || '',
      name: userData.name,
      role: getUserRole(userData, user.uid),
      // Student-specific fields
      program: userData.program,
      yearLevel: userData.yearLevel,
      semester: userData.semester,
      studentId: userData.studentId,
      enrollmentType: userData.enrollmentType,
      // Teacher-specific fields
      employeeId: userData.employeeId,
      department: userData.department,
      // Parent-specific fields
      parentId: userData.parentId,
      linkedStudentId: userData.linkedStudentId,
    };
  } catch (error: any) {
    console.error('Google login error:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

/**
 * Sign out
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Failed to send password reset email');
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user data
 */
export async function getCurrentUserData(): Promise<UserData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as UserData;
    return {
      uid: user.uid,
      email: user.email || '',
      name: userData.name,
      role: getUserRole(userData, user.uid),
      // Student-specific fields
      program: userData.program,
      yearLevel: userData.yearLevel,
      semester: userData.semester,
      studentId: userData.studentId,
      enrollmentType: userData.enrollmentType,
      // Teacher-specific fields
      employeeId: userData.employeeId,
      department: userData.department,
      // Parent-specific fields
      parentId: userData.parentId,
      linkedStudentId: userData.linkedStudentId,
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}