import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp,
  DocumentData,
} from 'firebase/firestore';

export interface FeedbackItem {
  id?: string;
  queryId: string;
  userId: string;
  section: 'laws' | 'precedents' | 'checklist' | 'overall';
  rating: number; // 1-5 stars
  comments?: string;
  timestamp: Date;
}

export async function saveFeedback(feedbackItem: Omit<FeedbackItem, 'timestamp'>) {
  try {
    const docRef = await addDoc(collection(db, 'feedback'), {
      ...feedbackItem,
      timestamp: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
}

export async function getFeedbackByQueryId(queryId: string): Promise<FeedbackItem[]> {
  try {
    const q = query(
      collection(db, 'feedback'),
      where('queryId', '==', queryId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        queryId: data.queryId,
        userId: data.userId,
        section: data.section,
        rating: data.rating,
        comments: data.comments,
        timestamp: data.timestamp.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    throw error;
  }
}

export async function getUserFeedback(userId: string): Promise<FeedbackItem[]> {
  try {
    const q = query(
      collection(db, 'feedback'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        queryId: data.queryId,
        userId: data.userId,
        section: data.section,
        rating: data.rating,
        comments: data.comments,
        timestamp: data.timestamp.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting user feedback:', error);
    throw error;
  }
}