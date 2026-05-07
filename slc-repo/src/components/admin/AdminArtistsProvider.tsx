"use client";

import { createContext, useContext, ReactNode } from "react";
import type { Artist } from "./ArtistSelector";

const AdminArtistsContext = createContext<Artist[]>([]);

export function AdminArtistsProvider({
  children,
  artists,
}: {
  children: ReactNode;
  artists: Artist[];
}) {
  return (
    <AdminArtistsContext.Provider value={artists}>
      {children}
    </AdminArtistsContext.Provider>
  );
}

export function useAdminArtists() {
  return useContext(AdminArtistsContext);
}

export default AdminArtistsProvider;
