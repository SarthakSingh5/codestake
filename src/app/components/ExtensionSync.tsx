"use client";
import { useEffect } from "react";

export default function ExtensionSync({ userId }: { userId: string }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Broadcast the auth sync so the Chrome Extension content script can catch it.
      // We use an interval to ensure the content script catches it even if it loads slightly after React.
      const intervalId = setInterval(() => {
        window.postMessage({ type: "CODESTAKE_AUTH_SYNC", userId: userId }, "*");
      }, 1000);
      
      window.postMessage({ type: "CODESTAKE_AUTH_SYNC", userId: userId }, "*");
      console.log("CodeStake Website: Broadcasting Auth Sync to Extension...");
      
      return () => clearInterval(intervalId);
    }
  }, [userId]);

  return null; // This component is completely invisible
}
