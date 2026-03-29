const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export interface ImgBBResponse {
    data: {
        id: string;
        url: string;
        display_url: string;
        delete_url: string;
        image: { url: string; filename: string };
        thumb: { url: string };
        medium?: { url: string };
    };
    success: boolean;
    status: number;
}

export async function uploadToImgBB(file: File): Promise<string> {
    if (!IMGBB_API_KEY) {
        throw new Error('ImgBB API key not configured. Add VITE_IMGBB_API_KEY to .env.local');
    }

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        let errorMsg = `ImgBB upload failed (${res.status})`;
        try {
            const errJson = await res.json();
            if (errJson.error && errJson.error.message) {
                errorMsg = `ImgBB: ${errJson.error.message} (${res.status})`;
            }
        } catch (e) {
            // ignore JSON parse error
        }
        throw new Error(errorMsg);
    }

    const json: ImgBBResponse = await res.json();

    if (!json.success) {
        throw new Error('ImgBB returned an error. Please try again.');
    }

    return json.data.display_url;
}
