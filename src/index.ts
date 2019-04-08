import { RequestHandler, send } from 'micro'
import { get, router, withNamespace } from 'microrouter'
import getArticles from './articles'
import getMembers from './members'
import getLives from './members/lives'
import getMember from './members/show'

const root = withNamespace('/:locale')

const notfound: RequestHandler = (req, res) => {
  send(res, 404, {
    message: 'Not Found'
  })
}

export default router(
  root(
    get('/articles', getArticles),
    get('/members/:id/lives', getLives),
    get('/members/:id', getMember),
    get('/members', getMembers)
  ),
  get('/*', notfound)
)
