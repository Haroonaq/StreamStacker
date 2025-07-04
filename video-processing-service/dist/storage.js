"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDirectories = setupDirectories;
exports.convertVideo = convertVideo;
exports.downloadRawVideo = downloadRawVideo;
exports.uploadProcessedVideo = uploadProcessedVideo;
exports.deleteRawVideo = deleteRawVideo;
exports.deleteProcessedVideo = deleteProcessedVideo;
exports.deleteThumbnail = deleteThumbnail;
exports.generateThumbnail = generateThumbnail;
exports.uploadThumbnail = uploadThumbnail;
const storage_1 = require("@google-cloud/storage");
const fs_1 = __importDefault(require("fs"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const storage = new storage_1.Storage();
const rawVideoBucketName = "haroon-yt-raw-videos";
const processedVideoBucketName = "haroon-yt-processed-videos";
const thumbnailsBucketName = "haroon-yt-thumbnails";
const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";
const localThumbnailsPath = "./thumbnails";
/**
 * Created the local directories for raw and processed videos.
 */
function setupDirectories() {
    ensureDirectoryExistence(localRawVideoPath);
    ensureDirectoryExistence(localProcessedVideoPath);
    ensureDirectoryExistence(localThumbnailsPath);
}
/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */
function convertVideo(rawVideoName, processedVideoName) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(`${localRawVideoPath}/${rawVideoName}`)
            .outputOptions("-vf", "scale=-1:360") //360p
            .on("end", () => {
            console.log("Processing finished successfully");
            resolve();
        })
            .on("error", (err) => {
            console.log(`An error occured: ${err.message}`);
            reject(err);
        })
            .save(`${localProcessedVideoPath}/${processedVideoName}`);
    });
}
/**
 * @param fileName - The name of the file to download from the
 * {@link rawVideoBucketName} bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file had been downloaded.
 */
function downloadRawVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield storage.bucket(rawVideoBucketName)
            .file(fileName)
            .download({ destination: `${localRawVideoPath}/${fileName}` });
        console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to  ${localRawVideoPath}/${fileName}.`);
    });
}
/**
 * @param fileName - The name of the file to upload from the
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName}.
 * @returns A promise that resolves when the file has been uploaded.
 */
function uploadProcessedVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucket = storage.bucket(processedVideoBucketName);
        yield bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
            destination: fileName
        });
        console.log(`${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`);
        yield bucket.file(fileName).makePublic();
    });
}
/**
 * @param fileName - The name of the file to delete from the
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteRawVideo(fileName) {
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}
/**
 * @param fileName - The name of the file to delete from the
 * {@link localProcessedVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteProcessedVideo(fileName) {
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}
/**
 * Deletes a thumbnail from the local thumbnails directory
 * @param fileName - The name of the thumbnail file to delete
 * @returns A promise that resolves when the thumbnail has been deleted
 */
function deleteThumbnail(fileName) {
    return deleteFile(`${localThumbnailsPath}/${fileName}`);
}
function ensureDirectoryExistence(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
}
function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        fs_1.default.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
                reject(err);
            }
            else {
                console.log(`File ${filePath} deleted successfully`);
                resolve();
            }
        });
    });
}
/**
 * Generates a thumbnail from a video file
 * @param videoName - The name of the video file to generate thumbnail from
 * @param thumbnailName - The name of the thumbnail file to generate
 * @returns A promise that resolves when the thumbnail has been generated
 */
function generateThumbnail(videoName, thumbnailName) {
    console.log(`[THUMBNAIL] Generating thumbnail for video: ${videoName}, output: ${thumbnailName}`);
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(`${localRawVideoPath}/${videoName}`)
            .screenshots({
            timestamps: ['00:00:01'],
            filename: thumbnailName,
            folder: localThumbnailsPath,
            size: '320x180'
        })
            .on('end', () => {
            console.log(`[THUMBNAIL] Thumbnail generated successfully: ${localThumbnailsPath}/${thumbnailName}`);
            resolve();
        })
            .on('error', (err) => {
            console.log(`[THUMBNAIL] Error generating thumbnail for ${videoName}: ${err.message}`);
            reject(err);
        });
    });
}
/**
 * Uploads a thumbnail to Cloud Storage
 * @param fileName - The name of the thumbnail file to upload
 * @returns A promise that resolves when the thumbnail has been uploaded
 */
function uploadThumbnail(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const bucket = storage.bucket(thumbnailsBucketName);
        const localPath = `${localThumbnailsPath}/${fileName}`;
        console.log(`[THUMBNAIL] Uploading thumbnail: ${localPath} to bucket: ${thumbnailsBucketName}`);
        yield bucket.upload(localPath, {
            destination: fileName
        });
        console.log(`[THUMBNAIL] Uploaded thumbnail to gs://${thumbnailsBucketName}/${fileName}`);
        yield bucket.file(fileName).makePublic();
        console.log(`[THUMBNAIL] Made thumbnail public: gs://${thumbnailsBucketName}/${fileName}`);
    });
}
