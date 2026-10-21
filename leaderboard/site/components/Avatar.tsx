import styles from "./Avatar.module.css";

function initials(name: string): string {
  const parts = name.split(/[-_.\s]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** GitHub avatar, or an initials placeholder when no valid username is known. Decorative: the name is shown next to it. */
export default function Avatar({ github, name, size = 28 }: { github: string | null; name: string; size?: number }) {
  if (github) {
    return (
      <img
        className={styles.avatar}
        src={`https://github.com/${github}.png?size=${size * 2}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className={`${styles.avatar} ${styles.placeholder}`} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
