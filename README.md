[![NPM](https://nodei.co/npm/ldap-login.png?downloads=true&stars=true)](https://nodei.co/npm/ldap-login/)

LDAP Login
=================================

[![Build Status](https://travis-ci.org/jvcalderon/ldap-login.svg?branch=master)](https://travis-ci.org/jvcalderon/ldap-login)
[![Coverage Status](https://coveralls.io/repos/github/jvcalderon/ldap-login/badge.svg?branch=master)](https://coveralls.io/github/jvcalderon/ldap-login?branch=master)

Provides an easy way to implement a login system based in LDAP and JWT.

## Features

- Auth manager to authenticate against LDAP server with painless configuration.
- JSON Web Tokens integration (when your user is validated in LDAP server, a token is generated).
- Default user provider: You can use a predefined user provider based in LDAP.
- Customization: You can create your own providers to retrieve user info even out of LDAP server.

## Installation

```bash
npm install ldap-login
```

### Additional configuration for development

To run the test suite:

```bash
docker-compose up -d 
npm run test
```

To compile the module

```bash
npm run build
```

## Big picture

ldap-login handle three important concepts:

### Auth manager

A class used to encapsulate the authentication logic and provide an interface to validate a user. In this library it
accomplishes this interface (I use here TS just for documentation purposes; the code in NPM is pure JS):

```typescript
interface AuthManagerInterface {
    login: (user: string, pwd: string) => Promise<boolean>
    getClient: () => Object
}
```

Of course we can create new AuthManagers, but for now, this is not the purpose of this library; it just provides 
LdapAuthManager and you can require it by doing this:

```typescript
const {LdapAuthManager} = require('ldap-login')
```

### User provider

A class used to encapsulate user retrievement and role assigment; in this library it provides this interface:

```typescript
interface UserProviderInterface {
    getUser: () => Promise<User>
}
```

Obviously User class can be different depending on your application behaviour, ldap-login provides the following User
class, but you can provide your own (later we will explain how):

```typescript
// It is created with TS, but obviusly yo can use a vanilla JS class

interface Config {
    username: string
    description?: string
    token?: string
    roles?: Array<Roles> // Roles refferes to library's Role literals (ROLE_ADMIN, ROLE_USER)
}

export class User {
    public readonly username
    public readonly description
    public readonly token
    public readonly roles

    constructor(config: Config) {
        const {username, description, token, roles} = config
        this.username = username
        this.description = description
        this.token = token
        this.roles = roles
    }
}
```

### Security class

This class receive an AuthenticatorManager and UserProvider and put them together to perform the whole login process.

```javascript
const {Security} = require('ldap-login')

const security = new Security({
  manager: ldapAuthManager, // Instange of LdapAuthManager with configuration values binded
  provider: LdapUserProvider, // The user provider class (NOT INSTANCE) 
  providerOptions: ldapUserProviderCnf // Security will instantiate the user provider class with this attributes
})
```

### A quick look to exposed modules

Ldap-login exposes the following components:

```javascript
const {
    Security,
    UserProvider,
    LdapAuthManager,
    LdapUserProvider,
    Roles,
    User,
    SecurityMiddleware
} = require('ldap-login')
```

- Security: Class to compose UserProvider and AuthManager interaction.
- UserProvider: Class to retrieve instances of User class. It must be extended to provide your own UserProvider 
implementation. You can treat it as an abstract class.
- LdapAuthManager: A class to handle login by configurated LDAP server.
- Roles: A list of roles defined by default for LdapUserProvider in this library.
- User: Default user model, you can extend it.
- SecurityMiddleware: Middlewares to use with Express.

## Usage

The following example uses a predefined UserProvider in login-ldap library. It uses two specific objects 
(LDAP's organizationalRole) to assign roles to user. These two object must exist in your LDAP's database and must be
referenced by config params 'roleUserDn' and 'roleAdminDn'. For example:

```
# LDIF with these two organizational roles as example
# jvc and admin users remains to admin role and jvc remains to user role too

dn: cn=admin,dc=genealogy,dc=my-company,dc=com
cn: admin
objectclass: organizationalRole
objectclass: top
roleoccupant: cn=jvc,ou=users,dc=my-company,dc=com
roleoccupant: cn=admin,dc=my-company,dc=com

dn: cn=user,dc=genealogy,dc=my-company,dc=com
cn: user
objectclass: organizationalRole
objectclass: top
roleoccupant: cn=jvc,ou=users,dc=my-company,dc=com
```

Read [here](./config/docker/openldap.ldif) a complete example schema.

You must use organizationalRole and roleoccupant if you want to use the predefined user provider, otherwise you can
create your own (read 'Customization' section).

### Basic login

To login by specified LDAP server you just need to do:

```javascript
// src/security.js // I will use this file name in following code snippets

// Module requirement------------------------------------------------------

const {LdapAuthManager, LdapUserProvider, Security} = require('ldap-login')

// Module configuration (change it with your server credentials)-----------

// With the following configuration a valid user could be cn=jvc,dc=my-company,dc=com
const ldapAuthManager = new LdapAuthManager({
    url: 'ldap://127.0.0.1:389',
    baseDn: 'dc=my-company,dc=com', // Base domain. Your user must be in a lower level
    idKey: 'cn' // Key user as username
})

// If you want to use the predefined user provider you should provide a configuration like this:
const ldapUserProviderCnf = {
    roleUserDn: 'cn=user,dc=genealogy,dc=my-company,dc=com', // Role object in LDAP to store basic users
    roleAdminDn: 'cn=admin,dc=genealogy,dc=my-company,dc=com', // Role object in LDAP to store admin users
    ldapAdminLogin: 'cn=admin,dc=my-company,dc=com', // I recommend a READ ONLY admin
    ldapAdminPassword: 'admin',
    jwtPrivateKey: 'XXXXXXXX', // This key will be used to generate Tokens
    jwtExpiration: 60 * 60
}

const ldap = new Security({
    manager: ldapAuthManager,
    provider: LdapUserProvider,
    providerOptions: ldapUserProviderCnf
})

module.exports = ldap
```

Now you can use this module:

```javascript
// index.js // F.Ex.
const ldap = require('./security')

ldap.login('your_user', 'your_password').then(user => {
  /* User should contain something like this:
  {
    username: 'your_user',
    description: 'A description',
    roles: ['ROLE_USER', 'ROLE_ADMIN'],
    token: "hdiIJyui7668..."
  }
  If user:pwd is not valid it will return a void object
  */
})
```

### How to use it in a Express application

```javascript
// index.js //F. Ex.

const express = require('express')
const bodyParser = require('body-parser')

const {SecurityMiddleware, Roles} = require('ldap-login')

// Use env vars could be a good idea to configure your auth provider and middleware
// In the previous example (basic login) we've harcoded the vars. You can use env vars instead.
const security = new SecurityMiddleware({jwtPrivateKey: process.env.JWT_PRIVATE_KEY})

const app = express()
app.use(bodyParser.json())

// Here we are using the configuration in previous example (basic login) ./security.js file
const {ldap} = require('.security')

// This code provides an endpoint to login by user and password
app.post('/auth', async (req, res) => {
    const {login, password} = req.body
    // Here we use the configured ldap client to get a user
    const user = await ldap.login(login, password)
    const statusCode = user.username ? 200 : 403
    res.status(statusCode).json(user)
})

app.get('/my-endpoint', middleware.hasRole(Roles.ROLE_ADMIN), (req, res) => {
    // Here your code
})
```

## Customization

In the examples above we've used the predefined application functionality; a UserProvider prepared to retrieve user data
from LDAP user and assign two different roles (ROLE_USER or ROLE_ADMIN) depending on LDAP's class organizationalRole and
its field 'roleoccupant'. Obviously, this is a very specific application behaviour, and probably you will need to use a
different strategy to get user information (for example from your database) and role assignment (ADMIN and USER could
not be enough).

### Creating your own user provider

```javascript
const {UserProvider, User} = require('ldap-login')

class MyOwnUserProvider extends UserProvider {
    constructor(config) {
        const {
            anotherCustomParam,
            authManager,
            jwtPrivateKey,
            jwtExpiration
        } = config
        super({jwtPrivateKey, jwtExpiration})
        this.anotherCustomParam = anotherCustomParam
        this.authClient = authManager.getClient()
    }

    async getUser() {
        const username = this.ldapClient.username
        // You can use username to find user data in DB (lets imagine you are using Sequelize:)
        const userData = await UserModel->findOne({where: {username}})
        const token = super.getToken(username)
        const roles = userData.roles
        return new User({username, description: userData.description, token, roles})
        
    }
}
```

Now you can use it as follow:

```javascript
const ldapAuthManager = new LdapAuthManager({
    url: 'ldap://127.0.0.1:389',
    baseDn: 'dc=my-company,dc=com',
    idKey: 'cn'
})

const MyOwnUserProviderCnf = {
    anotherCustomParam: 'Whatever you need',
    jwtPrivateKey: 'XXXXXXXX',
    jwtExpiration: 60 * 60
}

this.ldap = new Security({
    manager: ldapAuthManager,
    provider: MyOwnUserProvider,
    providerOptions: MyOwnUserProviderCnf
})
```