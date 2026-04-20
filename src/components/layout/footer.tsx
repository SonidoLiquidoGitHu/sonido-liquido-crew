import Link from "next/link";
import { Music2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Colectivo. All rights reserved.
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/artistas"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Artistas
          </Link>
        </nav>
      </div>
    </footer>
  );
}
