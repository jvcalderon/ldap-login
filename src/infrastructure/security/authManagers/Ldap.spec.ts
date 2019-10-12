import {Ldap} from './Ldap'

test('Should return true if login and password are valid in LDAP server', async () => {
    const ldapManager = new Ldap({url: 'ldap://127.0.0.1:389', baseDn: 'ou=users,dc=my-company,dc=com'})
    const validLogin = await ldapManager.login('jvc', 'test')
    expect(validLogin).toBe(true)
    const invalidLogin = await ldapManager.login('adminX', 'admin')
    expect(invalidLogin).toBe(false)
})
