import * as supertest from 'supertest'
import * as jwt from 'jsonwebtoken'
import * as _ from 'lodash/fp'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import {SecurityMiddleware} from './security'
import {LdapAuthManager, LdapUserProvider, Roles, Security} from '../../../..'
import StatusCode from 'status-code-enum'

const app = express()
const request = supertest(app)

const ldapAuthManager = new LdapAuthManager({
    url: 'ldap://127.0.0.1:389',
    baseDn: 'dc=my-company,dc=com',
    idKey: 'cn'
})
const ldapUserProviderCnf = {
    roleUserDn: 'cn=user,dc=genealogy,dc=my-company,dc=com',
    roleAdminDn: 'cn=admin,dc=genealogy,dc=my-company,dc=com',
    ldapAdminLogin: 'cn=admin,dc=my-company,dc=com',
    ldapAdminPassword: 'admin',
    jwtPrivateKey: 'XXXXXXXX',
    jwtExpiration: 60 * 60
}
const ldap = new Security({
    manager: ldapAuthManager,
    provider: LdapUserProvider,
    providerOptions: ldapUserProviderCnf
})

const EXPRESS_PORT = 3010
const security = new SecurityMiddleware({jwtPrivateKey: ldapUserProviderCnf.jwtPrivateKey})

const http = require('http').Server(app)
app.use(bodyParser.json())

app.post('/auth', async (req, res) => {
    const {login, password} = req.body
    const user = await ldap.login(login, password)
    const statusCode = _.get('username', user) ? StatusCode.SuccessOK : StatusCode.ClientErrorForbidden
    res.status(statusCode).json(user)
})

app.get('/person', security.hasRole(Roles.ROLE_ADMIN), (req, res) => {
    res.status(StatusCode.SuccessOK).json({success: true})
})
const server = http.listen(EXPRESS_PORT, () => console.log(`Listening on port ${EXPRESS_PORT}!`))

global.console.debug = () => {
}

describe('Middleware functionality', function () {

    afterAll(async () => {
        await server.close()
    })

    it('GET /person - With a valid token, should allow access to resource', (done) => {
        const token = jwt.sign({
            data: {
                username: 'manolito',
                description: 'This is a fake description',
                roles: ['ROLE_USER', 'ROLE_ADMIN']
            }
        },
        ldapUserProviderCnf.jwtPrivateKey,
        {expiresIn: (60 * 60)})
        request
            .get('/person')
            .set('Authorization', token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                expect(res.body).toEqual({success: true})
                done()
            })
    })

    it('GET /person - With a valid token but invalid roles should deny access', function (done) {
        const token = jwt.sign({
            data: {
                username: 'manolito',
                description: 'This is a fake description',
                roles: []
            }
        },
        ldapUserProviderCnf.jwtPrivateKey,
        {expiresIn: 60 * 60})
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

    it('POST /auth and then GET /person by generated token should allows to access to a securized resource', async (done) => {
        const user = await new Promise((resolve, reject) => {
            request
                .post('/auth')
                .send({login: 'admin', password: 'admin'})
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    !err ? resolve(res.body) : reject(err)
                })
        })
        request
            .get('/person')
            .set('authorization', _.get('token', user))
            .expect(200)
            .end((err, res) => {
                expect(res.body).toEqual({success: true})
                done()
            })

    })
})
