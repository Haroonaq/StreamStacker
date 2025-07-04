import express, { Request, Response } from "express";
import admin from "firebase-admin";
import {
  setupDirectories,
  downloadRawVideo,
  convertVideo,
  uploadProcessedVideo,
  generateThumbnail,
  uploadThumbnail,
  deleteRawVideo,
  deleteProcessedVideo,
  deleteThumbnail,
} from "./storage";
import { setVideo } from "./firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

setupDirectories();

// Firestore client
const db = admin.firestore();

// Express app
const app = express();
app.use(express.json());

// Single handler for Pub/Sub → Cloud Run push
const processHandler = async (req: Request, res: Response) => {
  // Pub/Sub HTTP‐push wraps the message here
  interface PubSubBody {
    message: { data: string };
  }

  let data: { name: string };
  try {
    const body = req.body as PubSubBody;
    const decoded = Buffer.from(body.message.data, "base64").toString("utf8");
    data = JSON.parse(decoded);
    if (!data.name) throw new Error("Missing data.name");
  } catch (err) {
    console.error("Bad payload:", err);
    return res.status(400).send("Bad Request: missing filename.");
  }

  const inputFileName   = data.name;                     // e.g. "UID-ts.mp4"
  const videoId         = inputFileName.split(".")[0];   // strip extension
  const output360       = `360p-${inputFileName}`;
  const output720       = `720p-${inputFileName}`;
  const thumbFileName   = `${videoId}.jpg`;

  const docRef = db.collection("videos").doc(videoId);
  const snap   = await docRef.get();
  if (snap.exists) {
    console.log(`Skipping ${videoId}: already seen`);
    return res.status(200).send("Already processing/processed.");
  }

  // Mark Firestore doc as "processing"
  await setVideo(videoId, {
    id:     videoId,
    uid:    videoId.split("-")[0],
    status: "processing",
  });

  try {
    // Download raw file
    await downloadRawVideo(inputFileName);

    // Transcode 360p + 720p
    await convertVideo(inputFileName, output360, 360);
    await convertVideo(inputFileName, output720, 720);

    // Upload both renditions
    await uploadProcessedVideo(output360);
    await uploadProcessedVideo(output720);

    // Generate & upload thumbnail
    await generateThumbnail(inputFileName, thumbFileName);
    await uploadThumbnail(thumbFileName);

    // Update Firestore doc with public URLs
    const bucketVideos = process.env.PROCESSED_BUCKET!;
    const bucketThumbs = process.env.THUMBNAIL_BUCKET!;
    const videoUrl360  = `https://storage.googleapis.com/${bucketVideos}/${output360}`;
    const videoUrl720  = `https://storage.googleapis.com/${bucketVideos}/${output720}`;
    const thumbnailUrl = `https://storage.googleapis.com/${bucketThumbs}/thumbnails/${thumbFileName}`;

    await setVideo(videoId, {
      status:       "processed",
      filename:     inputFileName,
      title:        inputFileName.replace(/\.[^/.]+$/, ""),
      videoUrl360,
      videoUrl720,
      thumbnailUrl,
    });
  } catch (err) {
    console.error("Processing failed:", err);
    // Clean up all local files if anything errs
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(output360),
      deleteProcessedVideo(output720),
      deleteThumbnail(thumbFileName),
    ]);
    return res.status(500).send("Processing failed.");
  }

  // Purge local temp files
  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(output360),
    deleteProcessedVideo(output720),
    deleteThumbnail(thumbFileName),
  ]);

  return res.status(200).send("Finished successfully.");
};


app.post("/process-video", processHandler);


const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
