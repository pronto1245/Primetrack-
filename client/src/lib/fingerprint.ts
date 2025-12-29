import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;
let cachedVisitorId: string | null = null;
let cachedConfidence: number | null = null;

export async function initFingerprint(): Promise<void> {
  if (fpPromise) return;
  
  fpPromise = FingerprintJS.load();
  const fp = await fpPromise;
  const result = await fp.get();
  
  cachedVisitorId = result.visitorId;
  cachedConfidence = result.confidence.score;
}

export async function getVisitorId(): Promise<string | null> {
  if (cachedVisitorId) return cachedVisitorId;
  
  try {
    await initFingerprint();
    return cachedVisitorId;
  } catch (error) {
    console.error('FingerprintJS error:', error);
    return null;
  }
}

export async function getConfidence(): Promise<number | null> {
  if (cachedConfidence !== null) return cachedConfidence;
  
  try {
    await initFingerprint();
    return cachedConfidence;
  } catch (error) {
    console.error('FingerprintJS error:', error);
    return null;
  }
}

export function appendFingerprintToUrl(url: string, visitorId: string, confidence?: number): string {
  const urlObj = new URL(url);
  urlObj.searchParams.set('visitor_id', visitorId);
  if (confidence !== undefined) {
    urlObj.searchParams.set('fp_confidence', confidence.toString());
  }
  return urlObj.toString();
}

export function getIntegrationScript(trackingDomain: string): string {
  return `<!-- PrimeTrack FingerprintJS Integration -->
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js"></script>
<script>
(function() {
  var fpPromise = FingerprintJS.load();
  
  window.PrimeTrack = {
    getVisitorId: function() {
      return fpPromise.then(function(fp) {
        return fp.get();
      }).then(function(result) {
        return {
          visitorId: result.visitorId,
          confidence: result.confidence.score
        };
      });
    },
    
    enhanceLinks: function() {
      this.getVisitorId().then(function(data) {
        document.querySelectorAll('a[href*="${trackingDomain}"]').forEach(function(link) {
          var url = new URL(link.href);
          url.searchParams.set('visitor_id', data.visitorId);
          url.searchParams.set('fp_confidence', data.confidence.toString());
          link.href = url.toString();
        });
      });
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.PrimeTrack.enhanceLinks();
    });
  } else {
    window.PrimeTrack.enhanceLinks();
  }
})();
</script>`;
}
