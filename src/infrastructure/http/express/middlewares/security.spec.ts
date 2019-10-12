import * as supertest from 'supertest'
import * as jwt from 'jsonwebtoken'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import {SecurityMiddleware} from './security'
import {Roles} from '../../../../application/security/Roles'
import StatusCode from 'status-code-enum'

const app = express()
const request = supertest(app)

const JWT_PRIVATE_KEY = 'XXXX'

describe('Middleware functionality', function () {
    
    beforeAll(function () {
        const EXPRESS_PORT = 3010
        const security = new SecurityMiddleware({jwtPrivateKey: JWT_PRIVATE_KEY})
        const http = require('http').Server(app)
        app.use(bodyParser.json())
        app.get('/person', security.hasRole(Roles.ROLE_ADMIN), (req, res) => {
            res.status(StatusCode.SuccessOK).json({})
        })
        http.listen(EXPRESS_PORT, () => console.log(`Listening on port ${EXPRESS_PORT}!`))
    })

    it('GET /person - With a valid token, should allow access to resource', (done) => {
        const token = jwt.sign({data: {
            username: 'manolito',
            description: 'This is a fake description',
            roles: ['ROLE_USER', 'ROLE_ADMIN']}
        },
        JWT_PRIVATE_KEY,
        {expiresIn: (60 * 60) })
        request
            .get('/person')
            .set('Authorization', token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body).toEqual({})
                done()
            })
    })

    it('GET /person - With a valid token but invalid roles should deny access', function (done) {
        const token = jwt.sign({data: {
            username: 'manolito',
            description: 'This is a fake description',
            roles: []}
        },
        JWT_PRIVATE_KEY,
        {expiresIn: 60 * 60 })
        request
            .get('/person')
            .set('Authorization', token)
            .expect('Content-Type', /json/)
            .expect(403)
            .end((err, res) => {
                expect(res.body).toEqual({
                    _links: {
                        self: {
                            href: '/person'
                        }
                    }
                })
                done()
            })
    })

    it('GET /person - With invalid token should deny access', function (done) {
        request
            .get('/person')
            .set('Authorization', 'BAD_TOKEN')
            .expect('Content-Type', /json/)
            .expect(401)
            .end((err, res) => {
                expect(res.body).toEqual({
                    _links: {
                        self: {
                            href: '/person'
                        }
                    }
                })
                done()
            })
    })
})
