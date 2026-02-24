const axios = require('axios');
const fs = require('fs');
const https = require('https');
const url = require('url');

/**
 * Upload an approved image file to the vendor using a signed URL flow.
 * Steps:
 *  1. POST to vendor API to get a signed upload URL (server-side only, uses VENDOR_API_KEY)
 *  2. PUT the file contents to the signed upload URL (no auth header required)
 *
 * @param {string} filePath Absolute path to the image on disk
 * @param {string} fileName File name to send to vendor for signed URL
 * @param {string} mimeType MIME type of the image
 */
async function uploadApprovedImageToVendor(filePath, fileName, mimeType) {
  if (!process.env.VENDOR_API_KEY) {
    throw new Error('VENDOR_API_KEY is not configured in environment');
  }

  const requestUrl = 'https://annonest.labelnest.in/api/vendor/upload-url';

  // Request signed URL
  let uploadUrl;
  try {
    console.log(`[VENDOR_UPLOAD] Requesting signed URL for: ${fileName}`);
    const resp = await axios.post(
      requestUrl,
      { fileName, contentType: mimeType },
      {
        headers: {
          'X-API-Key': process.env.VENDOR_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    // support both uploadUrl or upload_url naming
    uploadUrl = resp?.data?.uploadUrl || resp?.data?.upload_url;
    if (!uploadUrl) throw new Error('Vendor did not return uploadUrl');
    console.log(`[VENDOR_UPLOAD] Received signed URL (expires in 30 min)`);
  } catch (err) {
    console.error('Failed to request signed upload URL from vendor:', err && err.response ? err.response.data || err.response.statusText : err.message);
    throw err;
  }

  // Stream file to signed URL using PUT (native https to avoid header tampering)
  try {
    const stats = await fs.promises.stat(filePath);
    const fileBuffer = await fs.promises.readFile(filePath);

    console.log(`[VENDOR_UPLOAD] Uploading ${stats.size} bytes to S3/R2...`);
    console.log(`[VENDOR_UPLOAD] Using signed URL (expires in 30 min)`);

    // Parse the signed URL
    const parsedUrl = new URL(uploadUrl);
    
    // Use native https.request to have full control over headers
    // Only send Host and Content-Length headers (signed headers)
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Host': parsedUrl.hostname,
        'Content-Length': fileBuffer.length  // AWS R2 requires this
      }
    };

    const uploadPromise = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[VENDOR_UPLOAD] ✅ File uploaded successfully (HTTP ${res.statusCode})`);
            resolve(true);
          } else {
            console.error(`[VENDOR_UPLOAD] ❌ Upload failed (HTTP ${res.statusCode})`);
            console.error(`[VENDOR_UPLOAD] Response: ${data.substring(0, 200)}`);
            reject(new Error(`Upload failed with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        console.error(`[VENDOR_UPLOAD] ❌ Request error:`, err.message);
        reject(err);
      });

      // Send the file buffer
      req.write(fileBuffer);
      req.end();
    });

    await uploadPromise;
  } catch (err) {
    console.error('Failed to upload file to vendor signed URL:', err.message);
    throw err;
  }

  return true;
}

module.exports = {
  uploadApprovedImageToVendor
};
