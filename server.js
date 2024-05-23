import 'dotenv/config'
import express from 'express'
import nodeCleanup from 'node-cleanup'
import fileUpload from 'express-fileupload'
import routes from './routes.js'
import { init, cleanup } from './middlewares/req.js'
import { runLoop } from './campaign/campaignLoop.js'
import cors from 'cors'

const app = express()
const host = process.env.HOST ?? '127.0.0.1'
const port = parseInt(process.env.PORT ?? 8000)

app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.json())
app.use(fileUpload())
app.use('/api', routes)

// linking client 
import path from 'path';

const currentDir = process.cwd();

app.use(express.static(path.resolve(currentDir, "./client/public")));

app.get("*", function (request, response) {
    response.sendFile(path.resolve(currentDir, "./client/public", "index.html"));
});

app.listen(process.env.PORT || 3010, () => {
    init()
    console.log(`Whatsham server is runnin gon port ${process.env.PORT}`)
    setTimeout(() => {
        runLoop()
    }, 5000);
})

nodeCleanup(cleanup)

export default app
