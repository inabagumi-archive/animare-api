import { readFile } from 'fs-extra'
import { google, youtube_v3 } from 'googleapis'
import * as yaml from 'js-yaml'
import { send } from 'micro'
import { AugmentedRequestHandler } from 'microrouter'
import { resolve } from 'path'

const youtube = google.youtube({ version: 'v3' })
const auth = process.env.YOUTUBE_API_KEY

type Live = {
  id: string
  thumbnails: youtube_v3.Schema$ThumbnailDetails
  title: string
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

const handler: AugmentedRequestHandler = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')

  const { id, locale } = req.params
  const path = resolve(__dirname, '..', '..', locale, 'members', `${id}.yml`)
  const value = await readFile(path, 'utf8').catch(() => null)

  if (value) {
    const member = yaml.load(value)
    const match = member.links.youtube.match(/\/([^/]+)$/)

    if (match && match[1]) {
      const lives = await _getLives(match[1])

      if (lives) {
        res.setHeader('cache-control', 'max-age=600, public, s-maxage=300')
        send(res, 200, lives)

        return
      }
    }
  }

  send(res, 404, {
    message: 'Not Found'
  })
}

export default handler
