const key = "[SECRET]";

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  console.log(`Listing models from ${url}...`);
  try {
    const response = await fetch(url);
    const result = await response.json();
    if (response.ok) {
        console.log("Available Models:");
        result.models.forEach(m => {
            if (m.supportedGenerationMethods.includes("embedContent")) {
                console.log(`- ${m.name} (Supports Embedding)`);
            }
        });
    } else {
        console.log("Failure:", result.error?.message);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

listModels();
