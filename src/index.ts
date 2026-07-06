import { Hono } from 'hono'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const app = new Hono()

let embeddingVector: number[] = [];

type StoredImage = {
    id: string
    originalName: string
    mimeType: string
    fileName: string
    size: number
    uploadedAt: string
}

const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
const metadataPath = join(uploadDir, 'metadata.json')

const extensionByMimeType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/avif': '.avif',
}

const ensureUploadDir = async () => {
    await mkdir(uploadDir, { recursive: true })
}

const readStoredImages = async (): Promise<Record<string, StoredImage>> => {
    try {
        const metadata = await readFile(metadataPath, 'utf8')
        return JSON.parse(metadata) as Record<string, StoredImage>
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return {}
        }

        throw error
    }
}

const writeStoredImages = async (images: Record<string, StoredImage>) => {
    await ensureUploadDir()
    await writeFile(metadataPath, JSON.stringify(images, null, 2))
}

const getImageExtension = (file: File) => {
    const extension = extname(file.name).toLowerCase()

    if (extension) {
        return extension
    }

    return extensionByMimeType[file.type] ?? ''
}

const getDownloadFileName = (fileName: string) => {
    const sanitizedFileName = fileName.replaceAll(/[\r\n"]/g, '').trim()
    return sanitizedFileName || 'image'
}

const validateImageApiKey = (apiKey: string | undefined) => {
    const expectedApiKey = process.env.API_KEY_SECRET

    if (!expectedApiKey) {
        return Response.json({ error: 'API key is not configured' }, { status: 500 })
    }

    if (apiKey !== expectedApiKey) {
        return Response.json({ error: 'Invalid API key' }, { status: 401 })
    }

    return null
}

const getLatestImage = (images: Record<string, StoredImage>) => {
    return Object.values(images).sort((firstImage, secondImage) => {
        return new Date(secondImage.uploadedAt).getTime() - new Date(firstImage.uploadedAt).getTime()
    })[0]
}

const downloadImage = async (image: StoredImage) => {
    const imageFile = Bun.file(join(uploadDir, image.fileName))

    if (!(await imageFile.exists())) {
        return Response.json({ error: 'Image file not found' }, { status: 404 })
    }

    return new Response(imageFile, {
        headers: {
            'Content-Type': image.mimeType,
            'Content-Disposition': `attachment; filename="${getDownloadFileName(image.originalName)}"`,
            'Content-Length': image.size.toString(),
        },
    })
}

app.get('/', (c) => {
    if (embeddingVector.length === 0) {
        return c.json({ error: 'No embedding vector found' }, 404)
    }
    return c.json({
        result: {
            embeddingVector,
            result: "Retrieved!"
        }
    })
})

app.post('/sync', async (c) => {
    const rawBody = await c.req.text()

    if (!rawBody) {
        return c.json({ error: 'Request body is empty' }, 400)
    }

    try {
        const data = JSON.parse(rawBody)
        embeddingVector = data.embeddingVector || []
        return c.json({
            result: {
                embeddingVector,
                result: "Saved!"
            }
        })
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400)
    }
})

app.post('/images', async (c) => {
    const apiKeyError = validateImageApiKey(c.req.header('x-api-key'))

    if (apiKeyError) {
        return apiKeyError
    }

    const body = await c.req.parseBody()
    const image = body.image

    if (!(image instanceof File)) {
        return c.json({ error: 'Image file is required in the "image" form field' }, 400)
    }

    if (!image.type.startsWith('image/')) {
        return c.json({ error: 'Uploaded file must be an image' }, 400)
    }

    if (image.size === 0) {
        return c.json({ error: 'Uploaded image is empty' }, 400)
    }

    const id = crypto.randomUUID()
    const fileName = `${id}${getImageExtension(image)}`
    const filePath = join(uploadDir, fileName)
    const storedImage: StoredImage = {
        id,
        originalName: image.name,
        mimeType: image.type,
        fileName,
        size: image.size,
        uploadedAt: new Date().toISOString(),
    }

    await ensureUploadDir()
    await Bun.write(filePath, image)

    const images = await readStoredImages()
    images[id] = storedImage
    await writeStoredImages(images)

    return c.json({ result: storedImage }, 201)
})

app.get('/images', async (c) => {
    const apiKeyError = validateImageApiKey(c.req.header('x-api-key'))

    if (apiKeyError) {
        return apiKeyError
    }

    const images = await readStoredImages()
    const image = getLatestImage(images)

    if (!image) {
        return c.json({ error: 'No image found' }, 404)
    }

    return downloadImage(image)
})

app.get('/images/:id', async (c) => {
    const apiKeyError = validateImageApiKey(c.req.header('x-api-key'))

    if (apiKeyError) {
        return apiKeyError
    }

    const id = c.req.param('id')
    const images = await readStoredImages()
    const image = images[id]

    if (!image) {
        return c.json({ error: 'Image not found' }, 404)
    }

    return downloadImage(image)
})

export default app
