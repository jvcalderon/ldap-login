import {AuthManagerInterface} from './Interface'
import * as LdapClient from 'ldapjs-client'
import * as _ from 'lodash/fp'

interface Config {
    url: string,
    baseDn: string,
    idKey?: string
}

export class Ldap implements AuthManagerInterface {
    private readonly ldap
    private readonly baseDn
    private readonly idKey
    private username

    public constructor(config: Config) {
        const {url, baseDn, idKey = 'cn'} = config
        this.ldap = new LdapClient({url})
        this.baseDn = baseDn
        this.idKey = idKey
    }

    public async login(user: string, password: string) {
        try {
            const username = `${this.idKey}=${user},${this.baseDn}`
            await this.ldap.bind(username, password)
            this.username = username
            return true
        } catch (err) {
            return _.compose(
                _.stubFalse,
                _.tap(() => console.info(`LDAP: Invalid login for user ${user}`)),
                _.tap(console.debug)
            )(err)
        }
    }

    public getClient() {
        this.ldap.__proto__.username = this.username
        return this.ldap
    }
}
