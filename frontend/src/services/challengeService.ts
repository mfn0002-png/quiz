import { collection, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Question } from '../data/questions';

export interface ChallengeParticipant {
  userId: string;
  displayName: string;
  photoURL: string | null;
  score: number;
  answers: (number | null)[];
}

export interface ChallengeDoc {
  id: string;
  questions: Question[];
  challenger: ChallengeParticipant;
  opponent: ChallengeParticipant | null;
  createdAt: Timestamp;
}

export const createChallenge = async (
  questions: Question[],
  challenger: Omit<ChallengeParticipant, 'answers'> & { answers: (number | null)[] }
): Promise<string> => {
  const challengesRef = collection(db, 'challenges');
  const newDocRef = doc(challengesRef);

  const data: Omit<ChallengeDoc, 'id'> = {
    questions,
    challenger,
    opponent: null,
    createdAt: Timestamp.now(),
  };

  await setDoc(newDocRef, data);
  return newDocRef.id;
};

export const getChallenge = async (challengeId: string): Promise<ChallengeDoc | null> => {
  const ref = doc(db, 'challenges', challengeId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...(snapshot.data() as Omit<ChallengeDoc, 'id'>) };
};

export const submitChallengeResult = async (
  challengeId: string,
  opponent: ChallengeParticipant
): Promise<void> => {
  const ref = doc(db, 'challenges', challengeId);
  await updateDoc(ref, { opponent });
};

export const buildChallengeLink = (challengeId: string): string => {
  const base = window.location.origin + window.location.pathname;
  return `${base}?challenge=${challengeId}`;
};
