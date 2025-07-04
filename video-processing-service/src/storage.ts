import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

const storage = new Storage();

// Bucket names
const rawVideoBucketName       = "haroon-yt-raw-videos";
const processedVideoBucketName = "haroon-yt-processed-videos";
const thumbnailBucketName      = "haroon-yt-thumbnails";

// Local temp folders
const localRawVideoPath       = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";
const localThumbnailPath      = "./thumbnails";

export function setupDirectories() {
  [localRawVideoPath, localProcessedVideoPath, localThumbnailPath].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

export async function downloadRawVideo(fileName: string) {
  await storage
    .bucket(rawVideoBucketName)
    .file(fileName)
    .download({ destination: path.join(localRawVideoPath, fileName) });
  console.log(`Downloaded gs://${rawVideoBucketName}/${fileName}`);
}

export function convertVideo(
  rawFileName: string,
  outFileName: string,
  height: number = 360
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(path.join(localRawVideoPath, rawFileName))
      .outputOptions("-vf", `scale=-1:${height}`)
      .on("end", () => {
        console.log(`Converted ${rawFileName} → ${outFileName} @${height}p`);
        resolve();
      })
      .on("error", err => {
        console.error(`Error converting to ${height}p:`, err.message);
        reject(err);
      })
      .save(path.join(localProcessedVideoPath, outFileName));
  });
}

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);
  const localPath = path.join(localProcessedVideoPath, fileName);
  await bucket.upload(localPath, { destination: fileName });
  console.log(`Uploaded ${fileName} → gs://${processedVideoBucketName}/${fileName}`);
  // **no more** await bucket.file(fileName).makePublic();
}

export function generateThumbnail(
  rawFileName: string,
  thumbFileName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(path.join(localRawVideoPath, rawFileName))
      .screenshots({
        timestamps: ["1"],
        filename: thumbFileName,
        folder:   localThumbnailPath,
        size:     "320x180",
      })
      .on("end", () => {
        console.log(`Thumbnail generated: ${thumbFileName}`);
        resolve();
      })
      .on("error", err => {
        console.error("Thumbnail generation error:", err);
        reject(err);
      });
  });
}

export async function uploadThumbnail(thumbFileName: string) {
  const bucket = storage.bucket(thumbnailBucketName);
  const localPath = path.join(localThumbnailPath, thumbFileName);
  const destination = `thumbnails/${thumbFileName}`;
  await bucket.upload(localPath, { destination });
  console.log(`Uploaded thumbnail → gs://${thumbnailBucketName}/${destination}`);
  // **no more** await bucket.file(destination).makePublic();
}

export function deleteRawVideo(fileName: string) {
  return deleteFile(path.join(localRawVideoPath, fileName));
}

export function deleteProcessedVideo(fileName: string) {
  return deleteFile(path.join(localProcessedVideoPath, fileName));
}

export function deleteThumbnail(fileName: string) {
  return deleteFile(path.join(localThumbnailPath, fileName));
}

function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, err => {
      if (err) {
        console.error(`Error deleting ${filePath}:`, err);
        reject(err);
      } else {
        console.log(`Deleted local file ${filePath}`);
        resolve();
      }
    });
  });
}