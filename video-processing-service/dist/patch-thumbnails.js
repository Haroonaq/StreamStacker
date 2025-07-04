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
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("@google-cloud/storage");
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)({ credential: (0, app_1.applicationDefault)() });
const firestore = new firestore_1.Firestore();
const storage = new storage_1.Storage();
const videoCollectionId = 'videos';
const thumbnailsBucketName = 'haroon-yt-thumbnails';
function patchThumbnails() {
    return __awaiter(this, void 0, void 0, function* () {
        const snapshot = yield firestore.collection(videoCollectionId).get();
        const bucket = storage.bucket(thumbnailsBucketName);
        let updated = 0;
        let skipped = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const videoId = data.id || doc.id;
            const thumbnailFileName = `${videoId}.jpg`;
            // Skip if already has a thumbnail
            if (data.thumbnail) {
                skipped++;
                continue;
            }
            // Check if thumbnail exists in the bucket
            const [exists] = yield bucket.file(thumbnailFileName).exists();
            if (exists) {
                yield doc.ref.set({ thumbnail: thumbnailFileName }, { merge: true });
                console.log(`Patched video ${videoId} with thumbnail ${thumbnailFileName}`);
                updated++;
            }
            else {
                console.log(`No thumbnail found for video ${videoId}`);
            }
        }
        console.log(`Patch complete. Updated: ${updated}, Skipped: ${skipped}`);
    });
}
patchThumbnails().catch((err) => {
    console.error('Error patching thumbnails:', err);
    process.exit(1);
});
