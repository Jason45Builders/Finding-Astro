export interface VirusScanResult {
  clean: boolean;
  threat?: string;
  scanner?: string;
}

export async function scanBuffer(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  if (process.env.CLAMAV_HOST && process.env.CLAMAV_PORT) return scanWithClamAV(buffer, filename);
  if (process.env.VIRUSTOTAL_API_KEY) return scanWithVirusTotal(buffer, filename);
  return { clean: false, threat: "scanner_unavailable", scanner: "none-error" };
}

async function scanWithClamAV(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  try {
    const net = await import("net");
    const host = process.env.CLAMAV_HOST!;
    const port = Number.parseInt(process.env.CLAMAV_PORT!, 10);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) return { clean: false, threat: "scanner_configuration_error", scanner: "clamav-error" };
    const result = await new Promise<{ clean: boolean; threat?: string }>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let response = "";
      let settled = false;
      const finish = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); fn(); };
      const timer = setTimeout(() => { socket.destroy(); finish(() => reject(new Error("ClamAV timeout"))); }, 15000);
      socket.once("connect", () => {
        socket.write("zINSTREAM\n");
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 8192) {
          const chunk = Buffer.from(bytes.slice(i, i + 8192));
          const length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length, 0);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
      socket.on("data", (data: Buffer) => { response += data.toString("utf8"); });
      socket.once("end", () => finish(() => {
        const found = response.match(/stream:\s+(.+?)\s+FOUND/i);
        if (found) resolve({ clean: false, threat: found[1] });
        else if (/stream:\s+OK/i.test(response)) resolve({ clean: true });
        else reject(new Error("Unexpected ClamAV response"));
      }));
      socket.once("error", (error) => finish(() => reject(error)));
    });
    return { ...result, scanner: "clamav" };
  } catch (error) {
    console.error("[virus-scan] ClamAV scan failed", filename, error);
    return { clean: false, threat: "scanner_unavailable", scanner: "clamav-error" };
  }
}

async function scanWithVirusTotal(buffer: ArrayBuffer, filename: string): Promise<VirusScanResult> {
  try {
    const apiKey = process.env.VIRUSTOTAL_API_KEY!;
    const formData = new FormData();
    formData.append("file", new Blob([buffer]), filename);
    const uploadResponse = await fetch("https://www.virustotal.com/api/v3/files", { method: "POST", headers: { "x-apikey": apiKey }, body: formData });
    if (!uploadResponse.ok) return { clean: false, threat: "scanner_unavailable", scanner: "virustotal-error" };
    const uploadData = await uploadResponse.json() as { data?: { id?: string } };
    const analysisId = uploadData.data?.id;
    if (!analysisId) return { clean: false, threat: "scanner_invalid_response", scanner: "virustotal-error" };
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch("https://www.virustotal.com/api/v3/analyses/" + analysisId, { headers: { "x-apikey": apiKey } });
      if (!response.ok) return { clean: false, threat: "scanner_unavailable", scanner: "virustotal-error" };
      const data = await response.json() as { data?: { attributes?: { status?: string; stats?: { malicious?: number; suspicious?: number } } } };
      const attrs = data.data?.attributes;
      const stats = attrs?.stats;
      if (!attrs || !stats) return { clean: false, threat: "scanner_invalid_response", scanner: "virustotal-error" };
      if ((stats.malicious ?? 0) > 0 || (stats.suspicious ?? 0) > 0) return { clean: false, threat: "malicious:" + (stats.malicious ?? 0) + ",suspicious:" + (stats.suspicious ?? 0), scanner: "virustotal" };
      if (attrs.status === "completed") return { clean: true, scanner: "virustotal" };
    }
    return { clean: false, threat: "scanner_timeout", scanner: "virustotal-error" };
  } catch (error) {
    console.error("[virus-scan] VirusTotal scan failed", filename, error);
    return { clean: false, threat: "scanner_unavailable", scanner: "virustotal-error" };
  }
}