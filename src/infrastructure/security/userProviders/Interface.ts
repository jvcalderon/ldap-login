import {User} from '../../../application/security/User'

export interface UserProviderInterface {
    getUser: () => Promise<User>
}
