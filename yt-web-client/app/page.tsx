import Link  from 'next/link';
import { getVideos } from './firebase/functions';
import styles        from './page.module.css';

export default async function Home() {
  const videos = await getVideos();

  return (
    <main className={styles.grid}>
      {videos.map(video => (
        <Link
          key={video.id}
          href={`/watch?v=${video.id}`}
          className={styles.card}
        >
          {video.thumbnailUrl ? (
            <img
              src={`${process.env.NEXT_PUBLIC_THUMBNAIL_BASE}/${video.id}.jpg`}
              width={400}
              height={225}
              alt={video.title}
              className={styles.thumbnail}
            />
          ) : (
            <div className={styles.thumbnailPlaceholder}>
              No thumbnail
            </div>
          )}
          <div className={styles.title}>
            {video.title || "Untitled"}
          </div>
        </Link>
      ))}
    </main>
  );
}

export const revalidate = 30;