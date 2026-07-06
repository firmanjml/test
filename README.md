# test

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

Image endpoints:

```bash
curl -X POST http://localhost:3000/images \
  -F "image=@/path/to/image.png"

curl -OJ http://localhost:3000/images

curl -OJ http://localhost:3000/images/<image-id>
```

`GET /images` downloads the latest uploaded image. `GET /images/<image-id>` downloads a specific image.
Uploaded files are stored locally in `uploads/` with metadata in `uploads/metadata.json`.

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
