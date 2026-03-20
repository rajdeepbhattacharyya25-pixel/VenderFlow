
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";

export interface BackupConfig {
    clientId: string;
    apiKey: string;
}

let tokenClient: any = null;
let accessToken: string | null = null;

export const initGoogleClient = async (config: BackupConfig) => {
    return new Promise<void>((resolve, reject) => {
        // 1. Load the GSI script
        const gsiScript = document.createElement("script");
        gsiScript.src = "https://accounts.google.com/gsi/client";
        gsiScript.async = true;
        gsiScript.defer = true;
        gsiScript.onload = () => {
            // @ts-expect-error: GSI library is loaded dynamically
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: config.clientId,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        accessToken = tokenResponse.access_token;
                        // Trigger any pending resolve or just allow subsequent calls
                        console.log("Token received via GSI");
                    }
                },
            });

            // 2. Load the GAPI script (still needed for 'client' and discovery docs, but NOT for auth)
            const gapiScript = document.createElement("script");
            gapiScript.src = "https://apis.google.com/js/api.js";
            gapiScript.onload = () => {
                // @ts-expect-error: GAPI library is loaded dynamically
                window.gapi.load("client", async () => {
                    try {
                        // @ts-expect-error: GAPI client is loaded dynamically
                        await window.gapi.client.init({
                            apiKey: config.apiKey,
                            discoveryDocs: DISCOVERY_DOCS,
                        });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            };
            gapiScript.onerror = reject;
            document.body.appendChild(gapiScript);
        };
        gsiScript.onerror = reject;
        document.body.appendChild(gsiScript);
    });
};

export const signInToGoogle = async () => {
    return new Promise<void>((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Token client not initialized"));
            return;
        }

        // Overwrite callback to resolve the specific sign-in attempt
        tokenClient.callback = (tokenResponse: any) => {
            if (tokenResponse.error) {
                reject(tokenResponse);
                return;
            }
            accessToken = tokenResponse.access_token;
            resolve();
        };

        // Trigger the popup
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

export const trySilentSignIn = async () => {
    return new Promise<void>((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Token client not initialized"));
            return;
        }

        tokenClient.callback = (tokenResponse: any) => {
            if (tokenResponse.error) {
                reject(tokenResponse);
                return;
            }
            accessToken = tokenResponse.access_token;
            resolve();
        };

        // Try silently (no prompt)
        tokenClient.requestAccessToken({ prompt: 'none' });
    });
};

export const isConnected = () => !!accessToken;

export const uploadFileToDrive = async (fileContent: object, fileName: string) => {
    if (!accessToken) {
        throw new Error("User not signed in or token expired");
    }

    const file = new Blob([JSON.stringify(fileContent)], { type: "application/json" });
    const metadata = {
        name: fileName,
        mimeType: "application/json",
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: new Headers({ Authorization: "Bearer " + accessToken }),
        body: form,
    });

    if (!response.ok) {
        const error = await response.json();
        console.error("GDrive upload error:", error);
        throw new Error(error.error?.message || "Failed to upload to Google Drive");
    }

    return await response.json();
};
