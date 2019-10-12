import {Roles} from './Roles'

interface Config {
    username: string
    description?: string
    token?: string
    roles?: Array<Roles>
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
