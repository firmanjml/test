import { Hono } from 'hono'

const app = new Hono()

let embeddingVector: number[] = [];

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

export default app