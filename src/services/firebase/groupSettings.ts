import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from './config'

export interface GroupWebSettings {
  openRegistration: boolean
}

const SETTINGS_PATH = ['meta', 'settings'] as const

export const DEFAULT_GROUP_WEB_SETTINGS: GroupWebSettings = {
  openRegistration: true,
}

export const readGroupWebSettings = async (): Promise<GroupWebSettings> => {
  try {
    const snap = await getDoc(doc(getFirestoreDb(), ...SETTINGS_PATH))
    if (!snap.exists()) return { ...DEFAULT_GROUP_WEB_SETTINGS }
    const data = snap.data() as { openRegistration?: unknown }
    return {
      openRegistration: data.openRegistration !== false,
    }
  } catch {
    return { ...DEFAULT_GROUP_WEB_SETTINGS }
  }
}

export const writeGroupWebSettings = async (settings: GroupWebSettings): Promise<void> => {
  await setDoc(doc(getFirestoreDb(), ...SETTINGS_PATH), {
    openRegistration: settings.openRegistration === true,
  }, { merge: true })
}
