
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export interface BackupConfig {
    clientId: string;
    apiKey: string;
}

export const initGoogleClient = async (config: BackupConfig) => {
    return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => {
            // @ts-ignore
            window.gapi.load("client:auth2", async () => {
                try {
                    // @ts-ignore
                    await window.gapi.client.init({
                        apiKey: config.apiKey,
                        clientId: config.clientId,
                        discoveryDocs: DISCOVERY_DOCS,
                        scope: SCOPES,
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

export const signInToGoogle = async () => {
    // @ts-ignore
    const googleAuth = window.gapi.auth2.getAuthInstance();
    return await googleAuth.signIn();
};

export const uploadFileToDrive = async (fileContent: object, fileName: string) => {
    // @ts-ignore
    const googleAuth = window.gapi.auth2.getAuthInstance();
    if (!googleAuth.isSignedIn.get()) {
        throw new Error("User not signed in");
    }

    const file = new Blob([JSON.stringify(fileContent)], { type: "application/json" });
    const metadata = {
        name: fileName,
        mimeType: "application/json",
    };

    // @ts-ignore
    const accessToken = window.gapi.auth.getToken().access_token;
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: new Headers({ Authorization: "Bearer " + accessToken }),
        body: form,
    });

    return await response.json();
};
