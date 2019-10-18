import * as jwt from 'jsonwebtoken'
import {User} from '../../..'

interface Config {
    jwtPrivateKey: string
    jwtExpiration: number
}

export abstract class UserProvider {
    private readonly jwtPrivateKey: string
    private readonly jwtExpiration: number

    public constructor(cnfg: Config) {
        const {jwtPrivateKey, jwtExpiration} = cnfg
        this.jwtPrivateKey = jwtPrivateKey
        this.jwtExpiration = jwtExpiration
    }

    public getToken(user: User) {
        return jwt.sign({data: user}, this.jwtPrivateKey, {expiresIn: (this.jwtExpiration) })
    }
}
