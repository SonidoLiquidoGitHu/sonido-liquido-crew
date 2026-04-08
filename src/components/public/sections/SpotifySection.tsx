import { SpotifyEmbed } from "../embeds/SpotifyEmbed";

interface SpotifySectionProps {
  playlistId?: string;
}

export function SpotifySection({
  playlistId = "5qHTKCZIwi3GM3mhPq45Ab",
}: SpotifySectionProps) {
  return (
    <section className="py-20 bg-slc-black">
      <div className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-10 h-10 text-spotify" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              <h2 className="font-oswald text-2xl sm:text-3xl uppercase">
                Playlist Oficial
              </h2>
            </div>
            <p className="text-slc-muted text-lg mb-6">
              Escucha lo mejor del colectivo en una sola playlist.
              Actualizada constantemente con los lanzamientos más recientes
              de todos los artistas de Sonido Líquido Crew.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slc-text">
                <span className="w-2 h-2 bg-spotify rounded-full" />
                +500 canciones de todos los artistas
              </li>
              <li className="flex items-center gap-3 text-slc-text">
                <span className="w-2 h-2 bg-spotify rounded-full" />
                Actualizada semanalmente
              </li>
              <li className="flex items-center gap-3 text-slc-text">
                <span className="w-2 h-2 bg-spotify rounded-full" />
                Lo mejor del Hip Hop mexicano
              </li>
            </ul>
            <a
              href={`https://open.spotify.com/playlist/${playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-spotify hover:bg-spotify-dark text-white font-medium rounded-full transition-colors"
            >
              Abrir en Spotify
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Spotify Embed */}
          <div className="rounded-xl overflow-hidden shadow-2xl">
            <SpotifyEmbed type="playlist" id={playlistId} height={400} />
          </div>
        </div>
      </div>
    </section>
  );
}
