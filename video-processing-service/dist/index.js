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
const express_1 = __importDefault(require("express"));
const storage_1 = require("./storage");
const firestore_1 = require("./firestore");
(0, storage_1.setupDirectories)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/process-video", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //Get the bucket and filename from the Cloud Pub/Sub message
    let data;
    try {
        const message = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
        data = JSON.parse(message);
        if (!data.name) {
            throw new Error('Invalid message payload received.');
        }
    }
    catch (error) {
        console.error("[PROCESS-VIDEO] Error parsing message:", error);
        return res.status(400).send('Bad Request: missing filename.');
    }
    const inputFileName = data.name; // Format of <UID>-<DATE>.<EXTENSION>
    const outputFileName = `processed-${inputFileName}`;
    const videoId = inputFileName.split('.')[0];
    const thumbnailFileName = `${videoId}.jpg`;
    if (!(yield (0, firestore_1.isVideoNew)(videoId))) {
        return res.status(400).send('Bad Request: video already processing or processed');
    }
    else {
        yield (0, firestore_1.setVideo)(videoId, {
            id: videoId,
            uid: videoId.split('-')[0],
            status: 'processing'
        });
    }
    try {
        // Download the raw video from Cloud Storage
        yield (0, storage_1.downloadRawVideo)(inputFileName);
        // Generate thumbnail from video
        yield (0, storage_1.generateThumbnail)(inputFileName, thumbnailFileName);
        yield (0, storage_1.uploadThumbnail)(thumbnailFileName);
        //Convert the video to 360p
        yield (0, storage_1.convertVideo)(inputFileName, outputFileName);
        yield (0, storage_1.uploadProcessedVideo)(outputFileName);
        console.log("[PROCESS-VIDEO] About to update Firestore with processed status and fields");
        yield (0, firestore_1.setVideo)(videoId, {
            id: videoId,
            uid: videoId.split('-')[0],
            status: 'processed',
            filename: outputFileName,
            thumbnail: thumbnailFileName
        });
        console.log("[PROCESS-VIDEO] Firestore updated successfully");
        // Clean up local files
        yield Promise.all([
            (0, storage_1.deleteRawVideo)(inputFileName),
            (0, storage_1.deleteProcessedVideo)(outputFileName),
            (0, storage_1.deleteThumbnail)(thumbnailFileName)
        ]);
        return res.status(200).send('Processing finished successfully.');
    }
    catch (err) {
        // Clean up local files in case of error
        yield Promise.all([
            (0, storage_1.deleteRawVideo)(inputFileName),
            (0, storage_1.deleteProcessedVideo)(outputFileName),
            (0, storage_1.deleteThumbnail)(thumbnailFileName)
        ]);
        console.error("[PROCESS-VIDEO] Error during processing:", err);
        return res.status(500).send('Internal Server Error: video processing failed.');
    }
}));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Video processing service listening at http://localhost:${port}`);
});
