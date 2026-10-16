import Link from "next/link";

export default function NotFound() {
  return (
    <div className="prose">
      <h1>Page not found</h1>
      <p>
        This page does not exist. Go back to the <Link href="/">leaderboard</Link>.
      </p>
    </div>
  );
}
