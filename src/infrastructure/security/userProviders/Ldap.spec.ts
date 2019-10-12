import {Ldap as UserProvider} from './Ldap'
import {Ldap as AuthManager} from '../authManagers/Ldap'

global.console.debug = () => {}

test('Should return logged user information', async () => {
    const authManager = new AuthManager({url: 'ldap://127.0.0.1:389', baseDn: 'ou=users,dc=my-company,dc=com'})
    await authManager.login('jvc', 'test')
    const ldapUserProvider = new UserProvider({
        authManager,
        roleUserDn: 'cn=user,dc=genealogy,dc=my-company,dc=com',
        roleAdminDn: 'cn=admin,dc=genealogy,dc=my-company,dc=com',
        ldapAdminLogin: 'cn=admin,dc=my-company,dc=com',
        ldapAdminPassword: 'admin',
        jwtPrivateKey: 'XXXXXXXX',
        jwtExpiration: 60 * 60
    })
    const user = await ldapUserProvider.getUser()
    expect(user.username).toBe('jvc')
    expect(user.description).toBeUndefined()
    expect(user.token).toBeDefined()
    expect(user.roles).toEqual([
        'ROLE_USER',
        'ROLE_ADMIN'
    ])
})
