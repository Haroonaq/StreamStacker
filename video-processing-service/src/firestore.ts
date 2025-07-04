import { initializeApp } from "firebase-admin/app";
import { Firestore } from "firebase-admin/firestore";

initializeApp();

// Create a Firestore client
const firestore = new Firestore();
const videoCollectionId = 'videos';

/**
 * Shape of a video document in Firestore.
 */
export interface Video {
  id?: string;
  uid?: string;
  filename?: string;
  status?: 'processing' | 'processed';
  title?: string;
  description?: string;
  videoUrl360?: string;   
  videoUrl720?: string;        
  thumbnailUrl?: string;   
}

/**
 * Read a single video document by ID.
 */
export async function getVideo(videoID: string): Promise<Video> {
  const snapshot = await firestore
    .collection(videoCollectionId)
    .doc(videoID)
    .get();
  return (snapshot.data() as Video) ?? {};
}

/**
 * Write or merge fields into a video document.
 * Accepts partial updates, so you can update only certain fields.
 */
export function setVideo(
  videoId: string,
  data: Partial<Video>
): Promise<FirebaseFirestore.WriteResult> {
  return firestore
    .collection(videoCollectionId)
    .doc(videoId)
    .set(data, { merge: true });
}