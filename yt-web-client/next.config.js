/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    // Allow both GCS and your video‐processing service
    domains: [
      'storage.googleapis.com',
      'video-processing-services-881780933747.us-central1.run.app'
    ]
  }
}
