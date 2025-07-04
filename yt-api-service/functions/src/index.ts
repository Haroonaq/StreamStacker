import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { Firestore }      from "firebase-admin/firestore";
import * as logger        from "firebase-functions/logger";
import { Storage }        from "@google-cloud/storage";
import { onCall }         from "firebase-functions/v2/https";

initializeApp();
const firestore = new Firestore();
const storage   = new Storage();

// Buckets
const rawVideoBucketName       = "haroon-yt-raw-videos";
const processedVideoBucketName = "haroon-yt-processed-videos";
const thumbnailBucketName      = "haroon-yt-thumbnails";

// Firestore collection
const videoCollectionId = "videos";

export const createUser = functions.auth.user().onCreate((user) => {
  const userInfo = {
    uid:      user.uid,
    email:    user.email,
    photoUrl: user.photoURL,
  };
  firestore.collection("users").doc(user.uid).set(userInfo);
  logger.info(`User Created: ${JSON.stringify(userInfo)}`);
  return;
});

export const generateUploadUrl = onCall({ maxInstances: 1 }, async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Authentication required."
    );
  }
  const uid      = request.auth.uid;
  const ext      = request.data.fileExtension as string;
  const fileName = `${uid}-${Date.now()}.${ext}`;
  const bucket   = storage.bucket(rawVideoBucketName);

  const [url] = await bucket.file(fileName).getSignedUrl({
    version: "v4",
    action:  "write",
    expires: Date.now() + 15 * 60 * 1000,
  });

  return { url, fileName };
});

export const getVideos = onCall({ maxInstances: 1 }, async () => {
  const snap = await firestore
    .collection(videoCollectionId)
    .limit(10)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data() as any;
    const base = d.filename as string;

    return {
      id:           doc.id,
      uid:          d.uid,
      status:       d.status,
      filename:     base,
      title:        d.title       || "",
      description:  d.description || "",

      videoUrl360:  `https://storage.googleapis.com/${processedVideoBucketName}/360p-${base}`,
      videoUrl720:  `https://storage.googleapis.com/${processedVideoBucketName}/720p-${base}`,
      thumbnailUrl: `https://storage.googleapis.com/${thumbnailBucketName}/thumbnails/${doc.id}.jpg`,
    };
  });
});

export const getVideo = onCall({ maxInstances: 1 }, async (request) => {
  const videoId = request.data.videoId as string;
  if (!videoId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Must supply videoId"
    );
  }

  const docSnap = await firestore
    .collection(videoCollectionId)
    .doc(videoId)
    .get();

  if (!docSnap.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      `No video with ID ${videoId}`
    );
  }

  const d    = docSnap.data() as any;
  const base = d.filename as string;

  return {
    id:           videoId,
    uid:          d.uid,
    status:       d.status,
    filename:     base,
    title:        d.title       || "",
    description:  d.description || "",

    videoUrl360:  `https://storage.googleapis.com/${processedVideoBucketName}/360p-${base}`,
    videoUrl720:  `https://storage.googleapis.com/${processedVideoBucketName}/720p-${base}`,
    thumbnailUrl: `https://storage.googleapis.com/${thumbnailBucketName}/thumbnails/${videoId}.jpg`,
  };
});
