'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getVideo, type Video as RemoteVideo } from '../firebase/functions';
import styles from './watch.module.css';

export default function WatchClient() {
  const params = useSearchParams();
  const vid = params.get('v') || '';
  const [video, setVideo] = useState<RemoteVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vid) {
      setError('No video id provided.');
      setLoading(false);
      return;
    }
    getVideo(vid)
      .then((v) => {
        setVideo(v);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load video.');
        setLoading(false);
      });
  }, [vid]);

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;
  if (!video) return <p className={styles.error}>Video not found.</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{video.title || 'Untitled'}</h1>
      <video
        className={styles.player}
        controls
        poster={video.thumbnailUrl}
        crossOrigin="anonymous"
      >
        {video.videoUrl720 && (
          <source src={video.videoUrl720} type="video/mp4" />
        )}
        {video.videoUrl360 && (
          <source src={video.videoUrl360} type="video/mp4" />
        )}
        Your browser doesn’t support HTML5 video.
      </video>
    </div>
  );
}
