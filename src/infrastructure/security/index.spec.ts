import {LdapAuthManager, LdapUserProvider, Security} from './index'

describe('LDAP login functionality', function () {
    beforeAll(() => {
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
        this.ldap = new Security({
            manager: ldapAuthManager,
            provider: LdapUserProvider,
            providerOptions: ldapUserProviderCnf
        })
    })

    it('Should return a user object on valid login on LDAP', async () => {
        const validUser = await this.ldap.login('admin', 'admin')
        expect(validUser['username']).toBe('admin')
        expect(validUser['description']).toBe('LDAP administrator')
        expect(validUser['roles']).toEqual(['ROLE_USER', 'ROLE_ADMIN'])
        expect(validUser['token']).toBeDefined()
        const invalidUser = await this.ldap.login('adminX', 'adminX')
        expect(invalidUser).toEqual({})
    })
})
