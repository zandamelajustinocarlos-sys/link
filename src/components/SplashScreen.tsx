import styles from "./SplashScreen.module.css";

type SplashScreenProps = {
  message?: string;
};

export default function SplashScreen({
  message = "A preparar as tuas conexões...",
}: SplashScreenProps) {
  return (
    <main
      className={styles.screen}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={styles.content}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            link<span className={styles.dot}>.</span>
          </span>

          <p className={styles.tagline}>
            Conecta-te. Partilha. Cresce.
          </p>
        </div>

        <div className={styles.loading}>
          <div
            className={styles.progressTrack}
            aria-hidden="true"
          >
            <div className={styles.progressBar} />
          </div>

          <p className={styles.message}>{message}</p>
        </div>
      </div>

      <footer className={styles.footer}>
        A tua comunidade universitária, mais próxima.
      </footer>
    </main>
  );
}