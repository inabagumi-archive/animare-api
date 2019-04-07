import { readFile, readdir } from 'fs-extra'
import { google, youtube_v3 } from 'googleapis'
import yaml from 'js-yaml'
import { RequestHandler, send } from 'micro'
import { join, resolve } from 'path'

const youtube = google.youtube({ version: 'v3' })
const auth = process.env.YOUTUBE_API_KEY

type Member = {
  avatar: string
  color: string
  description: string
  links: {
    [name: string]: string
  }
  mainVisual: string
  name: string
  picture: string
}

type Live = {
  id: string
  thumbnails: youtube_v3.Schema$ThumbnailDetails
  title: string
}

const getMember = async (locale: string, id: string): Promise<Member> => {
  const path = resolve(__dirname, '..', locale, 'members', `${id}.yml`)
  const buffer = await readFile(path)

  return yaml.load(buffer.toString())
}

const getMembers = async (locale: string): Promise<Member[]> => {
  const dir = resolve(__dirname, '..', locale, 'members')
  const files = await readdir(dir)
  const promises = files.map(file => {
    const path = join(dir, file)
    return readFile(path)
  })
  const buffers = await Promise.all(promises)

  return buffers
    .map(buffer => yaml.load(buffer.toString()))
    .filter(member => !member.unlisted)
}

const _getLives = async (channelId: string): Promise<Live[] | null> => {
  const response = await youtube.search.list({
    auth,
    channelId,
    eventType: 'completed',
    maxResults: 10,
    order: 'date',
    part: 'snippet',
    safeSearch: 'none',
    type: 'video'
  })

  if (response.data && response.data.items) {
    return response.data.items.map(({ id, snippet }) => ({
      id: id!.videoId!,
      thumbnails: snippet!.thumbnails!,
      title: snippet!.title!
    }))
  }

  return null
}

const getLives = async (locale: string, id: string): Promise<Live[] | null> => {
  const member = await getMember(locale, id).catch(() => null)

  if (member) {
    const match = member.links.youtube.match(/\/([^/]+)$/)

    if (match && match[1]) {
      return _getLives(match[1])
    }
  }

  return null
}

const getArticles = async (locale: string): Promise<any> => {
  const path = resolve(__dirname, '..', locale, 'articles.yml')
  const buffer = await readFile(path)

  return yaml.load(buffer.toString())
}

const handler: RequestHandler = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')

  const path = req.url || '/'
  const match = path.match(/^\/(en|ja)\/(?:articles|members(?:\/([^/]+)(?:\/lives)?)?)$/)

  if (match) {
    const data = match[2]
      ? match[0].endsWith('/lives')
        ? await getLives(match[1], match[2]).catch(() => null)
        : await getMember(match[1], match[2]).catch(() => null)
      : match[0].endsWith('/articles')
        ? await getArticles(match[1]).catch(() => null)
        : await getMembers(match[1]).catch(() => null)

    if (data) {
      res.setHeader('cache-control', 'max-age=600, public, s-maxage=300')
      send(res, 200, data)

      return
    }
  }

  send(res, 404, {
    message: 'Not Found'
  })
}

export default handler
