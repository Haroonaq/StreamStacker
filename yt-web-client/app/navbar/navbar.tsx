'use client';
import SignIn from "./sign-in";
import Link from "next/link";
import Image from 'next/image'; 
import Upload from "./upload";

import styles from "./navbar.module.css";
import { useEffect, useState } from "react";
import { onAuthStateChangedHelper } from "../firebase/firebase";
import { User } from "firebase/auth";

function NavBar() {
  // Initialize user state
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper((user) => {
      setUser(user);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [] /* No dependencies, never rerun */);

  return (
    <nav className={styles.nav}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <Link href="/">
          <Image height={48} width={0} style={{ width: 'auto', height: 48 }}
            src="/StreamStacker-logo.svg" alt="StreamStacker Logo"/>
        </Link>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {user && <Upload />}
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <SignIn user={user} />
      </div>
    </nav>
  );
}

export default NavBar;
