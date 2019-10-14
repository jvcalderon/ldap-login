import {UserProviderInterface} from './Interface'
import {AuthManagerInterface} from '../authManagers/Interface'
import {UserProvider} from './UserProvider'
import {Roles} from '../../..'
import {User} from '../../..'
import * as _ from 'lodash/fp'

interface Config {
    authManager: AuthManagerInterface
    roleUserDn: string,
    roleAdminDn: string,
    ldapAdminLogin: string,
    ldapAdminPassword: string,
    jwtPrivateKey: string
    jwtExpiration: number
}

export class Ldap extends UserProvider implements UserProviderInterface {
    private readonly ldapClient
    private readonly roleAdminDn: string;
    private readonly roleUserDn: string;

    public constructor(config: Config) {
        const {
            authManager,
            roleUserDn,
            roleAdminDn,
            ldapAdminLogin,
            ldapAdminPassword,
            jwtPrivateKey,
            jwtExpiration
        } = config
        super({jwtPrivateKey, jwtExpiration})
        this.ldapClient = authManager.getClient()
        this.roleUserDn = roleUserDn
        this.roleAdminDn = roleAdminDn
        this.ldapClient.bind(ldapAdminLogin, ldapAdminPassword)
    }

    public async getUser() {
        try {
            const user = await this.ldapClient.search(this.ldapClient.username, {attributes: ['cn', 'description']})
            const get = attr => _.compose(_.get(attr), _.head)(user)
            const token = super.getToken(get('cn'))
            const roles = await this.getRoles()
            return new User({username: get('cn'), description: get('description'), token, roles})
        } catch (err) {
            return this.errHandler(err)
        }
    }

    private async getRoles() {
        const get = async roleDn => this.ldapClient.search(roleDn, {
            filter: `(&(objectclass=organizationalRole)(roleoccupant=${this.ldapClient.username}))`
        })
        try {
            const roleAdmin = await get(this.roleAdminDn)
            const roleUser = await get(this.roleUserDn)
            return _.compose(
                xs => (!_.isEmpty(roleAdmin) ? [...xs, Roles.ROLE_ADMIN] : xs),
                () => (!_.isEmpty(roleUser) || !_.isEmpty(roleAdmin)) ? [Roles.ROLE_USER] : []
            )()
        } catch (err) {
            return this.errHandler(err)
        }
    }

    private errHandler (err) {
        return _.compose(
            () => ({}),
            _.tap(() => console.info(`LDAP: Cannot get user ${this.ldapClient.username}`)),
            _.tap(console.debug)
        )(err)
    }
}
