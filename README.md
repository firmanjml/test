# test

To install dependencies:

```bash
bun install
```

To run:

```bash
API_KEY_SECRET=change-me bun run index.ts
```

Image endpoints:

```bash
curl -X POST http://localhost:3000/images \
  -H "x-api-key: change-me" \
  -F "image=@/path/to/image.png"

curl -OJ http://localhost:3000/images \
  -H "x-api-key: change-me"

curl -OJ http://localhost:3000/images/<image-id> \
  -H "x-api-key: change-me"
```

`GET /images` downloads the latest uploaded image. `GET /images/<image-id>` downloads a specific image.
Uploaded files are stored locally in `uploads/` with metadata in `uploads/metadata.json`.
Set `UPLOAD_DIR` to change the local storage path. The Docker image uses `/app/uploads`.
Set `API_KEY_SECRET` and send the same value in the `x-api-key` header for image upload and download requests.

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
