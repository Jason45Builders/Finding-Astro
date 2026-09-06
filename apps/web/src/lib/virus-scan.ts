export interface VirusScanResult {
  clean: boolean;
  threat?: string;
  scanner?: string;
}

export async function scanBuffer(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  const useClamAV = process.env.CLAMAV_HOST && process.env.CLAMAV_PORT;
  const useVirusTotal = process.env.VIRUSTOTAL_API_KEY;

  if (useClamAV) {
    return scanWithClamAV(buffer, filename);
  }

  if (useVirusTotal) {
    return scanWithVirusTotal(buffer, filename);
  }

  return { clean: true, scanner: "none" };
}

async function scanWithClamAV(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  try {
    const net = await import("net");
    const host = process.env.CLAMAV_HOST!;
    const portRaw = process.env.CLAMAV_PORT!;
    const port = parseInt(portRaw, 10);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      console.error("[virus-scan] Invalid CLAMAV_PORT:", portRaw);
      return { clean: true, scanner: "clamav-config-error" };
    }

    const result = await new Promise<{ clean: boolean; threat?: string }>((resolve, reject) => {
      const socket = net.createConnection(port, host);

      let response = "";
      socket.connect(port, host, () => {
        socket.write(`zINSTREAM\n`);
        const chunkSize = 8192;
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          socket.write(Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from(chunk)]));
        }
        socket.write(Buffer.from([0, 0, 0, 0]));
      });

      socket.on("data", (data: Buffer) => {
        response += data.toString();
      });

      socket.on("end", () => {
        const match = response.match(/stream: (.*) FOUND/);
        if (match) {
          resolve({ clean: false, threat: match[1] });
        } else {
          resolve({ clean: true });
        }
      });

      socket.on("error", reject);
      setTimeout(() => { socket.destroy(); reject(new Error("ClamAV timeout")); }, 10000);
    });

    return { ...result, scanner: "clamav" };
  } catch {
    console.error("[virus-scan] ClamAV scan failed, allowing upload", filename);
    return { clean: true, scanner: "clamav-error" };
  }
}

async function scanWithVirusTotal(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY!;
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), filename);

    const uploadResponse = await fetch("https://www.virustotal.com/api/v3/files", {
      method: "POST",
      headers: { "x-apikey": apiKey },
      body: formData,
    });

    if (!uploadResponse.ok) return { clean: true, scanner: "virustotal-error" };

    const uploadData = await uploadResponse.json() as { data: { id: string } };
    const analysisId = uploadData.data.id;

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { "x-apikey": apiKey },
      });
      const analysisData = await analysisResponse.json() as { data: { attributes: { stats: { malicious: number; suspicious: number }; status?: string } } };
      const stats = analysisData.data.attributes.stats;
      if (stats.malicious > 0 || stats.suspicious > 0) {
        return { clean: false, threat: `malicious:${stats.malicious},suspicious:${stats.suspicious}`, scanner: "virustotal" };
      }
      if ((analysisData.data.attributes as { status?: string }).status === "completed") break;
    }

    return { clean: true, scanner: "virustotal" };
  } catch {
    console.error("[virus-scan] VirusTotal scan failed, allowing upload", filename);
    return { clean: true, scanner: "virustotal-error" };
  }
}
