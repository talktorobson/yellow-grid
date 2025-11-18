# Media Storage with Google Cloud Storage (GCS)

## Overview

The Yellow Grid platform uses Google Cloud Storage (GCS) for storing media files uploaded by mobile app users (photos, videos, documents). This implementation includes:

- **Direct file upload** to GCS using signed URLs
- **Server-side upload** via API endpoints
- **Automatic thumbnail generation** for images using Sharp
- **Signed URL generation** for secure file access
- **File deletion** with automatic thumbnail cleanup
- **File size validation** and type restrictions

---

## Architecture

```
Mobile App
    ↓
    ├─→ Request Upload URL (POST /api/v1/media/upload-request)
    │       ↓
    │   Backend generates signed URL
    │       ↓
    │   Mobile App uploads directly to GCS
    │
    └─→ Upload via Server (POST /api/v1/media/upload)
            ↓
        Backend uploads to GCS + generates thumbnail
```

### File Organization

Files are organized in GCS with the following structure:

```
yellow-grid-media/
├── {service-order-id}/
│   ├── photos/
│   │   └── {timestamp}-{uuid}-{filename}.jpg
│   ├── videos/
│   │   └── {timestamp}-{uuid}-{filename}.mp4
│   └── documents/
│       └── {timestamp}-{uuid}-{filename}.pdf
└── thumbs/
    └── {service-order-id}/
        └── photos/
            └── {timestamp}-{uuid}-{filename}.jpg
```

---

## Prerequisites

1. **Google Cloud Project** with GCS enabled
2. **GCS Bucket** created (e.g., `yellow-grid-media`)
3. **Service Account** with Storage Object Admin permissions
4. **Service Account Key** downloaded as JSON file (for local development)

---

## Setup Instructions

### 1. Create GCS Bucket

```bash
# Using gcloud CLI
gcloud storage buckets create gs://yellow-grid-media \
  --location=europe-west1 \
  --uniform-bucket-level-access

# Set bucket CORS policy (if using direct upload from mobile)
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://yellow-grid-media --cors-file=cors.json
```

### 2. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create yellow-grid-media \
  --display-name="Yellow Grid Media Storage"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:yellow-grid-media@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Download key file
gcloud iam service-accounts keys create ./gcs-key.json \
  --iam-account=yellow-grid-media@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Google Cloud Storage (for media uploads)
GCS_PROJECT_ID=your-project-id
GCS_BUCKET=yellow-grid-media
GCS_KEY_FILE=/path/to/gcs-key.json  # Local development only
MEDIA_CDN_BASE=https://storage.googleapis.com/yellow-grid-media

# Optional: Use Cloud CDN domain after setup
# MEDIA_CDN_BASE=https://cdn.yellow-grid.com
```

**Production Note**: In production (GKE, Cloud Run, etc.), use **Workload Identity** or attach the service account to the instance. Do NOT use `GCS_KEY_FILE` in production.

### 4. Install Dependencies

```bash
npm install @google-cloud/storage sharp
npm install --save-dev @types/sharp
```

---

## Usage

### Client-Side Upload Flow (Recommended)

This approach minimizes server load by allowing direct upload from the mobile app to GCS.

#### 1. Request Upload URL

```typescript
// Mobile App Request
POST /api/v1/media/upload-request
Content-Type: application/json

{
  "serviceOrderId": "so-123",
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1048576
}
```

#### 2. Backend Response

```json
{
  "uploadUrl": "https://storage.googleapis.com/yellow-grid-media/...",
  "mediaUrl": "https://storage.googleapis.com/yellow-grid-media/...",
  "thumbnailUrl": "https://storage.googleapis.com/yellow-grid-media/thumbs/...",
  "key": "so-123/photos/1234567890-uuid-photo.jpg"
}
```

#### 3. Mobile App Uploads to GCS

```typescript
// Mobile App uploads directly to GCS using the uploadUrl
PUT {uploadUrl}
Content-Type: image/jpeg
Body: <binary file data>
```

#### 4. (Optional) Generate Thumbnail

For images, you can trigger server-side thumbnail generation:

```typescript
POST /api/v1/media/generate-thumbnail
Content-Type: application/json

{
  "key": "so-123/photos/1234567890-uuid-photo.jpg"
}
```

---

### Server-Side Upload Flow

For cases where you need server-side processing or validation.

```typescript
POST /api/v1/media/upload
Content-Type: multipart/form-data

file: <binary file data>
serviceOrderId: so-123
filename: photo.jpg
contentType: image/jpeg
```

---

## API Endpoints

### 1. Request Upload URL

**Endpoint**: `POST /api/v1/media/upload-request`

**Request**:
```json
{
  "serviceOrderId": "so-123",
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1048576,
  "kind": "photo"  // optional
}
```

**Response**:
```json
{
  "uploadUrl": "https://...",
  "mediaUrl": "https://...",
  "thumbnailUrl": "https://...",
  "key": "so-123/photos/..."
}
```

### 2. Server-Side Upload

**Endpoint**: `POST /api/v1/media/upload`

**Request**: `multipart/form-data`

**Response**: Same as above

### 3. Get Download URL

**Endpoint**: `GET /api/v1/media/{key}/download-url`

**Query Parameters**:
- `expiresInMs` (optional): URL expiration time in milliseconds (default: 1 hour)

**Response**:
```json
{
  "url": "https://storage.googleapis.com/...",
  "expiresAt": "2025-11-18T12:00:00Z"
}
```

### 4. Delete File

**Endpoint**: `DELETE /api/v1/media/{key}`

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## File Size Limits

| File Type | Max Size | Auto-Compression |
|-----------|----------|------------------|
| Photos    | 25 MB    | Yes (if > 10MB)  |
| Videos    | 1 GB     | No               |
| Documents | 100 MB   | No               |

## Supported MIME Types

### Images
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/heic`

### Videos
- `video/mp4`
- `video/quicktime`
- `video/x-msvideo`

### Documents
- `application/pdf`

---

## Thumbnail Generation

Thumbnails are automatically generated for all image uploads:

- **Size**: 300x300 pixels
- **Fit**: Cover (aspect ratio preserved, centered)
- **Format**: JPEG
- **Quality**: 80%
- **Storage**: `thumbs/{original-key}`

### Configuration

Thumbnail settings can be adjusted in `media-upload.service.ts`:

```typescript
private readonly THUMBNAIL_WIDTH = 300;
private readonly THUMBNAIL_HEIGHT = 300;
private readonly THUMBNAIL_QUALITY = 80;
```

---

## Security

### Signed URLs

All file access uses signed URLs with configurable expiration:

- **Upload URLs**: Valid for 1 hour
- **Read URLs**: Valid for 7 days (default)
- **Custom expiration**: Can be configured per request

### Metadata

Files are stored with metadata:

```json
{
  "serviceOrderId": "so-123",
  "originalFilename": "photo.jpg",
  "uploadedAt": "2025-11-18T10:00:00Z"
}
```

### Access Control

- Bucket is **private** by default
- All access via signed URLs only
- No public read access
- Files organized by service order for easy cleanup/isolation

---

## Production Deployment

### Using Workload Identity (Recommended for GKE)

1. **Create Kubernetes Service Account**:
```bash
kubectl create serviceaccount yellow-grid-api
```

2. **Bind to GCP Service Account**:
```bash
gcloud iam service-accounts add-iam-policy-binding \
  yellow-grid-media@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:YOUR_PROJECT_ID.svc.id.goog[default/yellow-grid-api]"

kubectl annotate serviceaccount yellow-grid-api \
  iam.gke.io/gcp-service-account=yellow-grid-media@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

3. **Update Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      serviceAccountName: yellow-grid-api
      containers:
      - name: api
        env:
        - name: GCS_PROJECT_ID
          value: "your-project-id"
        - name: GCS_BUCKET
          value: "yellow-grid-media"
        # DO NOT set GCS_KEY_FILE in production
```

### Using Cloud Run

Cloud Run automatically provides credentials via the instance service account:

```bash
gcloud run deploy yellow-grid-api \
  --service-account=yellow-grid-media@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="GCS_PROJECT_ID=your-project-id,GCS_BUCKET=yellow-grid-media"
```

---

## Monitoring & Logging

The service logs the following events:

- **Upload requests**: `Generated signed upload URL for key: {key}`
- **File uploads**: `Uploaded file to GCS: {key}`
- **Thumbnail generation**: `Generated and uploaded thumbnail: {key}`
- **File deletion**: `Deleted file: {key}`
- **Errors**: `Failed to generate thumbnail for {key}:`, `Failed to delete file {key}:`

---

## Testing

### Unit Tests

```bash
npm test -- media-upload.service.spec.ts
```

### Integration Tests

To test with a real GCS bucket:

1. Create a test bucket: `yellow-grid-media-test`
2. Set environment variables:
```bash
export GCS_PROJECT_ID=your-project-id
export GCS_BUCKET=yellow-grid-media-test
export GCS_KEY_FILE=/path/to/test-key.json
```
3. Run tests:
```bash
npm run test:e2e
```

---

## Troubleshooting

### Error: "Could not load the default credentials"

**Cause**: Missing or invalid GCS credentials

**Solution**:
- For local development: Set `GCS_KEY_FILE` to valid service account key
- For production: Ensure workload identity or instance service account is configured

### Error: "Photo size exceeds maximum allowed size"

**Cause**: File size exceeds limit

**Solution**:
- Compress images on mobile before upload
- Adjust limits in `media-upload.service.ts` (if needed)

### Thumbnails not generating

**Cause**: Sharp library issue or invalid image format

**Solution**:
- Check server logs for detailed error
- Ensure image format is supported (JPEG, PNG, WebP, HEIC)
- Verify Sharp is properly installed: `npm list sharp`

---

## Cost Optimization

### Storage Costs

- Use **Standard** storage class for active files
- Move to **Nearline** (30-day access) or **Coldline** (90-day access) for archived files
- Set up **lifecycle policies** to auto-delete or archive old files

Example lifecycle policy:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
```

### Bandwidth Costs

- Enable **Cloud CDN** for frequently accessed files
- Use **requester pays** for customer downloads (if applicable)

---

## Future Enhancements

1. **Video thumbnail generation**: Use ffmpeg or Cloud Functions to generate video thumbnails
2. **Image optimization**: Automatic WebP conversion for modern browsers
3. **Virus scanning**: Integrate with Cloud Security Scanner
4. **Content moderation**: Use Cloud Vision API for inappropriate content detection
5. **Multi-region replication**: Replicate to multiple regions for global access

---

## References

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [GCS Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0
