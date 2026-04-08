const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

export interface DropboxUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export function isDropboxConfigured(): boolean {
  return !!DROPBOX_ACCESS_TOKEN;
}

export async function uploadToDropbox(
  fileData: ArrayBuffer,
  fileName: string,
  folder: string = "/sonido-liquido"
): Promise<DropboxUploadResult> {
  if (!DROPBOX_ACCESS_TOKEN) {
    return { success: false, error: "Dropbox not configured" };
  }

  const path = `${folder}/${Date.now()}-${fileName}`;

  try {
    // Upload file to Dropbox
    const uploadResponse = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path,
            mode: "add",
            autorename: true,
            mute: false,
          }),
        },
        body: fileData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Dropbox upload error:", errorText);
      return { success: false, error: `Upload failed: ${uploadResponse.status}` };
    }

    const uploadData = await uploadResponse.json();

    // Create shared link
    const shareResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: uploadData.path_display,
          settings: {
            requested_visibility: "public",
          },
        }),
      }
    );

    let shareUrl: string;

    if (shareResponse.ok) {
      const shareData = await shareResponse.json();
      // Convert share link to direct download link
      shareUrl = shareData.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    } else {
      // If link already exists, get existing link
      const existingLinkResponse = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: uploadData.path_display,
            direct_only: true,
          }),
        }
      );

      if (existingLinkResponse.ok) {
        const existingData = await existingLinkResponse.json();
        if (existingData.links && existingData.links.length > 0) {
          shareUrl = existingData.links[0].url
            .replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace("?dl=0", "");
        } else {
          return { success: false, error: "Could not create share link" };
        }
      } else {
        return { success: false, error: "Could not create share link" };
      }
    }

    return { success: true, url: shareUrl };
  } catch (error) {
    console.error("Dropbox upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
