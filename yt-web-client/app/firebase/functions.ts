import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const generateUploadUrl = httpsCallable(functions, "generateUploadUrl");
const getVideosFn       = httpsCallable(functions, "getVideos");
const getVideoFn        = httpsCallable(functions, "getVideo");

export interface Video {
  id:            string;
  uid:           string;
  filename:      string;
  status:        "processing" | "processed";
  title?:        string;
  description?:  string;
  thumbnailUrl?: string;
  videoUrl360?:  string;
  videoUrl720?:  string;
}

/**
 * Uploads a video file by first fetching a signed‐put URL from the backend,
 * then streaming the bytes up directly to GCS.
 */
export async function uploadVideo(file: File): Promise<void> {
  const resp: any = await generateUploadUrl({
    fileExtension: file.name.split(".").pop(),
  });
  const { url } = resp.data;  // only use the URL

  await fetch(url, {
    method:  "PUT",
    body:    file,
    headers: { "Content-Type": file.type },
  });
}

/**
 * Fetches up to 10 videos from Firestore, adding a public URL for playback.
 */
export async function getVideos(): Promise<Video[]> {
  const res  = await getVideosFn();
  const vids = res.data as Video[];

  return vids.map((v) => {
    const base = v.filename!;
    return {
      ...v,
      videoUrl360: `https://storage.googleapis.com/haroon-yt-processed-videos/360p-${base}`,
      videoUrl720: `https://storage.googleapis.com/haroon-yt-processed-videos/720p-${base}`,
    };
  });
}

/**
 * Fetches a single video by its ID, adding public URLs for playback.
 */
export async function getVideo(videoId: string): Promise<Video> {
  const res = await getVideoFn({ videoId });
  const v   = res.data as Video;
  const base = v.filename!;

  return {
    ...v,
    videoUrl360: `https://storage.googleapis.com/haroon-yt-processed-videos/360p-${base}`,
    videoUrl720: `https://storage.googleapis.com/haroon-yt-processed-videos/720p-${base}`,
  };
}
