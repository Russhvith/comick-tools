import { Spinner } from "@/components/atoms/Spinner";
import styles from "./RestartOverlay.module.css";

export function RestartOverlay() {
  return (
    <div className={styles.overlay} role="status">
      <div className={styles.card}>
        <Spinner size={20} />
        <div>
          <h2 className={styles.title}>Restarting on the new version</h2>
          <p className={styles.text}>The page reloads by itself once the server is back.</p>
        </div>
      </div>
    </div>
  );
}
