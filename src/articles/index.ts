import { readFile } from 'fs-extra'
import * as yaml from 'js-yaml'
import { send } from 'micro'
import { AugmentedRequestHandler } from 'microrouter'
import { resolve } from 'path'

const handler: AugmentedRequestHandler = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')

  const { locale } = req.params
  const path = resolve(__dirname, '..', '..', locale, 'articles.yml')
  const value = await readFile(path, 'utf8').catch(() => null)

  if (value) {
    res.setHeader('cache-control', 'max-age=600, public, s-maxage=300')
    send(res, 200, yaml.load(value))

    return
  }

  send(res, 404, {
    message: 'Not Found'
  })
}

export default handler
