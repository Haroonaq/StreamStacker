import { Suspense } from 'react'
import WatchClient from './watch'
import styles from './watch.module.css';

export default function WatchPage() {
  return (
    <main className={styles.watchMain}>
      <Suspense fallback={<p>Loading video…</p>}>
        <WatchClient />
      </Suspense>
    </main>
  )
}
