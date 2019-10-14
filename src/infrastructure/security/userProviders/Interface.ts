import {User} from '../../..'

export interface UserProviderInterface {
    getUser: () => Promise<User>
}
