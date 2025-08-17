const GATEWAY_PRIORITY = [
  'https://ipfs.io/ipfs/', // Fastest, official
  'https://dweb.link/ipfs/', // Backup official
  'https://gateway.pinata.cloud/ipfs/', // Fast, reliable
  'https://cloudflare-ipfs.com/ipfs/', // Cloudflare CDN
  'https://4everland.io/ipfs/', // Alternative
  'https://nftstorage.link/ipfs/', // NFT-optimized
  'https://ipfs.filebase.io/ipfs/', // Additional backup
];

export async function fetchWithFallback(cid: string) {

  for (let i = 0; i < GATEWAY_PRIORITY.length; i++) {
    const gateway = GATEWAY_PRIORITY[i];
    try {


      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

      const res = await fetch(gateway + cid, {
        signal: controller.signal,
        headers: {
          Accept: 'image/*,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      } else {
        console.warn(`Gateway ${gateway} returned status:`, res.status);
      }
    } catch (e) {
      console.warn(
        `Gateway ${gateway} failed:`,
        e instanceof Error ? e.message : e
      );
      continue;
    }
  }

  const error = new Error(
    `All ${GATEWAY_PRIORITY.length} gateways failed for CID: ${cid}`
  );
  console.error(error.message);
  throw error;
}
