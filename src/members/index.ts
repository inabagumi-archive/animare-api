import { readFile, readdir } from 'fs-extra'
import yaml from 'js-yaml'
import { send } from 'micro'
import { AugmentedRequestHandler } from 'microrouter'
import { join, resolve } from 'path'

const handler: AugmentedRequestHandler = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')

  const { locale } = req.params
  const dir = resolve(__dirname, '..', '..', locale, 'members')
  const files: string[] = await readdir(dir).catch(() => [])
  const promises = files.map(file => {
    const path = join(dir, file)
    return readFile(path, 'utf8')
  })
  const values = await Promise.all(promises)
  const data = values
    .map(value => yaml.load(value))
    .filter(member => !member.unlisted)

  res.setHeader('cache-control', 'max-age=600, public, s-maxage=300')
  send(res, 200, data)
}

export default handler
